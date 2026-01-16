/**
 * Tax Calculation Engine for ITR
 * Calculates income tax based on Indian Income Tax Act rules
 */

interface TaxInput {
  financialYear: string; // Format: "2023-24"
  totalIncome: number;
  deductions: {
    section80C?: number;
    section80D?: number;
    section80G?: number;
    section24?: number; // Home loan interest
    section80E?: number; // Education loan
    section80TTA?: number; // Savings interest
    section80TTB?: number; // Senior citizen savings interest
    section80GG?: number; // Rent paid (if HRA not received)
    other?: number;
  };
  tds: number;
  advanceTax: number;
  selfAssessmentTax: number;
}

interface TaxOutput {
  totalIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  totalTax: number;
  taxBreakdown: {
    basicRate?: number;
    surcharge?: number;
    cess?: number; // Health and Education Cess (4% of tax + surcharge)
  };
  tds: number;
  advanceTax: number;
  selfAssessmentTax: number;
  totalTaxPaid: number;
  refund: number;
  payable: number;
  taxSlabs: Array<{
    from: number;
    to: number;
    rate: number;
    amount: number;
  }>;
}

/**
 * Get tax slabs for a financial year
 */
function getTaxSlabs(financialYear: string): Array<{ from: number; to: number; rate: number }> {
  // Tax slabs for FY 2023-24 and 2024-25 (same)
  // For individuals below 60 years
  const currentYear = parseInt(financialYear.split('-')[0]);
  
  if (currentYear >= 2023) {
    return [
      { from: 0, to: 250000, rate: 0 },
      { from: 250001, to: 500000, rate: 5 },
      { from: 500001, to: 1000000, rate: 20 },
      { from: 1000001, to: Infinity, rate: 30 },
    ];
  }
  
  // Fallback for older years
  return [
    { from: 0, to: 250000, rate: 0 },
    { from: 250001, to: 500000, rate: 5 },
    { from: 500001, to: 1000000, rate: 20 },
    { from: 1000001, to: Infinity, rate: 30 },
  ];
}

/**
 * Calculate income tax
 */
export function calculateIncomeTax(input: TaxInput): TaxOutput {
  const { financialYear, totalIncome, deductions, tds, advanceTax, selfAssessmentTax } = input;

  // Calculate total deductions
  const totalDeductions = 
    (deductions.section80C || 0) +
    (deductions.section80D || 0) +
    (deductions.section80G || 0) +
    (deductions.section24 || 0) +
    (deductions.section80E || 0) +
    (deductions.section80TTA || 0) +
    (deductions.section80TTB || 0) +
    (deductions.section80GG || 0) +
    (deductions.other || 0);

  // Calculate taxable income
  const taxableIncome = Math.max(0, totalIncome - totalDeductions);

  // Get tax slabs
  const slabs = getTaxSlabs(financialYear);

  // Calculate tax based on slabs
  let totalTax = 0;
  const taxSlabs: Array<{ from: number; to: number; rate: number; amount: number }> = [];
  let remainingIncome = taxableIncome;

  for (const slab of slabs) {
    if (remainingIncome <= 0) break;

    const taxableInSlab = Math.min(remainingIncome, slab.to === Infinity ? remainingIncome : slab.to - slab.from + 1);
    const taxInSlab = (taxableInSlab * slab.rate) / 100;

    if (taxInSlab > 0) {
      taxSlabs.push({
        from: slab.from,
        to: slab.to === Infinity ? remainingIncome : slab.to,
        rate: slab.rate,
        amount: taxInSlab,
      });
    }

    totalTax += taxInSlab;
    remainingIncome -= taxableInSlab;

    if (slab.to === Infinity) break;
  }

  // Calculate surcharge (if applicable)
  let surcharge = 0;
  if (taxableIncome > 5000000) {
    // Surcharge of 10% for income > 50 lakhs
    surcharge = totalTax * 0.10;
  } else if (taxableIncome > 10000000) {
    // Surcharge of 15% for income > 1 crore
    surcharge = totalTax * 0.15;
  } else if (taxableIncome > 20000000) {
    // Surcharge of 25% for income > 2 crores
    surcharge = totalTax * 0.25;
  } else if (taxableIncome > 50000000) {
    // Surcharge of 37% for income > 5 crores
    surcharge = totalTax * 0.37;
  }

  // Calculate Health and Education Cess (4% of tax + surcharge)
  const cess = (totalTax + surcharge) * 0.04;

  // Total tax including surcharge and cess
  const finalTax = totalTax + surcharge + cess;

  // Calculate total tax paid
  const totalTaxPaid = tds + advanceTax + selfAssessmentTax;

  // Calculate refund or payable
  const refund = Math.max(0, totalTaxPaid - finalTax);
  const payable = Math.max(0, finalTax - totalTaxPaid);

  return {
    totalIncome,
    totalDeductions,
    taxableIncome,
    totalTax: finalTax,
    taxBreakdown: {
      basicRate: totalTax,
      surcharge: surcharge > 0 ? surcharge : undefined,
      cess,
    },
    tds,
    advanceTax,
    selfAssessmentTax,
    totalTaxPaid,
    refund,
    payable,
    taxSlabs,
  };
}

/**
 * Calculate scrutiny risk score based on various factors
 */
export function calculateScrutinyRisk(input: {
  income: number;
  refund: number;
  mismatches: number;
  deductions: number;
  deductionsPercentage: number; // Deductions as % of income
}): 'LOW' | 'MEDIUM' | 'HIGH' {
  let riskScore = 0;

  // High refund increases risk
  if (input.refund > 50000) riskScore += 2;
  else if (input.refund > 25000) riskScore += 1;

  // High deductions percentage increases risk
  if (input.deductionsPercentage > 40) riskScore += 3;
  else if (input.deductionsPercentage > 30) riskScore += 2;
  else if (input.deductionsPercentage > 20) riskScore += 1;

  // Mismatches increase risk
  if (input.mismatches > 3) riskScore += 3;
  else if (input.mismatches > 1) riskScore += 2;
  else if (input.mismatches === 1) riskScore += 1;

  // Very high income with low deductions can also be risky
  if (input.income > 10000000 && input.deductions < input.income * 0.1) {
    riskScore += 1;
  }

  if (riskScore >= 6) return 'HIGH';
  if (riskScore >= 3) return 'MEDIUM';
  return 'LOW';
}

