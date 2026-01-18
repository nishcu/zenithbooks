/**
 * Compliance Lifecycle Automation (CLA) - Types
 * ICAI-Compliant: ZenithBooks as Principal Service Provider
 */

import { Timestamp } from 'firebase/firestore';

// ==================== Entity Types ====================
export type EntityType = 
  | 'sole_proprietorship'
  | 'partnership'
  | 'llp'
  | 'private_limited'
  | 'public_limited'
  | 'one_person_company'
  | 'huf'
  | 'trust'
  | 'society';

// ==================== Compliance Types ====================
export type ComplianceType = 
  | 'gst'
  | 'income_tax'
  | 'tds'
  | 'payroll'
  | 'pf'
  | 'esi'
  | 'professional_tax'
  | 'mca'
  | 'roc'
  | 'shop_establishment'
  | 'labor'
  | 'environmental'
  | 'fire_safety'
  | 'fssai'
  | 'iec'
  | 'customs'
  | 'excise';

// ==================== Compliance Frequency ====================
export type ComplianceFrequency = 
  | 'monthly'
  | 'quarterly'
  | 'half_yearly'
  | 'annual'
  | 'event_based'
  | 'one_time';

// ==================== System Events ====================
export type SystemEventType = 
  | 'gst_registration'
  | 'employee_added'
  | 'employee_count_threshold'
  | 'invoice_generated'
  | 'payroll_run'
  | 'funding_received'
  | 'entity_type_changed'
  | 'turnover_threshold'
  | 'gst_filing_completed'
  | 'registration_completed'
  | 'compliance_subscription_activated'
  | 'document_uploaded'
  | 'financial_year_end'
  | 'quarter_end'
  | 'month_end';

// ==================== Compliance Graph Rule ====================
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  
  // Entity matching
  entityTypes: EntityType[];
  applicableEntityTypes?: EntityType[]; // Specific entities that apply
  
  // Trigger configuration
  triggerEvent: SystemEventType;
  triggerConditions?: Record<string, any>; // Additional conditions
  
  // Compliance details
  complianceType: ComplianceType;
  frequency: ComplianceFrequency;
  
  // Due date logic (function-like configuration)
  dueDateLogic: {
    type: 'fixed_day' | 'month_end' | 'quarter_end' | 'year_end' | 'days_after_event' | 'custom';
    dayOfMonth?: number; // For fixed_day (1-31)
    daysAfter?: number; // For days_after_event
    monthOffset?: number; // Month offset from trigger
    customFormula?: string; // Future: JavaScript-like formula
  };
  
  // Penalty logic
  penaltyLogic: {
    enabled: boolean;
    penaltyAmount?: number;
    penaltyFormula?: string; // Future: per-day penalty calculation
    gracePeriodDays?: number;
  };
  
  // Document requirements
  requiredDocuments: {
    documentType: string;
    description: string;
    mandatory: boolean;
    uploadBeforeDue?: boolean;
  }[];
  
  // Dependencies
  dependencies?: string[]; // Rule IDs that must complete before this
  
  // Task configuration
  taskConfiguration: {
    priority: 'high' | 'medium' | 'low';
    estimatedDuration?: number; // in hours
    autoAssign?: boolean;
    requiresCAReview?: boolean;
    reviewStage?: 'before_filing' | 'after_filing' | 'both';
  };
  
  // Metadata
  active: boolean;
  version: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// ==================== Compliance Event ====================
export interface ComplianceEvent {
  id: string;
  userId: string;
  firmId: string;
  eventType: SystemEventType;
  eventData: Record<string, any>;
  timestamp: Timestamp | Date;
  processed: boolean;
  processedAt?: Timestamp | Date;
}

// ==================== Compliance Task (Extended) ====================
export interface ComplianceTaskInstance {
  id: string;
  userId: string;
  firmId: string;
  
  // Rule reference
  ruleId: string;
  ruleName: string;
  
  // Task details
  taskName: string;
  description: string;
  complianceType: ComplianceType;
  
  // Scheduling
  triggerEventId?: string;
  triggerEventType?: SystemEventType;
  frequency: ComplianceFrequency;
  dueDate: Timestamp | Date;
  scheduledFor?: Timestamp | Date; // For recurring tasks
  
  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'filed' | 'overdue' | 'failed';
  
  // Assignment (ICAI-compliant: internal only)
  platformOwned: true; // Always true
  assignedTo?: string; // Compliance Associate code
  caReviewer?: string; // CA reviewer code
  sopReference?: string;
  
  // Documents
  requiredDocuments: {
    documentType: string;
    documentId?: string; // Linked document ID from vault
    uploaded: boolean;
    uploadedAt?: Timestamp | Date;
  }[];
  
  // Filing details
  filingDetails?: {
    formType: string;
    period: string;
    filingDate?: Timestamp | Date;
    acknowledgmentNumber?: string;
    portal?: string; // GST Portal, Income Tax Portal, etc.
  };
  
  // Priority and metadata
  priority: 'high' | 'medium' | 'low';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  
  // Timestamps
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  completedAt?: Timestamp | Date;
  filedAt?: Timestamp | Date;
}

// ==================== Compliance Risk ====================
export interface ComplianceRisk {
  id: string;
  userId: string;
  firmId: string;
  
  riskType: 
    | 'gstr_mismatch'
    | 'itc_shortfall'
    | 'delayed_filing'
    | 'missing_document'
    | 'penalty_due'
    | 'threshold_breach'
    | 'data_inconsistency';
  
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  description: string;
  detectedAt: Timestamp | Date;
  
  // Related entities
  relatedTaskId?: string;
  relatedDocumentId?: string;
  relatedComplianceType?: ComplianceType;
  
  // Risk details
  riskData: Record<string, any>;
  
  // Recommendations
  recommendedActions: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimatedPenalty?: number;
  }[];
  
  // Resolution
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  resolvedAt?: Timestamp | Date;
  resolutionNotes?: string;
}

// ==================== Plan Eligibility Recommendation ====================
export interface PlanRecommendation {
  id: string;
  userId: string;
  firmId: string;
  
  recommendationType: 
    | 'pf_required'
    | 'esi_required'
    | 'mca_compliance_required'
    | 'gst_plan_upgrade'
    | 'additional_compliance'
    | 'threshold_breach';
  
  currentStatus: string;
  recommendedAction: string;
  benefitDescription: string;
  
  // Triggers
  triggerData: Record<string, any>;
  
  // Status
  status: 'active' | 'accepted' | 'dismissed' | 'implemented';
  presentedAt: Timestamp | Date;
  acceptedAt?: Timestamp | Date;
  dismissedAt?: Timestamp | Date;
}

// ==================== Document Vault Extension ====================
export interface ComplianceDocumentMetadata {
  // Existing vault document fields...
  
  // Compliance extensions
  complianceType?: ComplianceType;
  linkedTaskId?: string;
  linkedRuleId?: string;
  filingReference?: string;
  filingStatus?: 'uploaded' | 'under_review' | 'approved' | 'filed' | 'rejected' | 'archived';
  filingPeriod?: string; // e.g., "2024-04" for April 2024
  filingYear?: string; // e.g., "2024-25"
  portalSubmissionId?: string;
  lastReviewedAt?: Timestamp | Date;
  reviewedBy?: string; // Associate code
}

// ==================== Audit Log ====================
export interface ComplianceAuditEntry {
  id: string;
  userId: string;
  firmId: string;
  
  action: 
    | 'event_triggered'
    | 'task_created'
    | 'task_assigned'
    | 'task_status_changed'
    | 'document_uploaded'
    | 'document_reviewed'
    | 'filing_submitted'
    | 'risk_detected'
    | 'risk_resolved'
    | 'recommendation_presented'
    | 'plan_eligibility_checked';
  
  entityType: 'event' | 'task' | 'document' | 'risk' | 'recommendation';
  entityId: string;
  
  details: Record<string, any>;
  
  // Metadata
  performedBy: 'system' | string; // 'system' or userId or associate code
  performedAt: Timestamp | Date;
  ipAddress?: string;
  userAgent?: string;
  
  // Immutability
  immutable: true; // Audit logs cannot be modified
}

