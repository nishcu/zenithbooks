/**
 * Compliance Task Orchestrator
 * Auto-generates recurring and one-time compliance tasks
 */

import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  ComplianceTaskInstance,
  ComplianceFrequency,
  ComplianceType,
} from '../types';
import { createComplianceAuditEntry } from '../audit/audit-service';

const COLLECTIONS = {
  COMPLIANCE_TASKS: 'compliance_task_instances',
};

/**
 * Create a new compliance task instance
 */
export async function createComplianceTaskInstance(
  taskData: Omit<ComplianceTaskInstance, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'platformOwned'>
): Promise<string> {
  const taskRef = await addDoc(collection(db, COLLECTIONS.COMPLIANCE_TASKS), {
    ...taskData,
    status: 'pending',
    platformOwned: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return taskRef.id;
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: ComplianceTaskInstance['status'],
  updatedBy: string | 'system',
  additionalData?: Partial<ComplianceTaskInstance>
): Promise<void> {
  const taskRef = doc(db, COLLECTIONS.COMPLIANCE_TASKS, taskId);
  
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
    ...additionalData,
  };

  if (status === 'completed' || status === 'filed') {
    updateData.completedAt = serverTimestamp();
  }
  
  if (status === 'filed') {
    updateData.filedAt = serverTimestamp();
  }

  await updateDoc(taskRef, updateData);

  // Create audit log
  await createComplianceAuditEntry({
    userId: additionalData?.userId || '',
    firmId: additionalData?.firmId || '',
    action: 'task_status_changed',
    entityType: 'task',
    entityId: taskId,
    details: {
      previousStatus: additionalData?.status,
      newStatus: status,
      updatedBy,
    },
    performedBy: updatedBy,
  });
}

/**
 * Assign task to compliance associate
 */
export async function assignTaskToAssociate(
  taskId: string,
  associateCode: string,
  userId: string,
  firmId: string
): Promise<void> {
  const taskRef = doc(db, COLLECTIONS.COMPLIANCE_TASKS, taskId);
  
  await updateDoc(taskRef, {
    assignedTo: associateCode,
    updatedAt: serverTimestamp(),
  });

  // Create audit log
  await createComplianceAuditEntry({
    userId,
    firmId,
    action: 'task_assigned',
    entityType: 'task',
    entityId: taskId,
    details: {
      associateCode,
    },
    performedBy: 'system',
  });
}

/**
 * Assign CA reviewer to task
 */
export async function assignCAReviewer(
  taskId: string,
  caReviewerCode: string,
  userId: string,
  firmId: string
): Promise<void> {
  const taskRef = doc(db, COLLECTIONS.COMPLIANCE_TASKS, taskId);
  
  await updateDoc(taskRef, {
    caReviewer: caReviewerCode,
    updatedAt: serverTimestamp(),
  });

  // Create audit log
  await createComplianceAuditEntry({
    userId,
    firmId,
    action: 'task_assigned',
    entityType: 'task',
    entityId: taskId,
    details: {
      caReviewerCode,
      reviewType: 'ca_review',
    },
    performedBy: 'system',
  });
}

/**
 * Update task filing details
 */
export async function updateTaskFilingDetails(
  taskId: string,
  filingDetails: ComplianceTaskInstance['filingDetails'],
  userId: string,
  firmId: string
): Promise<void> {
  const taskRef = doc(db, COLLECTIONS.COMPLIANCE_TASKS, taskId);
  
  await updateDoc(taskRef, {
    filingDetails,
    status: 'filed',
    filedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create audit log
  await createComplianceAuditEntry({
    userId,
    firmId,
    action: 'filing_submitted',
    entityType: 'task',
    entityId: taskId,
    details: {
      filingDetails,
    },
    performedBy: 'system',
  });
}

/**
 * Link document to task
 */
export async function linkDocumentToTask(
  taskId: string,
  documentId: string,
  documentType: string,
  userId: string,
  firmId: string
): Promise<void> {
  const taskRef = doc(db, COLLECTIONS.COMPLIANCE_TASKS, taskId);
  const taskDoc = await getDocs(query(
    collection(db, COLLECTIONS.COMPLIANCE_TASKS),
    where('__name__', '==', taskId)
  ));

  if (!taskDoc.empty) {
    const task = taskDoc.docs[0].data() as ComplianceTaskInstance;
    const updatedDocuments = task.requiredDocuments.map(doc => {
      if (doc.documentType === documentType) {
        return {
          ...doc,
          documentId,
          uploaded: true,
          uploadedAt: serverTimestamp(),
        };
      }
      return doc;
    });

    await updateDoc(taskRef, {
      requiredDocuments: updatedDocuments,
      updatedAt: serverTimestamp(),
    });

    // Create audit log
    await createComplianceAuditEntry({
      userId,
      firmId,
      action: 'document_uploaded',
      entityType: 'document',
      entityId: documentId,
      details: {
        taskId,
        documentType,
      },
      performedBy: userId,
    });
  }
}

/**
 * Generate recurring tasks for a subscription
 */
export async function generateRecurringTasks(
  userId: string,
  firmId: string,
  ruleIds: string[],
  frequency: ComplianceFrequency
): Promise<string[]> {
  const taskIds: string[] = [];
  
  // This would typically use the compliance graph to get rules
  // and generate tasks based on frequency
  // For now, this is a placeholder structure
  
  return taskIds;
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(
  userId: string,
  firmId?: string
): Promise<ComplianceTaskInstance[]> {
  const now = new Date();
  const tasksQuery = userId
    ? query(
        collection(db, COLLECTIONS.COMPLIANCE_TASKS),
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'in_progress']),
        where('dueDate', '<', Timestamp.fromDate(now)),
        orderBy('dueDate', 'asc')
      )
    : query(
        collection(db, COLLECTIONS.COMPLIANCE_TASKS),
        where('status', 'in', ['pending', 'in_progress']),
        where('dueDate', '<', Timestamp.fromDate(now)),
        orderBy('dueDate', 'asc')
      );

  const tasksSnapshot = await getDocs(tasksQuery);
  
  return tasksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as ComplianceTaskInstance));
}

/**
 * Get tasks by status
 */
export async function getTasksByStatus(
  userId: string,
  status: ComplianceTaskInstance['status'],
  firmId?: string
): Promise<ComplianceTaskInstance[]> {
  try {
    const tasksQuery = query(
      collection(db, COLLECTIONS.COMPLIANCE_TASKS),
      where('userId', '==', userId),
      where('status', '==', status),
      orderBy('dueDate', 'asc')
    );

    const tasksSnapshot = await getDocs(tasksQuery);
    
    return tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ComplianceTaskInstance));
  } catch (error: any) {
    // If orderBy fails (missing index), try without it
    if (error.code === 'failed-precondition') {
      const tasksQuery = query(
        collection(db, COLLECTIONS.COMPLIANCE_TASKS),
        where('userId', '==', userId),
        where('status', '==', status)
      );

      const tasksSnapshot = await getDocs(tasksQuery);
      const tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ComplianceTaskInstance));
      
      // Sort manually
      tasks.sort((a, b) => {
        const dateA = a.dueDate instanceof Timestamp ? a.dueDate.toDate() : new Date(a.dueDate);
        const dateB = b.dueDate instanceof Timestamp ? b.dueDate.toDate() : new Date(b.dueDate);
        return dateA.getTime() - dateB.getTime();
      });
      
      return tasks;
    }
    throw error;
  }
}

/**
 * Mark task as overdue
 */
export async function markOverdueTasks(): Promise<number> {
  const overdueTasks = await getOverdueTasks('');
  
  let updatedCount = 0;
  for (const task of overdueTasks) {
    if (task.status !== 'overdue') {
      await updateTaskStatus(task.id, 'overdue', 'system', {
        userId: task.userId,
        firmId: task.firmId,
      });
      updatedCount++;
    }
  }
  
  return updatedCount;
}

