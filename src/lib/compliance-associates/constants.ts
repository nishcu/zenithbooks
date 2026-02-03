/**
 * Compliance Associates - Constants
 */

export const PLATFORM_FEE_ANNUAL = 999; // ₹999 per annum

export const ASSOCIATE_QUALIFICATIONS = [
  { value: 'CA', label: 'Chartered Accountant (CA)' },
  { value: 'CS', label: 'Company Secretary (CS)' },
  { value: 'CMA', label: 'Cost and Management Accountant (CMA)' },
  { value: 'Graduate', label: 'Graduate (Commerce/Law)' },
  { value: 'Other', label: 'Other' },
] as const;

export const ASSOCIATE_SPECIALIZATIONS = [
  { id: 'gst', label: 'GST Filing & Compliance' },
  { id: 'tds', label: 'TDS Returns' },
  { id: 'payroll', label: 'Payroll Processing' },
  { id: 'incorporation', label: 'Company/LLP Incorporation' },
  { id: 'mca', label: 'MCA Compliances' },
  { id: 'itr', label: 'Income Tax Returns' },
  { id: 'audit', label: 'Statutory Audit' },
  { id: 'accounting', label: 'Bookkeeping & Accounting' },
] as const;

/** Corporate Mitra levels (CM-L1 to CM-L4) */
export const CORPORATE_MITRA_LEVELS = ['CM-L1', 'CM-L2', 'CM-L3', 'CM-L4'] as const;

/** Level upgrade: CM-L2 = 30+ tasks, score ≥ 65; CM-L3 = 100+ tasks, score ≥ 80; CM-L4 = admin only */
export const LEVEL_UP_CONDITIONS: Record<string, { minTasks: number; minScore: number; adminOnly?: boolean }> = {
  'CM-L1': { minTasks: 0, minScore: 0 },
  'CM-L2': { minTasks: 30, minScore: 65 },
  'CM-L3': { minTasks: 100, minScore: 80 },
  'CM-L4': { minTasks: Infinity, minScore: 100, adminOnly: true },
};

/** Certification key required for task (by taskId or category) */
export const TASK_CERTIFICATION_MAP: Record<string, 'gstBasics' | 'msmeCompliance' | 'payrollBasics' | 'mcaBasics'> = {
  gst: 'gstBasics', gstr1_filing: 'gstBasics', gstr3b_filing: 'gstBasics', gst_reconciliation: 'gstBasics',
  msme: 'msmeCompliance', MSME_REGISTRATION: 'msmeCompliance', MSME_STATUS_CHECK: 'msmeCompliance',
  TReDS_ONBOARDING_PREP: 'msmeCompliance', LOAN_READINESS_REPORT: 'msmeCompliance',
  GOVT_SCHEME_ELIGIBILITY: 'msmeCompliance', BASIC_MIS_REPORT: 'msmeCompliance',
  payroll: 'payrollBasics', payroll_processing: 'payrollBasics', pf_esi_computation: 'payrollBasics', payroll_reports: 'payrollBasics',
  mca: 'mcaBasics', mca_compliance_tracking: 'mcaBasics', annual_roc_filings: 'mcaBasics', event_based_mca: 'mcaBasics', director_kyc: 'mcaBasics',
};

/** MSME Enablement task type IDs (non-filing) */
export const MSME_TASK_TYPE_IDS = [
  'MSME_REGISTRATION', 'MSME_STATUS_CHECK', 'TReDS_ONBOARDING_PREP',
  'LOAN_READINESS_REPORT', 'GOVT_SCHEME_ELIGIBILITY', 'BASIC_MIS_REPORT',
] as const;

export function generateAssociateCode(index: number): string {
  return `AS-${String(index).padStart(3, '0')}`;
}

