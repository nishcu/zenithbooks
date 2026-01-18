/**
 * Compliance Trigger Service
 * Event-driven system that listens to system events and creates compliance tasks
 */

import { 
  doc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getComplianceGraphEngine } from '../graph/compliance-graph';
import type { 
  ComplianceEvent, 
  SystemEventType, 
  EntityType,
  ComplianceTaskInstance 
} from '../types';
import { createComplianceTaskInstance } from '../orchestrator/task-orchestrator';
import { createComplianceAuditEntry } from '../audit/audit-service';

const COLLECTIONS = {
  COMPLIANCE_EVENTS: 'compliance_events',
};

/**
 * Process a system event and generate compliance tasks
 */
export async function processComplianceEvent(
  userId: string,
  firmId: string,
  eventType: SystemEventType,
  eventData: Record<string, any>,
  entityType: EntityType
): Promise<string[]> {
  // Create event record
  const eventRef = await addDoc(collection(db, COLLECTIONS.COMPLIANCE_EVENTS), {
    userId,
    firmId,
    eventType,
    eventData,
    timestamp: serverTimestamp(),
    processed: false,
  });

  const eventId = eventRef.id;

  // Get compliance graph engine
  const graphEngine = getComplianceGraphEngine();
  
  // Resolve applicable compliances
  const applicableRules = graphEngine.resolveCompliances(
    eventType,
    entityType,
    eventData
  );

  const taskIds: string[] = [];

  // Create tasks for each applicable rule
  for (const rule of applicableRules) {
    try {
      const dueDate = graphEngine.calculateDueDate(rule, new Date());
      
      const taskId = await createComplianceTaskInstance({
        userId,
        firmId,
        ruleId: rule.id,
        ruleName: rule.name,
        taskName: rule.name,
        description: rule.description,
        complianceType: rule.complianceType,
        triggerEventId: eventId,
        triggerEventType: eventType,
        frequency: rule.frequency,
        dueDate,
        priority: rule.taskConfiguration.priority,
        requiredDocuments: rule.requiredDocuments.map(doc => ({
          documentType: doc.documentType,
          uploaded: false,
        })),
        platformOwned: true,
        requiresCAReview: rule.taskConfiguration.requiresCAReview,
      });

      taskIds.push(taskId);

      // Create audit log
      await createComplianceAuditEntry({
        userId,
        firmId,
        action: 'task_created',
        entityType: 'task',
        entityId: taskId,
        details: {
          ruleId: rule.id,
          eventType,
          eventId,
          dueDate: dueDate.toISOString(),
        },
        performedBy: 'system',
      });
    } catch (error) {
      console.error(`Error creating task for rule ${rule.id}:`, error);
    }
  }

  // Mark event as processed
  await addDoc(collection(db, COLLECTIONS.COMPLIANCE_EVENTS), {
    id: eventId,
    processed: true,
    processedAt: serverTimestamp(),
  }, eventId);

  // Create audit log for event
  await createComplianceAuditEntry({
    userId,
    firmId,
    action: 'event_triggered',
    entityType: 'event',
    entityId: eventId,
    details: {
      eventType,
      eventData,
      tasksCreated: taskIds.length,
    },
    performedBy: 'system',
  });

  return taskIds;
}

/**
 * Get entity type for a user/firm
 * This would typically query from user/firm profile
 */
export async function getEntityTypeForUser(userId: string, firmId: string): Promise<EntityType | null> {
  // TODO: Query from firm/user profile
  // For now, default to private_limited
  // This should be fetched from actual user/firm data
  try {
    const firmDoc = await getDocs(query(
      collection(db, 'firms'),
      where('id', '==', firmId)
    ));
    
    if (!firmDoc.empty) {
      const firmData = firmDoc.docs[0].data();
      return firmData.entityType || 'private_limited';
    }
  } catch (error) {
    console.error('Error fetching entity type:', error);
  }
  
  return 'private_limited'; // Default fallback
}

/**
 * Trigger compliance event handlers
 * These functions can be called from existing modules without breaking them
 */

// GST Registration Event
export async function onGSTRegistration(
  userId: string,
  firmId: string,
  gstin: string
): Promise<void> {
  const entityType = await getEntityTypeForUser(userId, firmId);
  if (!entityType) return;

  await processComplianceEvent(
    userId,
    firmId,
    'gst_registration',
    { gstin, gstRegistered: true },
    entityType
  );
}

// Employee Added Event
export async function onEmployeeAdded(
  userId: string,
  firmId: string,
  employeeCount: number
): Promise<void> {
  const entityType = await getEntityTypeForUser(userId, firmId);
  if (!entityType) return;

  await processComplianceEvent(
    userId,
    firmId,
    'employee_added',
    { employeeCount, employeeCountThreshold: true },
    entityType
  );
  
  // Check for threshold-based triggers
  if (employeeCount >= 10) {
    await processComplianceEvent(
      userId,
      firmId,
      'employee_count_threshold',
      { employeeCount, threshold: 10 },
      entityType
    );
  }
  
  if (employeeCount >= 20) {
    await processComplianceEvent(
      userId,
      firmId,
      'employee_count_threshold',
      { employeeCount, threshold: 20 },
      entityType
    );
  }
}

// Month End Event (for recurring monthly compliances)
export async function onMonthEnd(userId: string, firmId: string): Promise<void> {
  const entityType = await getEntityTypeForUser(userId, firmId);
  if (!entityType) return;

  await processComplianceEvent(
    userId,
    firmId,
    'month_end',
    { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    entityType
  );
}

// Quarter End Event
export async function onQuarterEnd(userId: string, firmId: string): Promise<void> {
  const entityType = await getEntityTypeForUser(userId, firmId);
  if (!entityType) return;

  await processComplianceEvent(
    userId,
    firmId,
    'quarter_end',
    { quarter: Math.floor(new Date().getMonth() / 3) + 1 },
    entityType
  );
}

// Financial Year End Event
export async function onFinancialYearEnd(userId: string, firmId: string): Promise<void> {
  const entityType = await getEntityTypeForUser(userId, firmId);
  if (!entityType) return;

  await processComplianceEvent(
    userId,
    firmId,
    'financial_year_end',
    { financialYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` },
    entityType
  );
}

// Payroll Run Event
export async function onPayrollRun(
  userId: string,
  firmId: string,
  payrollData: Record<string, any>
): Promise<void> {
  const entityType = await getEntityTypeForUser(userId, firmId);
  if (!entityType) return;

  await processComplianceEvent(
    userId,
    firmId,
    'payroll_run',
    { ...payrollData, employeeCount: payrollData.employeeCount || 0 },
    entityType
  );
}

// Invoice Generated Event
export async function onInvoiceGenerated(
  userId: string,
  firmId: string,
  invoiceData: Record<string, any>
): Promise<void> {
  const entityType = await getEntityTypeForUser(userId, firmId);
  if (!entityType) return;

  // This might trigger GST-related compliances if turnover thresholds are met
  await processComplianceEvent(
    userId,
    firmId,
    'invoice_generated',
    invoiceData,
    entityType
  );
}

// Compliance Subscription Activated
export async function onComplianceSubscriptionActivated(
  userId: string,
  firmId: string,
  planTier: string
): Promise<void> {
  const entityType = await getEntityTypeForUser(userId, firmId);
  if (!entityType) return;

  await processComplianceEvent(
    userId,
    firmId,
    'compliance_subscription_activated',
    { planTier },
    entityType
  );
}

