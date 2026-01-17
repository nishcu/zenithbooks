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
  serverTimestamp,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ComplianceAssociate, AssociateAuditLog, AssociateStatus } from './types';
import { generateAssociateCode, PLATFORM_FEE_ANNUAL } from './constants';

const COLLECTIONS = {
  COMPLIANCE_ASSOCIATES: 'compliance_associates',
  ASSOCIATE_AUDIT_LOGS: 'associate_audit_logs',
};

// ==================== Associate Management ====================

/**
 * Create a new associate registration (pending approval)
 */
export async function createAssociateRegistration(
  associateData: Omit<ComplianceAssociate, 'id' | 'associateCode' | 'status' | 'tasksCompleted' | 'tasksInProgress' | 'createdAt' | 'updatedAt' | 'platformFee'>
): Promise<string> {
  // Generate associate code (will be finalized after approval)
  const tempCode = `PENDING-${Date.now()}`;
  
  // Get next associate code index
  const associatesRef = collection(db, COLLECTIONS.COMPLIANCE_ASSOCIATES);
  const allAssociates = await getDocs(query(associatesRef, orderBy('createdAt', 'desc')));
  const nextIndex = allAssociates.size + 1;
  const associateCode = generateAssociateCode(nextIndex);
  
  const associate: Omit<ComplianceAssociate, 'id'> = {
    ...associateData,
    associateCode,
    status: 'pending_approval',
    tasksCompleted: 0,
    tasksInProgress: 0,
    platformFee: {
      annualCharge: PLATFORM_FEE_ANNUAL,
      paymentStatus: 'pending',
      autoRenew: false,
    },
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

