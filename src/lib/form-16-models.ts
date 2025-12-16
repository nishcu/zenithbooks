import { Timestamp } from 'firebase/firestore';

// Employee Master Data
export interface EmployeeMaster {
  id: string;
  empId: string;
  name: string;
  pan: string;
  aadhaar?: string;
  designation: string;
  doj: Date;
  employmentType: 'permanent' | 'contract' | 'probation';
  residentialStatus: 'resident' | 'non-resident' | 'resident-but-not-ordinarily-resident';
  taxRegime: 'OLD' | 'NEW';
  employerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Monthly/Annual Salary Structure
export interface SalaryStructure {
  employeeId: string;
  financialYear: string; // '2023-24', '2024-25'
  monthly: {
    basic: number;
    hra: number;
    da: number;
    specialAllowance: number;
    lta: number;
    bonus: number;
    incentives: number;
    arrears: number;
    perquisites: number;
    employerPf: number;
  };
  annual: {
    basic: number;
    hra: number;
    da: number;
    specialAllowance: number;
    lta: number;
    bonus: number;
    incentives: number;
    arrears: number;
    perquisites: number;
    employerPf: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Section 10 Exemptions
export interface ExemptionsSection10 {
  employeeId: string;
  financialYear: string;
  hraExempt: number;
  ltaExempt: number;
  childrenEduAllowance: number;
  hostelAllowance: number;
  otherExemptions?: { [key: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Section 16 Deductions
export interface Section16Deductions {
  employeeId: string;
  financialYear: string;
  standardDeduction: number; // Always 50000 for FY 2023-24 onwards
  professionalTax: number;
  entertainmentAllowance: number;
  otherDeductions?: { [key: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Chapter VI-A Deductions (80C, 80D, etc.)
export interface ChapterVIA_Deductions {
  employeeId: string;
  financialYear: string;
  section80C: number; // Max 150,000
  section80CCD1B: number; // Max 50,000
  section80D: number; // Health Insurance
  section80TTA: number; // Savings Interest
  section80G: number; // Donations
  otherDeductions?: { [key: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Other Income
export interface OtherIncome {
  employeeId: string;
  financialYear: string;
  savingsInterest: number;
  fdInterest: number;
  otherIncome: number;
  otherIncomeDetails?: { [key: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// TDS Details
export interface TDSDetails {
  employeeId: string;
  financialYear: string;
  totalTdsDeducted: number;
  relief89: number; // Arrear relief
  quarterlyBreakup?: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Form 16 Computation Result
export interface Form16Computation {
  employeeId: string;
  financialYear: string;

  // Step-by-step computation
  grossSalary: number;
  exemptionsSection10: number;
  netSalary: number;
  deductionsSection16: number;
  incomeFromSalary: number;
  otherIncome: number;
  grossTotalIncome: number;
  deductionsChapterVIA: number;
  totalTaxableIncome: number;

  // Tax Calculation
  taxOnIncome: number;
  rebate87A: number; // Max 12,500 for income <= 5L
  taxAfterRebate: number;
  healthEducationCess: number; // 4%
  totalTaxLiability: number;

  // Final
  relief89: number;
  tdsDeducted: number;
  taxPayable: number; // Positive = tax due, Negative = refund

  // Regime info
  taxRegime: 'OLD' | 'NEW';
  oldRegimeTax?: number; // For comparison
  newRegimeTax?: number;

  computedAt: Timestamp;
}

// Form 16 Document
export interface Form16Document {
  id: string;
  employeeId: string;
  financialYear: string;
  employerName: string;
  employerTan: string;
  employerPan?: string;
  assessmentYear: string;

  // Part A (TDS Certificate)
  partA: {
    employeeName: string;
    employeePan: string;
    employeeDesignation: string;
    totalTdsDeducted: number;
    tdsDetails: TDSDetails;
  };

  // Part B (Annexure)
  partB: Form16Computation;

  // Metadata
  generatedBy: string; // User ID
  generatedAt: Timestamp;
  version: number;
  status: 'draft' | 'generated' | 'reviewed' | 'finalized';
  reviewedBy?: string; // CA User ID
  reviewedAt?: Timestamp;

  // Document URLs (for vault integration)
  pdfUrl?: string;
  encryptedPdfUrl?: string;
  shareCode?: string;
  accessLogs: Array<{
    accessedBy: string;
    accessedAt: Timestamp;
    action: 'viewed' | 'downloaded' | 'shared';
  }>;
}

// Tax Regime Configuration
export interface TaxRegimeConfig {
  financialYear: string;
  oldRegime: {
    slabs: Array<{
      min: number;
      max: number | null;
      rate: number;
    }>;
    cess: number; // 4%
    surcharge: Array<{
      min: number;
      max: number | null;
      rate: number;
    }>;
  };
  newRegime: {
    slabs: Array<{
      min: number;
      max: number | null;
      rate: number;
    }>;
    cess: number; // 4%
    surcharge: Array<{
      min: number;
      max: number | null;
      rate: number;
    }>;
  };
  rebate87A: {
    maxAmount: number; // 12,500
    incomeLimit: number; // 5,00,000
  };
}

// Validation Rules
export interface ValidationRules {
  pan: {
    pattern: RegExp;
    message: string;
  };
  limits: {
    section80C: number;
    section80CCD1B: number;
    standardDeduction: number;
    rebate87A: number;
  };
}

// API Request/Response Types
export interface Form16Request {
  employeeId: string;
  financialYear: string;
  overrideData?: {
    salaryStructure?: Partial<SalaryStructure>;
    exemptions?: Partial<ExemptionsSection10>;
    deductions80?: Partial<ChapterVIA_Deductions>;
    otherIncome?: Partial<OtherIncome>;
    tdsDetails?: Partial<TDSDetails>;
  };
}

export interface Form16Response {
  success: boolean;
  data?: {
    document: Form16Document;
    computation: Form16Computation;
    pdfUrl?: string;
  };
  errors?: string[];
}
