/**
 * Compliance Audit Service
 * Creates immutable audit logs for all compliance actions
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ComplianceAuditEntry } from '../types';

const COLLECTIONS = {
  COMPLIANCE_AUDIT_LOGS: 'compliance_audit_logs',
};

/**
 * Create an audit log entry
 */
export async function createComplianceAuditEntry(
  auditData: Omit<ComplianceAuditEntry, 'id' | 'performedAt' | 'immutable'>
): Promise<string> {
  const auditRef = await addDoc(collection(db, COLLECTIONS.COMPLIANCE_AUDIT_LOGS), {
    ...auditData,
    immutable: true,
    performedAt: serverTimestamp(),
  });

  return auditRef.id;
}

/**
 * Get audit logs for a user/firm
 */
export async function getAuditLogs(
  userId: string,
  firmId?: string,
  options?: {
    entityType?: ComplianceAuditEntry['entityType'];
    entityId?: string;
    action?: ComplianceAuditEntry['action'];
    limitCount?: number;
  }
): Promise<ComplianceAuditEntry[]> {
  let auditQuery = query(
    collection(db, COLLECTIONS.COMPLIANCE_AUDIT_LOGS),
    where('userId', '==', userId),
    orderBy('performedAt', 'desc')
  );

  if (firmId) {
    auditQuery = query(auditQuery, where('firmId', '==', firmId));
  }

  if (options?.entityType) {
    auditQuery = query(auditQuery, where('entityType', '==', options.entityType));
  }

  if (options?.entityId) {
    auditQuery = query(auditQuery, where('entityId', '==', options.entityId));
  }

  if (options?.action) {
    auditQuery = query(auditQuery, where('action', '==', options.action));
  }

  if (options?.limitCount) {
    auditQuery = query(auditQuery, limit(options.limitCount));
  }

  const auditSnapshot = await getDocs(auditQuery);
  
  return auditSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as ComplianceAuditEntry));
}

/**
 * Get audit trail for a specific entity
 */
export async function getAuditTrail(
  entityType: ComplianceAuditEntry['entityType'],
  entityId: string
): Promise<ComplianceAuditEntry[]> {
  return getAuditLogs('', undefined, {
    entityType,
    entityId,
  });
}

