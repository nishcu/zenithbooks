/**
 * ITR Filing Module - Type Definitions
 * Complete type system for ITR filing workflow
 */

export type ITRStatus = 
  | 'UPLOADED'           // User uploaded documents
  | 'DATA_FETCHING'      // CA team downloading AIS/26AS
  | 'AIS_DOWNLOADED'     // AIS/26AS downloaded successfully
  | 'DRAFT_IN_PROGRESS'  // AI generating draft
  | 'DRAFT_READY'        // Draft ready for user approval
  | 'USER_REVIEW'        // User reviewing draft
  | 'USER_APPROVED'      // User approved draft
  | 'CHANGES_REQUESTED'  // User requested changes
  | 'FILING_IN_PROGRESS' // CA team filing ITR
  | 'FILED'              // ITR filed
  | 'E_VERIFIED'         // E-verification completed
  | 'COMPLETED'          // Process completed
  | 'REJECTED';          // Application rejected

export type ITRFormType = 'ITR-1' | 'ITR-2' | 'ITR-3' | 'ITR-4';

export type FinancialYear = string; // Format: "2023-24"

export type ScrutinyRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export type DocumentType = 
  | 'PAN_FRONT'
  | 'AADHAAR'
  | 'FORM_16'
  | 'BANK_STATEMENT'
  | 'RENT_RECEIPT'
  | 'LIC_PREMIUM'
  | 'HOME_LOAN_STATEMENT'
  | 'AIS_PDF'
  | 'AIS_JSON'
  | 'FORM_26AS'
  | 'TIS'
  | 'PAST_ITR'
  | 'ITR_DRAFT'
  | 'ITR_V'
  | 'FILING_ACKNOWLEDGEMENT'
  | 'OTHER';

export interface ITRApplication {
  id: string;
  userId: string;
  financialYear: FinancialYear;
  status: ITRStatus;
  formType?: ITRFormType;
  
  // User Information (from OCR)
  pan?: string;
  name?: string;
  employerTAN?: string;
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  draftReadyAt?: Date;
  userApprovedAt?: Date;
  filedAt?: Date;
  eVerifiedAt?: Date;
  completedAt?: Date;
  
  // OCR Extracted Data
  ocrData?: {
    name?: string;
    pan?: string;
    employerTAN?: string;
    grossSalary?: number;
    tdsAmount?: number;
    extractedAt?: Date;
  };
  
  // ITR Draft Data
  draft?: ITRDraft;
  
  // Assignment Information
  assignedTo?: string; // Professional/CA team member UID
  assignedAt?: Date;
  assignedBy?: string; // Admin UID who assigned
  
  // Filing Information
  filingInfo?: {
    itrVUrl?: string;
    acknowledgementUrl?: string;
    acknowledgementNumber?: string;
    filedBy?: string; // CA team member UID
    filedAt?: Date;
  };
  
  // Refund Information
  refundInfo?: {
    amount?: number;
    status?: 'PENDING' | 'PROCESSING' | 'CREDITED' | 'REJECTED';
    creditedAt?: Date;
    predictedDate?: Date;
  };
  
  // Metadata
  metadata?: {
    scrutinyRisk?: ScrutinyRisk;
    comments?: string[];
    caTeamNotes?: string[];
  };
}

export interface ITRDraft {
  id: string;
  applicationId: string;
  financialYear: FinancialYear;
  
  // Income Summary
  income: {
    salary: number;
    houseProperty: number;
    capitalGains: number;
    businessProfession: number;
    otherSources: number;
    totalIncome: number;
  };
  
  // Deductions Summary
  deductions: {
    section80C: number;
    section80D: number;
    section80G: number;
    section24: number; // Home loan interest
    section80E: number; // Education loan
    section80TTA: number; // Savings interest
    other: number;
    totalDeductions: number;
  };
  
  // Tax Calculation
  tax: {
    totalTax: number;
    tds: number;
    advanceTax: number;
    selfAssessmentTax: number;
    refund: number;
    payable: number;
  };
  
  // Mismatches
  mismatches: Array<{
    type: 'TDS' | 'AIS' | 'FORM_16' | 'OTHER';
    description: string;
    amount: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  
  // Comments & Notes
  comments: Array<{
    id: string;
    author: string; // UID
    authorType: 'CA_TEAM' | 'USER';
    message: string;
    createdAt: Date;
    resolved?: boolean;
  }>;
  
  // Status
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'CHANGES_REQUESTED';
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string; // User UID
  approvedAt?: Date;
}

export interface ITRDocument {
  id: string;
  applicationId: string;
  userId: string;
  type: DocumentType;
  financialYear: FinancialYear;
  
  // File Information
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  
  // Storage
  storagePath: string;
  encrypted: boolean;
  
  // Metadata
  uploadedAt: Date;
  uploadedBy: string; // UID
  description?: string;
}

export interface ITRCredentials {
  id: string;
  applicationId: string;
  userId: string;
  
  // Encrypted Credentials (AES-256)
  encryptedUsername: string;
  encryptedPassword: string;
  
  // Metadata
  createdAt: Date;
  lastUsedAt?: Date;
  deletedAt?: Date; // Auto-delete after filing
  
  // Access Log
  accessLog: Array<{
    accessedBy: string; // CA team member UID
    accessedAt: Date;
    purpose: string;
  }>;
}

export interface ITRNotification {
  id: string;
  userId: string;
  applicationId?: string;
  
  type: 
    | 'DRAFT_READY'
    | 'FILING_STARTED'
    | 'FILING_COMPLETED'
    | 'REFUND_UPDATE'
    | 'CHANGES_REQUESTED'
    | 'STATUS_UPDATE';
  
  title: string;
  message: string;
  
  // Delivery
  emailSent: boolean;
  whatsappSent: boolean;
  inAppRead: boolean;
  
  createdAt: Date;
  readAt?: Date;
}

export interface ITRHealthReport {
  id: string;
  userId: string;
  financialYear: FinancialYear;
  
  // Income Trends
  incomeTrends: {
    year: string;
    totalIncome: number;
    growth: number; // Percentage
  }[];
  
  // AIS Patterns
  aisPatterns: {
    consistentIncome: boolean;
    multipleEmployers: boolean;
    irregularDeposits: boolean;
  };
  
  // Compliance Flags
  complianceFlags: Array<{
    type: 'MISSING_DOCUMENT' | 'TDS_MISMATCH' | 'LATE_FILING' | 'HIGH_SCRUTINY_RISK';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
  }>;
  
  // Investment Recommendations
  recommendations: Array<{
    category: 'TAX_SAVING' | 'RETIREMENT' | 'HEALTH' | 'EDUCATION';
    title: string;
    description: string;
    estimatedSavings: number;
  }>;
  
  generatedAt: Date;
}

export interface CAUser {
  uid: string;
  email: string;
  name: string;
  role: 'CA_TEAM' | 'ADMIN';
  active: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

