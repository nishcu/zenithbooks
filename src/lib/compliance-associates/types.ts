/**
 * Compliance Associates - Types
 * ICAI-Compliant: Associates are internal resources, never exposed to clients
 */

import { Timestamp } from 'firebase/firestore';

export type AssociateQualification = 'CA' | 'CS' | 'CMA' | 'Graduate' | 'Other';
export type AssociateStatus = 'pending_approval' | 'active' | 'suspended' | 'inactive' | 'rejected';

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

