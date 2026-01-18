/**
 * Compliance Lifecycle Automation (CLA) - Main Export
 * ICAI-Compliant: ZenithBooks as Principal Service Provider
 */

// Graph Engine
export { getComplianceGraphEngine } from './graph/compliance-graph';
export type { ComplianceRule } from './types';

// Trigger Service
export {
  processComplianceEvent,
  onGSTRegistration,
  onEmployeeAdded,
  onMonthEnd,
  onQuarterEnd,
  onFinancialYearEnd,
  onPayrollRun,
  onInvoiceGenerated,
  onComplianceSubscriptionActivated,
} from './triggers/trigger-service';

// Task Orchestrator
export {
  createComplianceTaskInstance,
  updateTaskStatus,
  assignTaskToAssociate,
  assignCAReviewer,
  updateTaskFilingDetails,
  linkDocumentToTask,
  getOverdueTasks,
  getTasksByStatus,
  markOverdueTasks,
} from './orchestrator/task-orchestrator';

// Risk Engine
export {
  detectGSTRMismatch,
  detectITCShortfall,
  detectDelayedFilings,
  detectMissingDocuments,
  getActiveRisks,
  resolveRisk,
} from './risk/risk-engine';

// Eligibility Engine
export {
  evaluatePFEligibility,
  evaluateESIEligibility,
  evaluateMCACompliance,
  evaluateGSTPlanUpgrade,
  performEligibilityCheck,
  getActiveRecommendations,
} from './eligibility/eligibility-engine';

// Audit Service
export {
  createComplianceAuditEntry,
  getAuditLogs,
  getAuditTrail,
} from './audit/audit-service';

// Document Vault Service
export {
  updateDocumentComplianceMetadata,
  linkDocumentToComplianceTask,
  updateDocumentFilingStatus,
  getDocumentsByTaskId,
  getDocumentsByComplianceType,
  getDocumentsByFilingStatus,
} from './vault/document-vault-service';

// Types
export type {
  ComplianceTaskInstance,
  ComplianceRisk,
  PlanRecommendation,
  ComplianceAuditEntry,
  ComplianceEvent,
  EntityType,
  SystemEventType,
  ComplianceType,
  ComplianceFrequency,
  ComplianceDocumentMetadata,
} from './types';

