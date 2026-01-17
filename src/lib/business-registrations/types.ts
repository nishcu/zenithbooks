/**
 * Business Registrations Module - Types
 * ICAI-Compliant: ZenithBooks as principal service provider
 */

import { Timestamp } from 'firebase/firestore';

export type RegistrationType =
  | 'gst_registration'
  | 'pvt_ltd_incorporation'
  | 'llp_registration'
  | 'partnership_firm'
  | 'sole_proprietorship_msme'
  | 'shops_establishment'
  | 'professional_tax'
  | 'pf_esi_registration';

export type RegistrationStatus =
  | 'pending_documents'
  | 'submitted_to_team'
  | 'in_progress'
  | 'under_review'
  | 'completed'
  | 'rejected'
  | 'on_hold';

export interface BusinessRegistration {
  id: string;
  userId: string;
  firmId: string;
  registrationType: RegistrationType;
  status: RegistrationStatus;
  
  // Client-provided information
  businessName?: string;
  businessType?: string;
  gstin?: string; // If applicable
  pan?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  
  // Documents (stored in vault/references)
  documents: {
    id: string;
    name: string;
    type: string;
    uploadedAt: Timestamp | Date;
    uploadedBy: string; // userId
    vaultReference?: string;
  }[];
  
  // Internal workflow
  assignedToInternalTeam: boolean; // Always true - ICAI compliance
  assignedTo?: string; // Compliance Associate code (no client names - ICAI compliant)
  caReviewer?: string; // CA reviewer code (for verification)
  sopReference?: string; // SOP reference for registration type
  internalNotes?: string;
  
  // Completion details
  completedAt?: Timestamp | Date;
  registrationNumber?: string; // e.g., GSTIN, CIN, LLPIN
  certificateUrl?: string; // Reference to certificate document
  rejectionReason?: string;
  
  // Pricing
  feeAmount: number;
  feePaid: boolean;
  paymentId?: string;
  
  // Bundled with compliance plan
  bundledWithPlan?: string; // subscriptionId if bundled
  
  // Platform ownership
  platformOwned: true; // Always true - ZenithBooks as principal
  
  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string; // userId
}

export interface RegistrationAuditLog {
  id: string;
  registrationId: string;
  userId: string;
  firmId: string;
  action:
    | 'registration_requested'
    | 'documents_uploaded'
    | 'submitted_to_team'
    | 'assigned_to_associate'
    | 'ca_review_assigned'
    | 'status_updated'
    | 'completed'
    | 'rejected'
    | 'on_hold';
  details: Record<string, any>;
  performedBy: 'system' | string; // 'system' or userId
  performedAt: Timestamp | Date;
  ipAddress?: string;
}

