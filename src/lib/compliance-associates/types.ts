/**
 * Compliance Associates / Zenith Corporate Mitra - Types
 * ICAI-Compliant: Associates are internal resources, never exposed to clients
 */

import { Timestamp } from 'firebase/firestore';

export type AssociateQualification = 'CA' | 'CS' | 'CMA' | 'Graduate' | 'Other';
export type AssociateStatus = 'pending_approval' | 'active' | 'suspended' | 'inactive' | 'rejected';

/** Corporate Mitra level (CM-L1 to CM-L4) */
export type CorporateMitraLevel = 'CM-L1' | 'CM-L2' | 'CM-L3' | 'CM-L4';

/** Risk flag for internal use only */
export type RiskFlag = 'low' | 'medium' | 'high';

export interface CorporateMitraPerformance {
  score: number; // 0–100
  accuracyRate: number; // %
  avgTurnaroundHours: number;
  reworkCount: number;
  lastEvaluatedAt: Timestamp | Date;
}

export interface CorporateMitraCertifications {
  gstBasics: boolean;
  msmeCompliance: boolean;
  payrollBasics: boolean;
  mcaBasics: boolean;
}

export interface ComplianceAssociate {
  id: string;
  associateCode: string; // e.g., "AS-001", auto-generated
  email: string;
  name: string;
  phone: string;
  panNumber: string;
  
  // Professional details
  qualification: AssociateQualification;
  yearsOfExperience: number;
  specializations: string[]; // ['GST', 'TDS', 'Payroll', 'Incorporation', 'MCA', etc.]
  otherQualification?: string; // If qualification is 'Other'
  
  // Bank details for payouts
  bankAccount: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  
  // Platform fee subscription
  platformFee: {
    annualCharge: number; // ₹999 per year
    paymentStatus: 'pending' | 'paid' | 'expired' | 'refunded';
    paymentId?: string;
    orderId?: string;
    paidAt?: Timestamp | Date;
    expiresAt?: Timestamp | Date;
    autoRenew: boolean;
  };
  
  // Status
  status: AssociateStatus;
  approvedBy?: string; // Admin UID
  approvedAt?: Timestamp | Date;
  rejectionReason?: string;
  
  // Activity metrics
  tasksCompleted: number;
  tasksInProgress: number;
  totalEarnings?: number;
  rating?: number; // Internal rating (not shown to clients)
  
  // Zenith Corporate Mitra enhancements (optional for backward compat)
  level?: CorporateMitraLevel;
  performance?: CorporateMitraPerformance;
  certifications?: CorporateMitraCertifications;
  eligibleTaskTypes?: string[]; // auto-derived
  riskFlag?: RiskFlag;
  
  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface AssociateAuditLog {
  id: string;
  associateId: string;
  action: 'registered' | 'payment_received' | 'approved' | 'rejected' | 'suspended' | 'reactivated' | 'fee_renewed';
  details: Record<string, any>;
  performedBy: 'system' | string; // 'system' or admin userId
  performedAt: Timestamp | Date;
}

/** Corporate Mitra audit log (level_up, score_update, certification_passed, task_reviewed) */
export interface CorporateMitraAuditLog {
  id: string;
  associateId: string;
  associateCode: string;
  action: 'level_up' | 'score_update' | 'certification_passed' | 'task_reviewed' | string;
  meta: Record<string, unknown>;
  createdAt: Timestamp | Date;
}

