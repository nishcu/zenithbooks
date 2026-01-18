/**
 * Document Vault Compliance Integration
 * Links documents to compliance tasks and manages compliance metadata
 */

import {
  doc,
  updateDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ComplianceDocumentMetadata, ComplianceType } from '../types';
import { linkDocumentToTask } from '../orchestrator/task-orchestrator';
import { createComplianceAuditEntry } from '../audit/audit-service';

const COLLECTIONS = {
  VAULT_DOCUMENTS: 'vaultDocuments',
};

/**
 * Update document with compliance metadata
 */
export async function updateDocumentComplianceMetadata(
  documentId: string,
  metadata: Partial<ComplianceDocumentMetadata>,
  userId: string,
  firmId: string
): Promise<void> {
  const documentRef = doc(db, COLLECTIONS.VAULT_DOCUMENTS, documentId);
  const documentDoc = await getDoc(documentRef);

  if (!documentDoc.exists()) {
    throw new Error('Document not found');
  }

  const currentData = documentDoc.data();
  const currentMetadata = currentData.metadata || {};

  // Merge compliance metadata
  const updatedMetadata = {
    ...currentMetadata,
    ...metadata,
  };

  // Update document
  await updateDoc(documentRef, {
    metadata: updatedMetadata,
    lastUpdated: serverTimestamp(),
  });

  // If document is linked to a task, update task as well
  if (metadata.linkedTaskId) {
    await linkDocumentToTask(
      metadata.linkedTaskId,
      documentId,
      metadata.complianceType || 'gst',
      userId,
      firmId
    );
  }

  // Create audit log
  await createComplianceAuditEntry({
    userId,
    firmId,
    action: 'document_reviewed',
    entityType: 'document',
    entityId: documentId,
    details: {
      metadata,
      previousFilingStatus: currentMetadata.filingStatus,
      newFilingStatus: metadata.filingStatus,
    },
    performedBy: userId,
  });
}

/**
 * Link document to compliance task
 */
export async function linkDocumentToComplianceTask(
  documentId: string,
  taskId: string,
  complianceType: ComplianceType,
  userId: string,
  firmId: string
): Promise<void> {
  await updateDocumentComplianceMetadata(
    documentId,
    {
      linkedTaskId: taskId,
      complianceType,
    },
    userId,
    firmId
  );
}

/**
 * Update document filing status
 */
export async function updateDocumentFilingStatus(
  documentId: string,
  filingStatus: ComplianceDocumentMetadata['filingStatus'],
  filingDetails?: {
    filingReference?: string;
    filingPeriod?: string;
    filingYear?: string;
    portalSubmissionId?: string;
  },
  userId?: string,
  firmId?: string
): Promise<void> {
  const documentRef = doc(db, COLLECTIONS.VAULT_DOCUMENTS, documentId);
  const documentDoc = await getDoc(documentRef);

  if (!documentDoc.exists()) {
    throw new Error('Document not found');
  }

  const currentData = documentDoc.data();
  const userIdValue = userId || currentData.userId;
  const firmIdValue = firmId || currentData.firmId;
  const currentMetadata = currentData.metadata || {};

  const updatedMetadata = {
    ...currentMetadata,
    filingStatus,
    ...(filingDetails && {
      filingReference: filingDetails.filingReference,
      filingPeriod: filingDetails.filingPeriod,
      filingYear: filingDetails.filingYear,
      portalSubmissionId: filingDetails.portalSubmissionId,
    }),
    ...(filingStatus === 'filed' && {
      lastReviewedAt: serverTimestamp(),
    }),
  };

  await updateDoc(documentRef, {
    metadata: updatedMetadata,
    lastUpdated: serverTimestamp(),
  });

  // Create audit log if userId provided
  if (userIdValue && firmIdValue) {
    await createComplianceAuditEntry({
      userId: userIdValue,
      firmId: firmIdValue,
      action: 'document_reviewed',
      entityType: 'document',
      entityId: documentId,
      details: {
        filingStatus,
        filingDetails,
      },
      performedBy: userIdValue,
    });
  }
}

/**
 * Get documents linked to a compliance task
 */
export async function getDocumentsByTaskId(taskId: string): Promise<any[]> {
  const documentsQuery = query(
    collection(db, COLLECTIONS.VAULT_DOCUMENTS),
    where('metadata.linkedTaskId', '==', taskId)
  );

  const documentsSnapshot = await getDocs(documentsQuery);
  
  return documentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get documents by compliance type
 */
export async function getDocumentsByComplianceType(
  userId: string,
  complianceType: ComplianceType
): Promise<any[]> {
  const documentsQuery = query(
    collection(db, COLLECTIONS.VAULT_DOCUMENTS),
    where('userId', '==', userId),
    where('metadata.complianceType', '==', complianceType)
  );

  const documentsSnapshot = await getDocs(documentsQuery);
  
  return documentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get documents by filing status
 */
export async function getDocumentsByFilingStatus(
  userId: string,
  filingStatus: ComplianceDocumentMetadata['filingStatus']
): Promise<any[]> {
  const documentsQuery = query(
    collection(db, COLLECTIONS.VAULT_DOCUMENTS),
    where('userId', '==', userId),
    where('metadata.filingStatus', '==', filingStatus)
  );

  const documentsSnapshot = await getDocs(documentsQuery);
  
  return documentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

