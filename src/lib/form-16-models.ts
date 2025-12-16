import { Timestamp } from 'firebase/firestore';

// Employee Master Data
export interface EmployeeMaster {
  id: string;
  empId: string;
  name: string;
  pan: string;
  aadhaar?: string;
  address?: string; // Employee address
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
// As per Section 17 of Income Tax Act, 1961
export interface SalaryStructure {
  employeeId: string;
  financialYear: string; // '2023-24', '2024-25'
  
  // Section 17(1) - Salary as per provisions of section 17(1)
  section17_1: {
    basic: number;
    hra: number;              // House Rent Allowance
    da: number;               // Dearness Allowance
    specialAllowance: number;
    lta: number;              // Leave Travel Allowance
    bonus: number;
    incentives: number;
    commission: number;
    overtime: number;
    otherAllowances: number;
  };
  
  // Section 17(2) - Value of perquisites under section 17(2)
  section17_2: {
    perquisites: number;      // Value of perquisites
    rentFreeAccommodation: number;
    carFacility: number;
    driverFacility: number;
    medicalReimbursement: number;
    clubFacility: number;
    otherPerquisites: number;
  };
  
  // Section 17(3) - Profits in lieu of salary under section 17(3)
  section17_3: {
    gratuity: number;         // Gratuity (taxable portion)
    commutedPension: number;  // Commuted value of pension
    leaveEncashment: number;  // Cash equivalent of leave salary encashment
    retrenchmentCompensation: number;
    otherProfits: number;
  };
  
  // Employer Contributions
  employerContributions: {
    employerPf: number;       // Employer's Contribution to PF
    employerNps: number;      // Employer's Contribution to NPS u/s 80CCD(2)
    employerSuperannuation: number;
  };
  
  // Arrears and Other
  arrears: number;
  
  // Monthly totals (for calculation)
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
  
  // Annual totals
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
// As per Section 10 of Income Tax Act, 1961
export interface ExemptionsSection10 {
  employeeId: string;
  financialYear: string;
  
  // Section 10(5) - Travel concession or assistance
  travelConcession: number;
  
  // Section 10(10) - Death-cum-retirement gratuity
  gratuityExempt: number;
  
  // Section 10(10A) - Commuted value of pension
  commutedPensionExempt: number;
  
  // Section 10(10AA) - Cash equivalent of leave salary encashment
  leaveEncashmentExempt: number;
  
  // Section 10(13A) - House rent allowance
  hraExempt: number;
  
  // Section 10(14) - Allowances
  childrenEduAllowance: number;  // Children Education Allowance
  hostelAllowance: number;       // Hostel Allowance
  transportAllowance: number;     // Transport Allowance (up to ₹1,600/month)
  medicalAllowance: number;       // Medical Allowance
  
  // Other exemptions
  ltaExempt: number;              // Leave Travel Allowance
  uniformAllowance: number;       // Uniform Allowance
  helperAllowance: number;        // Helper Allowance
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

// Chapter VI-A Deductions
// As per Chapter VI-A of Income Tax Act, 1961
export interface ChapterVIA_Deductions {
  employeeId: string;
  financialYear: string;
  
  // Section 80C - Life insurance premium, PPF, NSC, etc. (Max ₹1,50,000)
  section80C: number;
  
  // Section 80CCC - Pension funds (included in 80C limit)
  section80CCC: number;
  
  // Section 80CCD(1) - NPS employee contribution (included in 80C limit)
  section80CCD1: number;
  
  // Section 80CCD(1B) - Additional NPS self-contribution (Max ₹50,000, separate from 80C)
  section80CCD1B: number;
  
  // Section 80CCD(2) - NPS employer contribution (separate limit)
  section80CCD2: number;
  
  // Section 80D - Health insurance premium (Max varies by age)
  section80D: number;
  
  // Section 80DD - Medical treatment of dependent (Max ₹75,000/₹1,25,000)
  section80DD: number;
  
  // Section 80DDB - Medical treatment (Max ₹40,000/₹1,00,000)
  section80DDB: number;
  
  // Section 80E - Interest on education loan (No limit)
  section80E: number;
  
  // Section 80EE - Interest on home loan (Max ₹50,000)
  section80EE: number;
  
  // Section 80EEA - Interest on home loan for affordable housing (Max ₹1,50,000)
  section80EEA: number;
  
  // Section 80G - Donations (50% or 100% of donation)
  section80G: number;
  
  // Section 80GG - Rent paid (Max ₹60,000)
  section80GG: number;
  
  // Section 80GGA - Donations for scientific research (100% of donation)
  section80GGA: number;
  
  // Section 80GGC - Donations to political parties (100% of donation)
  section80GGC: number;
  
  // Section 80TTA - Interest on savings accounts (Max ₹10,000)
  section80TTA: number;
  
  // Section 80TTB - Interest on deposits for senior citizens (Max ₹50,000)
  section80TTB: number;
  
  // Other deductions
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
// As per Section 192 of Income Tax Act, 1961
export interface TDSDetails {
  employeeId: string;
  financialYear: string;
  totalTdsDeducted: number;
  relief89: number; // Relief under Section 89 (Arrear relief)
  
  // Quarterly TDS Breakdown (as required in Part A)
  quarterlyBreakup: {
    q1: {
      amount: number;
      section: string;        // Section under which tax is deducted (usually 192)
      dateOfDeduction: string; // Date of deduction (DD/MM/YYYY)
      dateOfDeposit: string;   // Date of deposit (DD/MM/YYYY)
      challanCIN?: string;     // Challan Identification Number
    };
    q2: {
      amount: number;
      section: string;
      dateOfDeduction: string;
      dateOfDeposit: string;
      challanCIN?: string;
    };
    q3: {
      amount: number;
      section: string;
      dateOfDeduction: string;
      dateOfDeposit: string;
      challanCIN?: string;
    };
    q4: {
      amount: number;
      section: string;
      dateOfDeduction: string;
      dateOfDeposit: string;
      challanCIN?: string;
    };
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Form 16 Computation Result
// Part B - Annexure: Details of salary paid and any other income and tax deducted
export interface Form16Computation {
  employeeId: string;
  financialYear: string;

  // 7. DETAILS OF SALARY PAID
  // Section 17(1) - Salary as per provisions of section 17(1)
  salarySection17_1: number;
  // Section 17(2) - Value of perquisites under section 17(2)
  perquisitesSection17_2: number;
  // Section 17(3) - Profits in lieu of salary under section 17(3)
  profitsSection17_3: number;
  // Gross Salary (Total of 17(1) + 17(2) + 17(3))
  grossSalary: number;

  // 8. DEDUCTIONS UNDER SECTION 10
  exemptionsSection10: number;
  
  // 9. INCOME UNDER THE HEAD "SALARIES" (7 - 8)
  netSalary: number;

  // 10. DEDUCTIONS UNDER SECTION 16
  deductionsSection16: number;
  
  // 11. NET SALARY (9 - 10)
  incomeFromSalary: number;

  // 12. ANY OTHER INCOME REPORTED BY THE EMPLOYEE
  otherIncome: number;
  
  // 13. GROSS TOTAL INCOME (11 + 12)
  grossTotalIncome: number;

  // 14. DEDUCTIONS UNDER CHAPTER VI-A
  deductionsChapterVIA: number;
  
  // 15. TOTAL TAXABLE INCOME (13 - 14)
  totalTaxableIncome: number;

  // 16. COMPUTATION OF TAX
  taxOnIncome: number;
  surcharge: number;              // Surcharge (if applicable)
  healthEducationCess: number;     // Health and Education Cess @ 4%
  totalTaxLiability: number;      // Total Tax Liability
  rebate87A: number;              // Rebate under section 87A (Max ₹12,500 for income <= ₹5L)
  taxAfterRebate: number;         // Tax after Rebate u/s 87A

  // 17. DETAILS OF TAX DEDUCTED AND DEPOSITED
  tdsDeducted: number;            // Total Tax Deducted
  taxDeposited: number;           // Tax Deposited in respect of Tax Deducted

  // 18. RELIEF UNDER SECTION 89
  relief89: number;               // Relief u/s 89 (Arrear relief)
  
  // Net Tax Payable/(Refund)
  taxPayable: number;             // Positive = tax due, Negative = refund

  // Regime info
  taxRegime: 'OLD' | 'NEW';
  oldRegimeTax?: number;          // For comparison
  newRegimeTax?: number;           // For comparison

  computedAt: Timestamp;
}

// Form 16 Document
// As per Rule 31(1)(a) of Income Tax Rules, 1962
export interface Form16Document {
  id: string;
  employeeId: string;
  financialYear: string;
  assessmentYear: string; // e.g., '2025-26'
  
  // Employer Details
  employerName: string;
  employerTan: string;  // Tax Deduction and Collection Account Number
  employerPan: string;  // Permanent Account Number
  employerAddress: string;
  
  // Part A (TDS Certificate)
  // Certificate for tax deducted at source from income chargeable under the head "Salaries"
  partA: {
    certificateNumber?: string;  // Certificate Number (if applicable)
    lastUpdatedOn: string;        // Last updated on (DD/MM/YYYY)
    validFrom: string;            // Valid From (DD/MM/YYYY)
    validTill: string;            // Valid Till (DD/MM/YYYY)
    
    // Employee Details
    employeeName: string;
    employeePan: string;
    employeeAddress: string;
    employeeDesignation: string;
    employeeAadhaar?: string;     // Aadhaar Number (if available)
    
    // Period of Employment
    periodFrom: string;           // Period From (DD/MM/YYYY)
    periodTo: string;             // Period To (DD/MM/YYYY)
    
    // Summary of Tax Deducted and Deposited
    totalTdsDeducted: number;
    tdsDetails: TDSDetails;
    
    // Summary details
    totalValueOfPurchase?: number; // For TDS on purchase of goods/services
    totalCollection?: number;
    totalRefund?: number;
  };

  // Part B (Annexure)
  // Details of salary paid and any other income and tax deducted
  partB: Form16Computation;

  // Signatory Details (Required for Form 16)
  signatory: {
    name: string;              // Name of the person signing
    designation: string;       // Designation of the signatory
    place: string;             // Place of signing
    date: string;              // Date of signing (DD/MM/YYYY)
  };

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
  employerName?: string;
  employerTan?: string;
  employerPan?: string;
  employerAddress?: string;
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
