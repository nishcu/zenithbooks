/**
 * Compliance Risk Engine
 * Detects mismatches, penalties, and compliance risks
 */

import {
  doc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  ComplianceRisk,
  ComplianceTaskInstance,
} from '../types';
import { createComplianceAuditEntry } from '../audit/audit-service';

const COLLECTIONS = {
  COMPLIANCE_RISKS: 'compliance_risks',
  COMPLIANCE_TASKS: 'compliance_task_instances',
};

/**
 * Detect GSTR-1 vs GSTR-3B mismatch
 */
export async function detectGSTRMismatch(
  userId: string,
  firmId: string,
  gstr1Data: Record<string, any>,
  gstr3bData: Record<string, any>
): Promise<string | null> {
  const gstr1Turnover = gstr1Data.turnover || 0;
  const gstr3bTurnover = gstr3bData.turnover || 0;
  const variance = Math.abs(gstr1Turnover - gstr3bTurnover);
  const variancePercent = gstr1Turnover > 0 ? (variance / gstr1Turnover) * 100 : 0;

  // Threshold: 5% variance
  if (variancePercent > 5) {
    const riskId = await createRisk({
      userId,
      firmId,
      riskType: 'gstr_mismatch',
      severity: variancePercent > 10 ? 'high' : 'medium',
      description: `GSTR-1 and GSTR-3B turnover mismatch detected. Variance: ₹${variance.toLocaleString()} (${variancePercent.toFixed(2)}%)`,
      riskData: {
        gstr1Turnover,
        gstr3bTurnover,
        variance,
        variancePercent,
      },
      recommendedActions: [
        {
          action: 'Review and reconcile GSTR-1 and GSTR-3B data',
          priority: 'high',
        },
        {
          action: 'File revised returns if needed',
          priority: 'medium',
          estimatedPenalty: 200,
        },
      ],
    });

    return riskId;
  }

  return null;
}

/**
 * Detect ITC shortfall
 */
export async function detectITCShortfall(
  userId: string,
  firmId: string,
  claimedITC: number,
  availableITC: number
): Promise<string | null> {
  const shortfall = availableITC - claimedITC;

  if (shortfall > 0) {
    const shortfallPercent = availableITC > 0 ? (shortfall / availableITC) * 100 : 0;

    const riskId = await createRisk({
      userId,
      firmId,
      riskType: 'itc_shortfall',
      severity: shortfallPercent > 10 ? 'high' : 'medium',
      description: `ITC shortfall detected. Available: ₹${availableITC.toLocaleString()}, Claimed: ₹${claimedITC.toLocaleString()}, Shortfall: ₹${shortfall.toLocaleString()}`,
      riskData: {
        claimedITC,
        availableITC,
        shortfall,
        shortfallPercent,
      },
      recommendedActions: [
        {
          action: 'Review vendor invoices and GSTR-2A data',
          priority: 'high',
        },
        {
          action: 'Claim eligible ITC in next return',
          priority: 'medium',
        },
      ],
    });

    return riskId;
  }

  return null;
}

/**
 * Detect delayed filings
 */
export async function detectDelayedFilings(userId: string, firmId: string): Promise<string[]> {
  const now = new Date();
  const overdueTasksQuery = query(
    collection(db, COLLECTIONS.COMPLIANCE_TASKS),
    where('userId', '==', userId),
    where('status', 'in', ['pending', 'in_progress']),
    where('dueDate', '<', now),
    orderBy('dueDate', 'asc')
  );

  const overdueTasks = await getDocs(overdueTasksQuery);
  const riskIds: string[] = [];

  for (const taskDoc of overdueTasks.docs) {
    const task = taskDoc.data() as ComplianceTaskInstance;
    const daysOverdue = Math.floor((now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24));

    const riskId = await createRisk({
      userId,
      firmId,
      riskType: 'delayed_filing',
      severity: daysOverdue > 30 ? 'critical' : daysOverdue > 15 ? 'high' : 'medium',
      description: `${task.taskName} is overdue by ${daysOverdue} day(s)`,
      relatedTaskId: task.id,
      relatedComplianceType: task.complianceType,
      riskData: {
        taskId: task.id,
        taskName: task.taskName,
        dueDate: task.dueDate,
        daysOverdue,
      },
      recommendedActions: [
        {
          action: `File ${task.taskName} immediately`,
          priority: 'high',
          estimatedPenalty: daysOverdue * 50, // Example penalty calculation
        },
      ],
    });

    riskIds.push(riskId);
  }

  return riskIds;
}

/**
 * Detect missing documents
 */
export async function detectMissingDocuments(
  userId: string,
  firmId: string,
  taskId: string
): Promise<string | null> {
  const taskDoc = await getDocs(query(
    collection(db, COLLECTIONS.COMPLIANCE_TASKS),
    where('__name__', '==', taskId)
  ));

  if (!taskDoc.empty) {
    const task = taskDoc.docs[0].data() as ComplianceTaskInstance;
    const missingDocs = task.requiredDocuments.filter(doc => !doc.uploaded && doc.mandatory);

    if (missingDocs.length > 0) {
      const riskId = await createRisk({
        userId,
        firmId,
        riskType: 'missing_document',
        severity: 'medium',
        description: `Missing ${missingDocs.length} required document(s) for ${task.taskName}`,
        relatedTaskId: task.id,
        riskData: {
          taskId: task.id,
          taskName: task.taskName,
          missingDocuments: missingDocs.map(doc => doc.documentType),
        },
        recommendedActions: [
          {
            action: 'Upload required documents before due date',
            priority: 'high',
          },
        ],
      });

      return riskId;
    }
  }

  return null;
}

/**
 * Create a risk record
 */
async function createRisk(
  riskData: Omit<ComplianceRisk, 'id' | 'detectedAt' | 'status'>
): Promise<string> {
  const riskRef = await addDoc(collection(db, COLLECTIONS.COMPLIANCE_RISKS), {
    ...riskData,
    status: 'active',
    detectedAt: serverTimestamp(),
  });

  // Create audit log
  await createComplianceAuditEntry({
    userId: riskData.userId,
    firmId: riskData.firmId,
    action: 'risk_detected',
    entityType: 'risk',
    entityId: riskRef.id,
    details: {
      riskType: riskData.riskType,
      severity: riskData.severity,
    },
    performedBy: 'system',
  });

  return riskRef.id;
}

/**
 * Get active risks for a user/firm
 */
export async function getActiveRisks(
  userId: string,
  firmId?: string
): Promise<ComplianceRisk[]> {
  const risksQuery = firmId
    ? query(
        collection(db, COLLECTIONS.COMPLIANCE_RISKS),
        where('userId', '==', userId),
        where('firmId', '==', firmId),
        where('status', '==', 'active'),
        orderBy('detectedAt', 'desc')
      )
    : query(
        collection(db, COLLECTIONS.COMPLIANCE_RISKS),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('detectedAt', 'desc')
      );

  const risksSnapshot = await getDocs(risksQuery);
  
  return risksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as ComplianceRisk));
}

/**
 * Resolve a risk
 */
export async function resolveRisk(
  riskId: string,
  resolutionNotes: string,
  userId: string,
  firmId: string
): Promise<void> {
  const riskRef = doc(db, COLLECTIONS.COMPLIANCE_RISKS, riskId);
  
  await updateDoc(riskRef, {
    status: 'resolved',
    resolutionNotes,
    resolvedAt: serverTimestamp(),
  });

  // Create audit log
  await createComplianceAuditEntry({
    userId,
    firmId,
    action: 'risk_resolved',
    entityType: 'risk',
    entityId: riskId,
    details: {
      resolutionNotes,
    },
    performedBy: 'system',
  });
}

