/**
 * Document Vault Constants
 * Categories and configuration for Document Vault feature
 */

export const VAULT_CATEGORIES = {
  INCOME_TAX: "Income Tax",
  GST: "GST",
  MCA: "MCA",
  REGISTRATIONS: "Registrations & Licenses",
  POLICIES: "Policies & Insurance",
  PERSONAL: "Personal Documents",
  BANKING: "Banking & Financial",
  LEGAL: "Legal Documents",
  PROPERTY: "Property & Real Estate",
  COMPLIANCE: "Compliance & Certifications",
  CONTRACTS: "Contracts & Agreements",
  FINANCIAL_STATEMENTS: "Financial Statements & Reports",
  PAYROLL: "Payroll & HR",
  OTHERS: "Others",
} as const;

export type VaultCategory = typeof VAULT_CATEGORIES[keyof typeof VAULT_CATEGORIES];

export const VAULT_CATEGORIES_LIST: Array<{
  value: VaultCategory;
  label: string;
  description: string;
  icon?: string;
}> = [
  {
    value: VAULT_CATEGORIES.INCOME_TAX,
    label: "Income Tax",
    description: "ITR, Form 16, Form 26AS, Tax Assessment Orders, Tax Refunds, Tax Audit Reports",
  },
  {
    value: VAULT_CATEGORIES.GST,
    label: "GST",
    description: "GST Registration, GSTR-1, GSTR-3B, GSTR-9, GSTR-9C, GST Notices, E-Way Bills",
  },
  {
    value: VAULT_CATEGORIES.MCA,
    label: "MCA",
    description: "Incorporation Certificate, MOA, AOA, Board Resolutions, Annual Returns, ROC Filings",
  },
  {
    value: VAULT_CATEGORIES.REGISTRATIONS,
    label: "Registrations & Licenses",
    description: "PAN, Aadhaar, UDYAM, Trade License, Shop & Establishment, IEC, Professional Tax",
  },
  {
    value: VAULT_CATEGORIES.POLICIES,
    label: "Policies & Insurance",
    description: "Life Insurance, Health Insurance, Vehicle Insurance, Property Insurance, Business Insurance",
  },
  {
    value: VAULT_CATEGORIES.PERSONAL,
    label: "Personal Documents",
    description: "School/College Fees, RC, Driving License, Passport, Birth Certificate, Educational Certificates",
  },
  {
    value: VAULT_CATEGORIES.BANKING,
    label: "Banking & Financial",
    description: "Bank Statements, FD/RD Certificates, Loan Documents, CIBIL Reports, Investment Statements",
  },
  {
    value: VAULT_CATEGORIES.LEGAL,
    label: "Legal Documents",
    description: "Partnership Deed, Service Agreement, Rental Agreement, NDA, Employment Contracts",
  },
  {
    value: VAULT_CATEGORIES.PROPERTY,
    label: "Property & Real Estate",
    description: "Sale Deed, Purchase Agreement, Registration Documents, Property Tax, Valuation Reports",
  },
  {
    value: VAULT_CATEGORIES.COMPLIANCE,
    label: "Compliance & Certifications",
    description: "ISO Certificates, Quality Certifications, Environmental Clearances, Fire Safety",
  },
  {
    value: VAULT_CATEGORIES.CONTRACTS,
    label: "Contracts & Agreements",
    description: "Service Contracts, Vendor Contracts, Client Agreements, Franchise Agreements",
  },
  {
    value: VAULT_CATEGORIES.FINANCIAL_STATEMENTS,
    label: "Financial Statements & Reports",
    description: "Balance Sheet, P&L Statement, Cash Flow, CMA Report, Audit Reports",
  },
  {
    value: VAULT_CATEGORIES.PAYROLL,
    label: "Payroll & HR",
    description: "Salary Slips, Form 16 (Employee), Appointment Letters, Offer Letters, Experience Certificates",
  },
  {
    value: VAULT_CATEGORIES.OTHERS,
    label: "Others",
    description: "Miscellaneous documents that don't fit other categories",
  },
];

// File upload limits
export const VAULT_FILE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB in bytes
  MAX_STORAGE_PER_USER: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
} as const;

// Share code settings
export const VAULT_SHARE_CODE = {
  MIN_LENGTH: 8,
  EXPIRY_DAYS: 5,
  REQUIRES_ALPHANUMERIC: true,
} as const;

// Storage paths
export const VAULT_STORAGE_PATHS = {
  ROOT: 'vault',
  getCategoryPath: (userId: string, category: string, documentId: string, version: number) => 
    `${VAULT_STORAGE_PATHS.ROOT}/${userId}/${category.toLowerCase().replace(/\s+/g, '-')}/${documentId}/v${version}`,
  getDocumentPath: (userId: string, category: string, documentId: string) =>
    `${VAULT_STORAGE_PATHS.ROOT}/${userId}/${category.toLowerCase().replace(/\s+/g, '-')}/${documentId}`,
} as const;

