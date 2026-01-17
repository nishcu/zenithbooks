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

export function generateAssociateCode(index: number): string {
  // Format: AS-001, AS-002, etc.
  return `AS-${String(index).padStart(3, '0')}`;
}

