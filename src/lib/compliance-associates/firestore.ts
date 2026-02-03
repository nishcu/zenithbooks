/**
 * Compliance Associates - Firestore Service
 * ICAI-Compliant: Associates are internal resources
 */

import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ComplianceAssociate, AssociateAuditLog, AssociateStatus, CorporateMitraAuditLog, CorporateMitraLevel, CorporateMitraPerformance, CorporateMitraCertifications } from './types';
import { generateAssociateCode, PLATFORM_FEE_ANNUAL, TASK_CERTIFICATION_MAP } from './constants';

const COLLECTIONS = {
  COMPLIANCE_ASSOCIATES: 'compliance_associates',
  ASSOCIATE_AUDIT_LOGS: 'associate_audit_logs',
  CORPORATE_MITRA_AUDIT_LOGS: 'corporate_mitra_audit_logs',
};

/** Default performance for new/migrated associates */
const DEFAULT_PERFORMANCE: CorporateMitraPerformance = {
  score: 50,
  accuracyRate: 0,
  avgTurnaroundHours: 0,
  reworkCount: 0,
  lastEvaluatedAt: new Date() as any,
};
/** Default certifications */
const DEFAULT_CERTIFICATIONS: CorporateMitraCertifications = {
  gstBasics: false,
  msmeCompliance: false,
  payrollBasics: false,
  mcaBasics: false,
};

// ==================== Associate Management ====================

/**
 * Create a new associate registration (pending approval)
 */
export async function createAssociateRegistration(
  associateData: Omit<ComplianceAssociate, 'id' | 'associateCode' | 'status' | 'tasksCompleted' | 'tasksInProgress' | 'createdAt' | 'updatedAt' | 'platformFee'>
): Promise<string> {
  // Generate associate code using timestamp to avoid querying all documents
  // The code will be unique and can be reassigned during approval if needed
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000);
  const associateCode = `AS-${timestamp.toString().slice(-6)}-${String(randomSuffix).padStart(3, '0')}`;
  
  // Remove undefined values (Firestore doesn't allow undefined)
  const cleanAssociateData: any = { ...associateData };
  Object.keys(cleanAssociateData).forEach(key => {
    if (cleanAssociateData[key] === undefined) {
      delete cleanAssociateData[key];
    }
  });
  
  const associate: Omit<ComplianceAssociate, 'id'> = {
    ...cleanAssociateData,
    associateCode,
    status: 'pending_approval',
    tasksCompleted: 0,
    tasksInProgress: 0,
    platformFee: {
      annualCharge: PLATFORM_FEE_ANNUAL,
      paymentStatus: 'pending',
      autoRenew: false,
    },
    level: 'CM-L1',
    performance: DEFAULT_PERFORMANCE,
    certifications: DEFAULT_CERTIFICATIONS,
    eligibleTaskTypes: [],
    riskFlag: 'low',
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  // Check if email already exists
  const emailQuery = query(
    collection(db, COLLECTIONS.COMPLIANCE_ASSOCIATES),
    where('email', '==', associateData.email)
  );
  const emailSnapshot = await getDocs(emailQuery);
  if (!emailSnapshot.empty) {
    throw new Error('An associate with this email already exists');
  }
  
  const docRef = await addDoc(collection(db, COLLECTIONS.COMPLIANCE_ASSOCIATES), associate);
  
  // Create audit log
  await createAssociateAuditLog({
    associateId: docRef.id,
    action: 'registered',
    details: { email: associateData.email, name: associateData.name },
    performedBy: 'system',
  });
  
  return docRef.id;
}

/**
 * Update associate platform fee payment status
 */
export async function updateAssociatePaymentStatus(
  associateId: string,
  paymentId: string,
  orderId: string
): Promise<void> {
  const associateRef = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  
  // Calculate expiry date (1 year from now)
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  
  await updateDoc(associateRef, {
    'platformFee.paymentStatus': 'paid',
    'platformFee.paymentId': paymentId,
    'platformFee.orderId': orderId,
    'platformFee.paidAt': serverTimestamp(),
    'platformFee.expiresAt': Timestamp.fromDate(expiresAt),
    updatedAt: serverTimestamp(),
  });
  
  // Create audit log
  await createAssociateAuditLog({
    associateId,
    action: 'payment_received',
    details: { paymentId, orderId, amount: PLATFORM_FEE_ANNUAL },
    performedBy: 'system',
  });
}

/**
 * Approve associate registration
 */
export async function approveAssociate(
  associateId: string,
  approvedBy: string
): Promise<void> {
  const associateRef = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  const associateSnap = await getDoc(associateRef);
  
  if (!associateSnap.exists()) {
    throw new Error('Associate not found');
  }
  
  const associateData = associateSnap.data() as ComplianceAssociate;
  
  if (associateData.platformFee.paymentStatus !== 'paid') {
    throw new Error('Cannot approve associate without payment');
  }
  
  await updateDoc(associateRef, {
    status: 'active',
    approvedBy,
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Create audit log
  await createAssociateAuditLog({
    associateId,
    action: 'approved',
    details: { approvedBy },
    performedBy: approvedBy,
  });
}

/**
 * Reject associate registration
 */
export async function rejectAssociate(
  associateId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  const associateRef = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  
  await updateDoc(associateRef, {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
  });
  
  // Create audit log
  await createAssociateAuditLog({
    associateId,
    action: 'rejected',
    details: { rejectedBy, reason },
    performedBy: rejectedBy,
  });
}

/**
 * Update associate status
 */
export async function updateAssociateStatus(
  associateId: string,
  status: AssociateStatus,
  updatedBy: string,
  reason?: string
): Promise<void> {
  const associateRef = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  
  if (reason) {
    updateData.rejectionReason = reason;
  }
  
  if (status === 'active' && (await getDoc(associateRef)).data()?.status === 'suspended') {
    updateData.reactivatedAt = serverTimestamp();
  }
  
  await updateDoc(associateRef, updateData);
  
  // Create audit log
  const action = status === 'suspended' ? 'suspended' : status === 'active' ? 'reactivated' : 'status_updated';
  await createAssociateAuditLog({
    associateId,
    action: action as any,
    details: { status, updatedBy, reason },
    performedBy: updatedBy,
  });
}

/**
 * Get associate by ID
 */
export async function getAssociateById(associateId: string): Promise<ComplianceAssociate | null> {
  const associateRef = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  const associateSnap = await getDoc(associateRef);
  
  if (!associateSnap.exists()) {
    return null;
  }
  
  return { id: associateSnap.id, ...associateSnap.data() } as ComplianceAssociate;
}

/**
 * Get associate by email
 */
export async function getAssociateByEmail(email: string): Promise<ComplianceAssociate | null> {
  const associatesRef = collection(db, COLLECTIONS.COMPLIANCE_ASSOCIATES);
  const emailQuery = query(associatesRef, where('email', '==', email));
  const snapshot = await getDocs(emailQuery);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as ComplianceAssociate;
}

/**
 * Get all associates (for admin)
 */
export async function getAllAssociates(status?: AssociateStatus): Promise<ComplianceAssociate[]> {
  const associatesRef = collection(db, COLLECTIONS.COMPLIANCE_ASSOCIATES);
  let q = query(associatesRef, orderBy('createdAt', 'desc'));
  
  if (status) {
    q = query(associatesRef, where('status', '==', status), orderBy('createdAt', 'desc'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ComplianceAssociate));
}

/**
 * Get active associates only
 */
export async function getActiveAssociates(): Promise<ComplianceAssociate[]> {
  return getAllAssociates('active');
}

/**
 * Get associate by code
 */
export async function getAssociateByCode(associateCode: string): Promise<ComplianceAssociate | null> {
  const associatesRef = collection(db, COLLECTIONS.COMPLIANCE_ASSOCIATES);
  const codeQuery = query(associatesRef, where('associateCode', '==', associateCode));
  const snapshot = await getDocs(codeQuery);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as ComplianceAssociate;
}

// ==================== Audit Logs ====================

/**
 * Create associate audit log
 */
export async function createAssociateAuditLog(
  logData: Omit<AssociateAuditLog, 'id' | 'performedAt'>
): Promise<string> {
  const logsRef = collection(db, COLLECTIONS.ASSOCIATE_AUDIT_LOGS);
  const log = {
    ...logData,
    performedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(logsRef, log);
  return docRef.id;
}

/**
 * Get audit logs for an associate
 */
export async function getAssociateAuditLogs(associateId: string): Promise<AssociateAuditLog[]> {
  const logsRef = collection(db, COLLECTIONS.ASSOCIATE_AUDIT_LOGS);
  const logsQuery = query(
    logsRef,
    where('associateId', '==', associateId),
    orderBy('performedAt', 'desc')
  );
  
  const snapshot = await getDocs(logsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssociateAuditLog));
}

// ==================== Corporate Mitra Audit Logs ====================

/**
 * Create Corporate Mitra audit log (level_up, score_update, certification_passed, task_reviewed)
 */
export async function createCorporateMitraAuditLog(
  logData: Omit<CorporateMitraAuditLog, 'id' | 'createdAt'>
): Promise<string> {
  const logsRef = collection(db, COLLECTIONS.CORPORATE_MITRA_AUDIT_LOGS);
  const docRef = await addDoc(logsRef, {
    ...logData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get Corporate Mitra audit logs for an associate
 */
export async function getCorporateMitraAuditLogs(associateId: string, limitCount = 50): Promise<CorporateMitraAuditLog[]> {
  const logsRef = collection(db, COLLECTIONS.CORPORATE_MITRA_AUDIT_LOGS);
  const q = query(
    logsRef,
    where('associateId', '==', associateId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const d = doc.data();
    return { id: doc.id, ...d, createdAt: d.createdAt?.toDate?.() || new Date() } as CorporateMitraAuditLog;
  });
}

// ==================== Corporate Mitra Helpers ====================

/** Ensure associate has default level/performance/certifications (for backward compat) */
export function withCorporateMitraDefaults(associate: ComplianceAssociate): ComplianceAssociate {
  return {
    ...associate,
    level: associate.level ?? 'CM-L1',
    performance: associate.performance ?? DEFAULT_PERFORMANCE,
    certifications: associate.certifications ?? DEFAULT_CERTIFICATIONS,
    eligibleTaskTypes: associate.eligibleTaskTypes ?? [],
    riskFlag: associate.riskFlag ?? 'low',
  };
}

/**
 * Get associates eligible for a task (by certification gating). Returns only active associates with required certification.
 */
export async function getEligibleAssociatesForTask(taskId: string): Promise<ComplianceAssociate[]> {
  const certKey = TASK_CERTIFICATION_MAP[taskId] ?? TASK_CERTIFICATION_MAP[taskId.split('_')[0]];
  const associates = await getAllAssociates('active');
  return associates
    .map(withCorporateMitraDefaults)
    .filter(a => {
      if (!certKey) return true;
      return (a.certifications as CorporateMitraCertifications)?.[certKey] === true;
    });
}

/**
 * Update associate performance and risk flag
 */
export async function updateAssociatePerformance(
  associateId: string,
  performance: Partial<CorporateMitraPerformance>
): Promise<void> {
  const ref = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Associate not found');
  const existing = snap.data() as ComplianceAssociate;
  const currentPerf = (existing.performance ?? DEFAULT_PERFORMANCE) as CorporateMitraPerformance;
  const merged = { ...currentPerf, ...performance, lastEvaluatedAt: serverTimestamp() };
  await updateDoc(ref, { performance: merged, updatedAt: serverTimestamp() });
}

/**
 * Update associate level (admin or auto)
 */
export async function updateAssociateLevel(
  associateId: string,
  level: CorporateMitraLevel,
  performedBy: string
): Promise<void> {
  const ref = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Associate not found');
  const associate = { id: snap.id, ...snap.data() } as ComplianceAssociate;
  await updateDoc(ref, { level, updatedAt: serverTimestamp() });
  await createCorporateMitraAuditLog({
    associateId,
    associateCode: associate.associateCode,
    action: 'level_up',
    meta: { previousLevel: associate.level, newLevel: level, performedBy },
  });
}

/**
 * Update associate certifications
 */
export async function updateAssociateCertifications(
  associateId: string,
  certifications: Partial<CorporateMitraCertifications>
): Promise<void> {
  const ref = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Associate not found');
  const data = snap.data() as ComplianceAssociate;
  const current = (data.certifications ?? DEFAULT_CERTIFICATIONS) as CorporateMitraCertifications;
  const next = { ...current, ...certifications };
  await updateDoc(ref, { certifications: next, updatedAt: serverTimestamp() });
  for (const [key, value] of Object.entries(certifications)) {
    if (value === true)
      await createCorporateMitraAuditLog({
        associateId,
        associateCode: data.associateCode,
        action: 'certification_passed',
        meta: { certification: key },
      });
  }
}

