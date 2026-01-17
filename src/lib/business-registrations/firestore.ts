/**
 * Business Registrations - Firestore Service
 * ICAI-Compliant: Platform-managed delivery
 */

import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  BusinessRegistration,
  RegistrationAuditLog,
  RegistrationType,
  RegistrationStatus,
} from './types';

const COLLECTIONS = {
  BUSINESS_REGISTRATIONS: 'business_registrations',
  REGISTRATION_AUDIT_LOGS: 'registration_audit_logs',
};

// ==================== Business Registrations ====================

/**
 * Create a new business registration request
 */
export async function createBusinessRegistration(
  registrationData: Omit<BusinessRegistration, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const registrationsRef = collection(db, COLLECTIONS.BUSINESS_REGISTRATIONS);
  
  const registrationDoc: Omit<BusinessRegistration, 'id'> = {
    ...registrationData,
    status: 'pending_documents',
    assignedToInternalTeam: true, // Always true - ICAI compliance
    platformOwned: true, // Always true - ZenithBooks as principal
    feePaid: false,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  const docRef = await addDoc(registrationsRef, registrationDoc);
  
  // Create audit log
  await createAuditLog({
    registrationId: docRef.id,
    userId: registrationData.userId,
    firmId: registrationData.firmId,
    action: 'registration_requested',
    details: { registrationType: registrationData.registrationType },
    performedBy: registrationData.createdBy,
  });
  
  return docRef.id;
}

/**
 * Get business registration by ID
 */
export async function getBusinessRegistration(
  registrationId: string
): Promise<BusinessRegistration | null> {
  const registrationRef = doc(db, COLLECTIONS.BUSINESS_REGISTRATIONS, registrationId);
  const snapshot = await getDoc(registrationRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    completedAt: data.completedAt?.toDate(),
    documents: (data.documents || []).map((doc: any) => ({
      ...doc,
      uploadedAt: doc.uploadedAt?.toDate() || new Date(),
    })),
  } as BusinessRegistration;
}

/**
 * Get all registrations for a user
 */
export async function getBusinessRegistrationsByUserId(
  userId: string
): Promise<BusinessRegistration[]> {
  const registrationsRef = collection(db, COLLECTIONS.BUSINESS_REGISTRATIONS);
  const q = query(
    registrationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
      documents: (data.documents || []).map((docItem: any) => ({
        ...docItem,
        uploadedAt: docItem.uploadedAt?.toDate() || new Date(),
      })),
    } as BusinessRegistration;
  });
}

/**
 * Get registrations by status
 */
export async function getBusinessRegistrationsByStatus(
  status: RegistrationStatus
): Promise<BusinessRegistration[]> {
  const registrationsRef = collection(db, COLLECTIONS.BUSINESS_REGISTRATIONS);
  const q = query(
    registrationsRef,
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
      documents: (data.documents || []).map((docItem: any) => ({
        ...docItem,
        uploadedAt: docItem.uploadedAt?.toDate() || new Date(),
      })),
    } as BusinessRegistration;
  });
}

/**
 * Update business registration status
 */
export async function updateBusinessRegistrationStatus(
  registrationId: string,
  status: RegistrationStatus,
  updates?: Partial<BusinessRegistration>
): Promise<void> {
  // Get current registration to check old status
  const registrationRef = doc(db, COLLECTIONS.BUSINESS_REGISTRATIONS, registrationId);
  const registrationSnap = await getDoc(registrationRef);
  const oldStatus = registrationSnap.exists() 
    ? (registrationSnap.data() as BusinessRegistration).status 
    : 'pending_documents';
  
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  
  if (status === 'completed' && !updateData.completedAt) {
    updateData.completedAt = serverTimestamp();
  }
  
  if (updates?.registrationNumber) {
    updateData.registrationNumber = updates.registrationNumber;
  }
  
  if (updates?.certificateUrl) {
    updateData.certificateUrl = updates.certificateUrl;
  }
  
  if (updates?.assignedTo) {
    updateData.assignedTo = updates.assignedTo;
    updateData.assignedToInternalTeam = true;
  }
  
  if (updates?.caReviewer) {
    updateData.caReviewer = updates.caReviewer;
  }
  
  if (updates?.sopReference) {
    updateData.sopReference = updates.sopReference;
  }
  
  if (updates?.internalNotes) {
    updateData.internalNotes = updates.internalNotes;
  }
  
  if (updates?.rejectionReason) {
    updateData.rejectionReason = updates.rejectionReason;
  }
  
  if (updates?.feePaid !== undefined) {
    updateData.feePaid = updates.feePaid;
  }
  
  if (updates?.paymentId) {
    updateData.paymentId = updates.paymentId;
  }
  
  await updateDoc(registrationRef, updateData);
  
  // Get updated registration for audit log
  const updatedSnap = await getDoc(registrationRef);
  if (updatedSnap.exists()) {
    const registrationData = updatedSnap.data() as BusinessRegistration;
    
    // Create audit log
    const actionMap: Record<RegistrationStatus, RegistrationAuditLog['action']> = {
      pending_documents: 'registration_requested',
      submitted_to_team: 'submitted_to_team',
      in_progress: 'status_updated',
      under_review: 'ca_review_assigned',
      completed: 'completed',
      rejected: 'rejected',
      on_hold: 'on_hold',
    };
    
    await createAuditLog({
      registrationId,
      userId: registrationData.userId,
      firmId: registrationData.firmId,
      action: actionMap[status] || 'status_updated',
      details: { 
        oldStatus, 
        newStatus: status, 
        registrationType: registrationData.registrationType,
        ...(updates?.registrationNumber && { registrationNumber: updates.registrationNumber }),
      },
      performedBy: 'system', // Internal team actions
    });
    
    // Trigger notification asynchronously (don't await - non-critical)
    if (oldStatus !== status) {
      import('@/lib/business-registrations/notifications').then(({ notifyRegistrationStatusChange }) => {
        notifyRegistrationStatusChange(registrationData, oldStatus, status).catch(err => {
          console.error('Notification failed:', err);
        });
      });
    }
  }
}

/**
 * Add document to registration
 */
export async function addDocumentToRegistration(
  registrationId: string,
  document: BusinessRegistration['documents'][0]
): Promise<void> {
  const registrationRef = doc(db, COLLECTIONS.BUSINESS_REGISTRATIONS, registrationId);
  const registrationSnap = await getDoc(registrationRef);
  
  if (!registrationSnap.exists()) {
    throw new Error('Registration not found');
  }
  
  const registrationData = registrationSnap.data() as BusinessRegistration;
  const documents = registrationData.documents || [];
  
  await updateDoc(registrationRef, {
    documents: [...documents, document],
    updatedAt: serverTimestamp(),
  });
  
  // Create audit log
  await createAuditLog({
    registrationId,
    userId: registrationData.userId,
    firmId: registrationData.firmId,
    action: 'documents_uploaded',
    details: { documentId: document.id, documentName: document.name },
    performedBy: document.uploadedBy,
  });
  
  // If status is pending_documents and all required docs uploaded, update status
  if (registrationData.status === 'pending_documents') {
    // This logic can be enhanced to check if all required documents are uploaded
    // For now, we'll leave it to manual update by admin
  }
}

// ==================== Audit Logs ====================

/**
 * Create audit log entry
 */
export async function createAuditLog(
  logData: Omit<RegistrationAuditLog, 'id' | 'performedAt'>
): Promise<string> {
  const logsRef = collection(db, COLLECTIONS.REGISTRATION_AUDIT_LOGS);
  const docRef = await addDoc(logsRef, {
    ...logData,
    performedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get audit logs for a registration
 */
export async function getAuditLogsByRegistration(
  registrationId: string,
  limitCount?: number
): Promise<RegistrationAuditLog[]> {
  let q = query(
    collection(db, COLLECTIONS.REGISTRATION_AUDIT_LOGS),
    where('registrationId', '==', registrationId),
    orderBy('performedAt', 'desc')
  );
  
  if (limitCount) {
    q = query(q, limit(limitCount));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      performedAt: data.performedAt?.toDate() || new Date(),
    } as RegistrationAuditLog;
  });
}

