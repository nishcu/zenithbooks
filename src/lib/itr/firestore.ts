/**
 * ITR Firestore Service Functions
 * Complete Firestore operations for ITR filing module
 */

import { 
  doc, 
  collection, 
  setDoc, 
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ITRApplication, ITRDocument, ITRCredentials, ITRDraft, ITRNotification, ITRHealthReport, FinancialYear, ITRStatus } from './types';

// Collections
const COLLECTIONS = {
  ITR_APPLICATIONS: 'itrApplications',
  ITR_DOCUMENTS: 'itrDocuments',
  ITR_CREDENTIALS: 'itrCredentials',
  ITR_DRAFTS: 'itrDrafts',
  ITR_NOTIFICATIONS: 'itrNotifications',
  ITR_HEALTH_REPORTS: 'itrHealthReports',
  CA_USERS: 'caUsers',
};

// ==================== ITR Applications ====================

export async function createITRApplication(application: Omit<ITRApplication, 'id'>): Promise<string> {
  const docRef = doc(collection(db, COLLECTIONS.ITR_APPLICATIONS));
  const applicationId = docRef.id;
  
  await setDoc(docRef, {
    ...application,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return applicationId;
}

export async function getITRApplication(applicationId: string): Promise<ITRApplication | null> {
  const docRef = doc(db, COLLECTIONS.ITR_APPLICATIONS, applicationId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    assignedAt: data.assignedAt?.toDate(),
    completedAt: data.completedAt?.toDate(),
    filedAt: data.filedAt?.toDate(),
    eVerifiedAt: data.eVerifiedAt?.toDate(),
    refundInfo: data.refundInfo ? {
      ...data.refundInfo,
      creditedAt: data.refundInfo.creditedAt?.toDate(),
      predictedDate: data.refundInfo.predictedDate?.toDate(),
    } : undefined,
  } as ITRApplication;
}

export async function updateITRApplication(
  applicationId: string,
  updates: Partial<ITRApplication>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ITR_APPLICATIONS, applicationId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function updateITRApplicationStatus(
  applicationId: string,
  status: ITRStatus
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ITR_APPLICATIONS, applicationId);
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  
  // Set status-specific timestamps
  if (status === 'FILED') {
    updateData.filedAt = serverTimestamp();
  } else if (status === 'E_VERIFIED') {
    updateData.eVerifiedAt = serverTimestamp();
  } else if (status === 'COMPLETED') {
    updateData.completedAt = serverTimestamp();
  }
  
  await updateDoc(docRef, updateData);
}

export async function getAllITRApplications(): Promise<ITRApplication[]> {
  const q = query(
    collection(db, COLLECTIONS.ITR_APPLICATIONS),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as ITRApplication[];
}

export async function getAssignedApplications(assignedTo: string): Promise<ITRApplication[]> {
  const q = query(
    collection(db, COLLECTIONS.ITR_APPLICATIONS),
    where('assignedTo', '==', assignedTo),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as ITRApplication[];
}

export async function getUnassignedApplications(): Promise<ITRApplication[]> {
  const q = query(
    collection(db, COLLECTIONS.ITR_APPLICATIONS),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  const allApps = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as ITRApplication[];
  
  // Filter for unassigned applications
  return allApps.filter(app => !app.assignedTo);
}

export async function getUserITRApplications(userId: string): Promise<ITRApplication[]> {
  const q = query(
    collection(db, COLLECTIONS.ITR_APPLICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      assignedAt: data.assignedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      filedAt: data.filedAt?.toDate(),
      eVerifiedAt: data.eVerifiedAt?.toDate(),
      refundInfo: data.refundInfo ? {
        ...data.refundInfo,
        creditedAt: data.refundInfo.creditedAt?.toDate(),
        predictedDate: data.refundInfo.predictedDate?.toDate(),
      } : undefined,
    };
  }) as ITRApplication[];
}

export async function getAllITRApplicationsForAdmin(filters?: {
  status?: ITRStatus;
  financialYear?: string;
  assignedTo?: string | null;
  searchTerm?: string;
}): Promise<ITRApplication[]> {
  let q = query(
    collection(db, COLLECTIONS.ITR_APPLICATIONS),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  let apps = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as ITRApplication[];
  
  // Apply filters
  if (filters) {
    if (filters.status) {
      apps = apps.filter(app => app.status === filters.status);
    }
    if (filters.financialYear) {
      apps = apps.filter(app => app.financialYear === filters.financialYear);
    }
    if (filters.assignedTo !== undefined) {
      if (filters.assignedTo === null) {
        apps = apps.filter(app => !app.assignedTo);
      } else {
        apps = apps.filter(app => app.assignedTo === filters.assignedTo);
      }
    }
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      apps = apps.filter(app => 
        app.pan?.toLowerCase().includes(searchLower) ||
        app.financialYear?.toLowerCase().includes(searchLower)
      );
    }
  }
  
  return apps;
}

export async function assignITRApplication(
  applicationId: string,
  assignedTo: string,
  assignedBy: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ITR_APPLICATIONS, applicationId);
  await updateDoc(docRef, {
    assignedTo,
    assignedBy,
    assignedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateITRFilingInfo(
  applicationId: string,
  filingInfo: Partial<ITRApplication['filingInfo']>,
  status?: ITRStatus
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ITR_APPLICATIONS, applicationId);
  
  const updateData: any = {
    updatedAt: serverTimestamp(),
    'filingInfo': filingInfo,
  };

  if (status) {
    updateData.status = status;
    // Set timestamp based on status
    if (status === 'FILED' && !updateData.filedAt) {
      updateData.filedAt = serverTimestamp();
    } else if (status === 'E_VERIFIED' && !updateData.eVerifiedAt) {
      updateData.eVerifiedAt = serverTimestamp();
    } else if (status === 'COMPLETED' && !updateData.completedAt) {
      updateData.completedAt = serverTimestamp();
    }
  }

  await updateDoc(docRef, updateData);
}

// ==================== ITR Documents ====================

export async function createITRDocument(document: Omit<ITRDocument, 'id'>): Promise<string> {
  const docRef = doc(collection(db, COLLECTIONS.ITR_DOCUMENTS));
  const documentId = docRef.id;
  
  const itrDocument: ITRDocument = {
    id: documentId,
    ...document,
    uploadedAt: document.uploadedAt || new Date(),
  };
  
  await setDoc(docRef, {
    ...document,
    uploadedAt: serverTimestamp(),
  });
  
  // Auto-save to Document Vault (Phase 7)
  try {
    const { syncITRDocumentToVault } = await import('./vault-integration');
    const application = document.applicationId ? await getITRApplication(document.applicationId) : null;
    if (application) {
      await syncITRDocumentToVault(itrDocument, document.userId);
    }
  } catch (error) {
    console.error('Error saving ITR document to vault:', error);
    // Don't fail the document creation if vault save fails
  }
  
  return documentId;
}

export async function getApplicationDocuments(applicationId: string): Promise<ITRDocument[]> {
  const q = query(
    collection(db, COLLECTIONS.ITR_DOCUMENTS),
    where('applicationId', '==', applicationId),
    orderBy('uploadedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
  })) as ITRDocument[];
}

// ==================== ITR Credentials ====================

export async function createITRCredentials(
  applicationId: string,
  userId: string,
  encryptedUsername: string,
  encryptedPassword: string
): Promise<string> {
  const docRef = doc(collection(db, COLLECTIONS.ITR_CREDENTIALS));
  const credentialsId = docRef.id;
  
  const credentials: Omit<ITRCredentials, 'id'> = {
    applicationId,
    userId,
    encryptedUsername,
    encryptedPassword,
    accessLog: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(docRef, {
    ...credentials,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return credentialsId;
}

export async function getITRCredentials(applicationId: string): Promise<ITRCredentials | null> {
  const q = query(
    collection(db, COLLECTIONS.ITR_CREDENTIALS),
    where('applicationId', '==', applicationId),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    lastAccessedAt: data.lastAccessedAt?.toDate(),
  } as ITRCredentials;
}

export async function updateITRCredentials(
  credentialsId: string,
  updates: Partial<ITRCredentials>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ITR_CREDENTIALS, credentialsId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function logCredentialAccess(
  credentialsId: string,
  accessedBy: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ITR_CREDENTIALS, credentialsId);
  const creds = await getDoc(docRef);
  
  if (!creds.exists()) {
    throw new Error('Credentials not found');
  }
  
  const data = creds.data();
  const accessLog = data.accessLog || [];
  
  accessLog.push({
    accessedBy,
    accessedAt: serverTimestamp(),
    ipAddress: null, // Can be added if needed
  });
  
  await updateDoc(docRef, {
    accessLog,
    lastAccessedAt: serverTimestamp(),
    lastAccessedBy: accessedBy,
  });
}

// ==================== ITR Drafts ====================

export async function createITRDraft(draft: Omit<ITRDraft, 'id'>): Promise<string> {
  const docRef = doc(collection(db, COLLECTIONS.ITR_DRAFTS));
  const draftId = docRef.id;
  
  await setDoc(docRef, {
    ...draft,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return draftId;
}

export async function getITRDraft(applicationId: string): Promise<ITRDraft | null> {
  const q = query(
    collection(db, COLLECTIONS.ITR_DRAFTS),
    where('applicationId', '==', applicationId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as ITRDraft;
}

export async function updateITRDraft(
  draftId: string,
  updates: Partial<ITRDraft>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ITR_DRAFTS, draftId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ==================== ITR Notifications ====================

export async function createITRNotification(notification: Omit<ITRNotification, 'id'>): Promise<string> {
  const docRef = doc(collection(db, COLLECTIONS.ITR_NOTIFICATIONS));
  const notificationId = docRef.id;
  
  await setDoc(docRef, {
    ...notification,
    createdAt: serverTimestamp(),
  });
  
  return notificationId;
}

export async function getUserNotifications(userId: string): Promise<ITRNotification[]> {
  const q = query(
    collection(db, COLLECTIONS.ITR_NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    readAt: doc.data().readAt?.toDate(),
  })) as ITRNotification[];
}

// ==================== Health Reports (Phase 8) ====================

export async function createITRHealthReport(report: Omit<ITRHealthReport, 'id'>): Promise<string> {
  const docRef = doc(collection(db, COLLECTIONS.ITR_HEALTH_REPORTS));
  const reportId = docRef.id;
  
  await setDoc(docRef, {
    ...report,
    generatedAt: serverTimestamp(),
  });
  
  return reportId;
}

export async function getUserHealthReports(userId: string): Promise<ITRHealthReport[]> {
  const q = query(
    collection(db, COLLECTIONS.ITR_HEALTH_REPORTS),
    where('userId', '==', userId),
    orderBy('generatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    generatedAt: doc.data().generatedAt?.toDate() || new Date(),
  })) as ITRHealthReport[];
}

export async function getHealthReportByFinancialYear(
  userId: string,
  financialYear: FinancialYear
): Promise<ITRHealthReport | null> {
  const q = query(
    collection(db, COLLECTIONS.ITR_HEALTH_REPORTS),
    where('userId', '==', userId),
    where('financialYear', '==', financialYear),
    orderBy('generatedAt', 'desc'),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    generatedAt: doc.data().generatedAt?.toDate() || new Date(),
  } as ITRHealthReport;
}

// ==================== Refund Updates (Phase 8) ====================

export async function updateRefundInfo(
  applicationId: string,
  refundInfo: Partial<ITRApplication['refundInfo']>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ITR_APPLICATIONS, applicationId);
  
  await updateDoc(docRef, {
    'refundInfo': refundInfo,
    updatedAt: serverTimestamp(),
  });
}

// ==================== CA User Management ====================

/**
 * Check if a user is a CA team member or admin
 */
export async function isCAUser(userId: string): Promise<boolean> {
  try {
    const caUserRef = doc(db, COLLECTIONS.CA_USERS, userId);
    const caUserDoc = await getDoc(caUserRef);
    
    if (!caUserDoc.exists()) {
      return false;
    }
    
    const data = caUserDoc.data();
    // Check if user is active and has CA_TEAM or ADMIN role
    return data.active === true && (data.role === 'CA_TEAM' || data.role === 'ADMIN');
  } catch (error) {
    console.error('Error checking CA user status:', error);
    return false;
  }
}
