/**
 * ITR Draft Generator
 * Merges data from multiple sources and generates ITR draft
 */

import type { ITRDraft } from './types';
import { calculateIncomeTax, calculateScrutinyRisk } from './tax-calculator';
import type { ParsedAIS } from './ais-parser';
import type { Parsed26AS } from './form26as-parser';

interface DraftGenerationInput {
  applicationId: string;
  financialYear: string;
  form16Data?: {
    name?: string;
    pan?: string;
    grossSalary?: number;
    tdsAmount?: number;
    allowances?: {
      houseRentAllowance?: number;
      transportAllowance?: number;
      medicalAllowance?: number;
      other?: number;
    };
    deductions?: {
      section80C?: number;
      section80D?: number;
      section80G?: number;
      section24?: number;
      other?: number;
    };
  };
  aisData?: ParsedAIS;
  form26ASData?: Parsed26AS;
  userProvidedDeductions?: {
    section80C?: number;
    section80D?: number;
    section80G?: number;
    section24?: number;
    section80E?: number;
    section80TTA?: number;
    other?: number;
  };
}

interface DraftGenerationResult {
  draft: Omit<ITRDraft, 'id' | 'createdAt' | 'updatedAt'>;
  mismatches: Array<{
    type: 'TDS' | 'AIS' | 'FORM_16' | 'OTHER';
    description: string;
    amount: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  scrutinyRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Generate ITR draft by merging all data sources
 */
export function generateITRDraft(input: DraftGenerationInput): DraftGenerationResult {
  const {
    applicationId,
    financialYear,
    form16Data,
    aisData,
    form26ASData,
    userProvidedDeductions,
  } = input;

  // Merge income from different sources
  const salaryIncome = form16Data?.grossSalary || aisData?.salaryIncome || 0;
  const interestIncome = aisData?.interestIncome || 0;
  const dividendIncome = aisData?.dividendIncome || 0;
  const businessProfession = 0; // TODO: Extract from additional documents if available
  const otherSources = aisData?.otherIncome || 0;

  const totalIncome = salaryIncome + interestIncome + dividendIncome + businessProfession + otherSources;

  // Merge deductions (prioritize user-provided, then Form 16, then defaults)
  const deductions = {
    section80C: userProvidedDeductions?.section80C || form16Data?.deductions?.section80C || 0,
    section80D: userProvidedDeductions?.section80D || form16Data?.deductions?.section80D || 0,
    section80G: userProvidedDeductions?.section80G || form16Data?.deductions?.section80G || 0,
    section24: userProvidedDeductions?.section24 || form16Data?.deductions?.section24 || 0,
    section80E: userProvidedDeductions?.section80E || 0,
    section80TTA: userProvidedDeductions?.section80TTA || 0,
    other: userProvidedDeductions?.other || form16Data?.deductions?.other || 0,
  };

  const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);

  // Merge tax data (prioritize 26AS, then Form 16, then AIS)
  const tds = form26ASData?.totalTDS || form16Data?.tdsAmount || aisData?.totalTDS || 0;
  const advanceTax = form26ASData?.totalAdvanceTax || 0;
  const selfAssessmentTax = form26ASData?.totalSelfAssessmentTax || 0;

  // Calculate tax
  const taxResult = calculateIncomeTax({
    financialYear,
    totalIncome,
    deductions,
    tds,
    advanceTax,
    selfAssessmentTax,
  });

  // Detect mismatches
  const mismatches: Array<{
    type: 'TDS' | 'AIS' | 'FORM_16' | 'OTHER';
    description: string;
    amount: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }> = [];

  // TDS mismatch between Form 16 and 26AS
  if (form16Data?.tdsAmount && form26ASData?.totalTDS) {
    const tdsDiff = Math.abs(form16Data.tdsAmount - form26ASData.totalTDS);
    if (tdsDiff > 100) {
      mismatches.push({
        type: 'TDS',
        description: `TDS mismatch: Form 16 shows ₹${form16Data.tdsAmount.toLocaleString()}, 26AS shows ₹${form26ASData.totalTDS.toLocaleString()}. Difference: ₹${tdsDiff.toLocaleString()}`,
        amount: tdsDiff,
        severity: tdsDiff > 10000 ? 'HIGH' : tdsDiff > 1000 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  // TDS mismatch between AIS and 26AS
  if (aisData?.totalTDS && form26ASData?.totalTDS) {
    const tdsDiff = Math.abs(aisData.totalTDS - form26ASData.totalTDS);
    if (tdsDiff > 100) {
      mismatches.push({
        type: 'TDS',
        description: `TDS mismatch: AIS shows ₹${aisData.totalTDS.toLocaleString()}, 26AS shows ₹${form26ASData.totalTDS.toLocaleString()}. Difference: ₹${tdsDiff.toLocaleString()}`,
        amount: tdsDiff,
        severity: tdsDiff > 10000 ? 'HIGH' : tdsDiff > 1000 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  // Salary mismatch between Form 16 and AIS
  if (form16Data?.grossSalary && aisData?.salaryIncome) {
    const salaryDiff = Math.abs(form16Data.grossSalary - aisData.salaryIncome);
    if (salaryDiff > 1000) {
      mismatches.push({
        type: 'AIS',
        description: `Salary mismatch: Form 16 shows ₹${form16Data.grossSalary.toLocaleString()}, AIS shows ₹${aisData.salaryIncome.toLocaleString()}. Difference: ₹${salaryDiff.toLocaleString()}`,
        amount: salaryDiff,
        severity: salaryDiff > 50000 ? 'HIGH' : salaryDiff > 10000 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  // Calculate scrutiny risk
  const deductionsPercentage = totalIncome > 0 ? (totalDeductions / totalIncome) * 100 : 0;
  const scrutinyRisk = calculateScrutinyRisk({
    income: totalIncome,
    refund: taxResult.refund,
    mismatches: mismatches.length,
    deductions: totalDeductions,
    deductionsPercentage,
  });

  // Generate draft
  const draft: Omit<ITRDraft, 'id' | 'createdAt' | 'updatedAt'> = {
    applicationId,
    financialYear,
    income: {
      salary: salaryIncome,
      houseProperty: 0, // TODO: Extract from additional documents
      capitalGains: 0, // TODO: Extract from additional documents
      businessProfession,
      otherSources,
      totalIncome,
    },
    deductions: {
      section80C: deductions.section80C,
      section80D: deductions.section80D,
      section80G: deductions.section80G,
      section24: deductions.section24,
      section80E: deductions.section80E,
      section80TTA: deductions.section80TTA,
      other: deductions.other,
      totalDeductions,
    },
    tax: {
      totalTax: taxResult.totalTax,
      tds,
      advanceTax,
      selfAssessmentTax,
      refund: taxResult.refund,
      payable: taxResult.payable,
    },
    mismatches,
    comments: [],
    status: 'DRAFT',
  };

  return {
    draft,
    mismatches,
    scrutinyRisk,
  };
}

