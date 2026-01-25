/**
 * Tax Rules Engine
 * Implements tax logic for each loan type per Indian Income Tax Act
 */

import type {
  LoanInput,
  TaxComputation,
  HousingLoanTax,
  EducationLoanTax,
  BusinessLoanTax,
  OverdraftLoanTax,
  VehicleLoanTax,
  YearlyAmortization,
} from "./types";
import { TAX_LIMITS, OLD_REGIME_SLABS, NEW_REGIME_SLABS, SURCHARGE_BANDS, CESS_RATE } from "./constants";

/**
 * Calculate tax saved based on deduction and tax regime
 */
export function calculateTaxSaved(
  deduction: number,
  taxableIncome: number,
  regime: "old_regime" | "new_regime"
): number {
  if (deduction === 0) return 0;

  const slabs = regime === "old_regime" ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  let tax = 0;
  let remaining = taxableIncome;

  // Calculate base tax
  for (const slab of slabs) {
    if (remaining <= 0) break;
    const width = slab.to === Infinity ? remaining : slab.to - slab.from + 1;
    const inSlab = Math.min(remaining, width);
    tax += (inSlab * slab.rate) / 100;
    remaining -= inSlab;
    if (slab.to === Infinity) break;
  }

  // Calculate tax with deduction
  let taxWithDeduction = 0;
  remaining = Math.max(0, taxableIncome - deduction);

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const width = slab.to === Infinity ? remaining : slab.to - slab.from + 1;
    const inSlab = Math.min(remaining, width);
    taxWithDeduction += (inSlab * slab.rate) / 100;
    remaining -= inSlab;
    if (slab.to === Infinity) break;
  }

  // Add surcharge
  const surchargeRate = getSurchargeRate(taxableIncome);
  tax += tax * surchargeRate;
  taxWithDeduction += taxWithDeduction * surchargeRate;

  // Add cess
  tax += tax * (CESS_RATE / 100);
  taxWithDeduction += taxWithDeduction * (CESS_RATE / 100);

  return Math.max(0, tax - taxWithDeduction);
}

/**
 * Get surcharge rate based on income
 */
function getSurchargeRate(income: number): number {
  for (const band of SURCHARGE_BANDS) {
    if (income >= band.minIncome && income <= band.maxIncome) {
      return band.rate / 100;
    }
  }
  return 0;
}

/**
 * Calculate effective tax rate for a given income
 */
export function getEffectiveTaxRate(
  taxableIncome: number,
  regime: "old_regime" | "new_regime"
): number {
  if (taxableIncome <= 0) return 0;

  const slabs = regime === "old_regime" ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  let tax = 0;
  let remaining = taxableIncome;

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const width = slab.to === Infinity ? remaining : slab.to - slab.from + 1;
    const inSlab = Math.min(remaining, width);
    tax += (inSlab * slab.rate) / 100;
    remaining -= inSlab;
    if (slab.to === Infinity) break;
  }

  const surchargeRate = getSurchargeRate(taxableIncome);
  tax += tax * surchargeRate;
  tax += tax * (CESS_RATE / 100);

  return (tax / taxableIncome) * 100;
}

/**
 * Calculate housing loan tax benefits
 */
export function calculateHousingLoanTax(
  input: LoanInput,
  yearlySchedule: YearlyAmortization[]
): HousingLoanTax {
  const warnings: string[] = [];
  const notes: string[] = [];

  let totalInterestDeduction = 0;
  let totalPrincipalDeduction = 0;
  let totalTaxSaved = 0;

  const isSelfOccupied = input.propertyType === "self_occupied";

  for (const year of yearlySchedule) {
    const interestDeduction = Math.min(
      year.totalInterest,
      isSelfOccupied ? TAX_LIMITS.HOUSING_INTEREST_SELF_OCCUPIED : year.totalInterest
    );
    const principalDeduction = Math.min(
      year.totalPrincipal,
      TAX_LIMITS.HOUSING_PRINCIPAL_80C
    );

    if (year.totalInterest > TAX_LIMITS.HOUSING_INTEREST_SELF_OCCUPIED && isSelfOccupied) {
      warnings.push(
        `FY ${year.financialYear}: Interest deduction capped at ₹${TAX_LIMITS.HOUSING_INTEREST_SELF_OCCUPIED.toLocaleString()} (Section 24(b))`
      );
    }

    if (year.totalPrincipal > TAX_LIMITS.HOUSING_PRINCIPAL_80C) {
      warnings.push(
        `FY ${year.financialYear}: Principal deduction capped at ₹${TAX_LIMITS.HOUSING_PRINCIPAL_80C.toLocaleString()} (Section 80C)`
      );
    }

    const taxSaved = calculateTaxSaved(
      interestDeduction + principalDeduction,
      1000000, // Assuming taxable income for calculation
      input.taxRegime
    );

    totalInterestDeduction += interestDeduction;
    totalPrincipalDeduction += principalDeduction;
    totalTaxSaved += taxSaved;
  }

  // Joint loan split
  let jointLoanSplit;
  if (input.jointLoan && input.coBorrowerShare) {
    const borrowerShare = 100 - input.coBorrowerShare;
    jointLoanSplit = {
      borrowerShare: (totalTaxSaved * borrowerShare) / 100,
      coBorrowerShare: (totalTaxSaved * input.coBorrowerShare) / 100,
    };
    notes.push(
      `Joint loan: Your share (${borrowerShare}%) = ₹${jointLoanSplit.borrowerShare.toLocaleString()} tax saved`
    );
  }

  // Prepayment impact
  let prepaymentImpact;
  if (input.prepaymentAmount && input.prepaymentDate) {
    // Simplified: estimate interest saved
    const interestSaved = input.prepaymentAmount * (input.interestRate / 100) * 0.5; // Rough estimate
    prepaymentImpact = {
      interestSaved,
      taxImpact: calculateTaxSaved(interestSaved, 1000000, input.taxRegime),
    };
    notes.push(
      `Prepayment of ₹${input.prepaymentAmount.toLocaleString()} saves ~₹${interestSaved.toLocaleString()} in interest`
    );
  }

  const effectiveRate =
    input.interestRate -
    (totalTaxSaved / (input.loanAmount * (input.tenureUnit === "years" ? input.tenure : input.tenure / 12))) *
      100;

  return {
    deductibleInterest: totalInterestDeduction,
    deductiblePrincipal: totalPrincipalDeduction,
    taxDeductionSection: "24(b) & 80C",
    taxSaved: totalTaxSaved,
    effectiveInterestRate: Math.max(0, effectiveRate),
    postTaxEMI: 0, // Will be calculated in orchestrator
    interestDeduction24b: totalInterestDeduction,
    principalDeduction80C: totalPrincipalDeduction,
    interestDeductionCapped: totalInterestDeduction < yearlySchedule.reduce((sum, y) => sum + y.totalInterest, 0),
    principalDeductionCapped: totalPrincipalDeduction < yearlySchedule.reduce((sum, y) => sum + y.totalPrincipal, 0),
    jointLoanSplit,
    prepaymentImpact,
    warnings,
    notes,
  };
}

/**
 * Calculate education loan tax benefits
 */
export function calculateEducationLoanTax(
  input: LoanInput,
  yearlySchedule: YearlyAmortization[]
): EducationLoanTax {
  const warnings: string[] = [];
  const notes: string[] = [];

  const startYear = input.educationLoanStartYear || new Date(input.loanStartDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsUsed = Math.min(currentYear - startYear, TAX_LIMITS.EDUCATION_INTEREST_MAX_YEARS);
  const eligibleYearsRemaining = Math.max(0, TAX_LIMITS.EDUCATION_INTEREST_MAX_YEARS - yearsUsed);

  if (eligibleYearsRemaining === 0) {
    warnings.push(
      `Section 80E deduction exhausted. Maximum ${TAX_LIMITS.EDUCATION_INTEREST_MAX_YEARS} years allowed.`
    );
  }

  let totalInterestDeduction = 0;
  let totalTaxSaved = 0;
  const yearWiseDeduction: Array<{
    year: number;
    interest: number;
    deduction: number;
    taxSaved: number;
  }> = [];

  yearlySchedule.forEach((year, index) => {
    if (index < TAX_LIMITS.EDUCATION_INTEREST_MAX_YEARS) {
      const deduction = year.totalInterest; // No limit for education loan interest
      const taxSaved = calculateTaxSaved(deduction, 1000000, input.taxRegime);

      totalInterestDeduction += deduction;
      totalTaxSaved += taxSaved;

      yearWiseDeduction.push({
        year: startYear + index,
        interest: year.totalInterest,
        deduction,
        taxSaved,
      });
    }
  });

  const effectiveRate =
    input.interestRate -
    (totalTaxSaved / (input.loanAmount * (input.tenureUnit === "years" ? input.tenure : input.tenure / 12))) *
      100;

  notes.push(
    `Section 80E: Interest deduction allowed for ${TAX_LIMITS.EDUCATION_INTEREST_MAX_YEARS} consecutive years from loan start.`
  );

  return {
    deductibleInterest: totalInterestDeduction,
    taxDeductionSection: "80E",
    taxSaved: totalTaxSaved,
    effectiveInterestRate: Math.max(0, effectiveRate),
    postTaxEMI: 0,
    eligibleYearsRemaining,
    yearsUsed,
    maxEligibleYears: TAX_LIMITS.EDUCATION_INTEREST_MAX_YEARS,
    yearWiseDeduction,
    warnings,
    notes,
  };
}

/**
 * Calculate business loan tax benefits
 */
export function calculateBusinessLoanTax(
  input: LoanInput,
  yearlySchedule: YearlyAmortization[]
): BusinessLoanTax {
  const effectiveTaxRate = input.marginalTaxSlab
    ? input.marginalTaxSlab / 100
    : getEffectiveTaxRate(1000000, input.taxRegime) / 100;

  let totalInterest = 0;
  let totalTaxSaved = 0;

  yearlySchedule.forEach((year) => {
    totalInterest += year.totalInterest;
    const taxSaved = year.totalInterest * effectiveTaxRate;
    totalTaxSaved += taxSaved;
  });

  const effectivePostTaxInterestRate = input.interestRate * (1 - effectiveTaxRate);
  const cashFlowImpact = totalTaxSaved;

  return {
    interestAsExpense: totalInterest,
    reductionInTaxableProfit: totalInterest,
    taxSaved: totalTaxSaved,
    effectivePostTaxInterestRate,
    cashFlowImpact,
    effectiveInterestRate: effectivePostTaxInterestRate,
    postTaxEMI: 0,
    notes: [
      `Interest treated as business expense. Tax saved at ${(effectiveTaxRate * 100).toFixed(1)}% marginal rate.`,
    ],
  };
}

/**
 * Calculate overdraft/CC loan tax benefits
 */
export function calculateOverdraftLoanTax(
  input: LoanInput,
  yearlySchedule: YearlyAmortization[]
): OverdraftLoanTax {
  const averageUtilisation = input.averageUtilisation || 100;
  const effectiveTaxRate = input.marginalTaxSlab
    ? input.marginalTaxSlab / 100
    : getEffectiveTaxRate(1000000, input.taxRegime) / 100;

  let totalInterest = 0;
  yearlySchedule.forEach((year) => {
    totalInterest += year.totalInterest;
  });

  const interestOnUtilised = (totalInterest * averageUtilisation) / 100;
  const interestSavedDueToLowerUtilisation = totalInterest - interestOnUtilised;
  const taxSaved = interestOnUtilised * effectiveTaxRate;
  const taxAdjustedCostOfFunds = input.interestRate * (1 - effectiveTaxRate) * (averageUtilisation / 100);

  return {
    interestAsExpense: interestOnUtilised,
    taxSaved,
    effectiveInterestRate: taxAdjustedCostOfFunds,
    postTaxEMI: 0,
    averageUtilisation,
    interestOnUtilised,
    interestSavedDueToLowerUtilisation,
    taxAdjustedCostOfFunds,
    notes: [
      `Average utilisation: ${averageUtilisation}%. Interest calculated on utilised amount only.`,
    ],
  };
}

/**
 * Calculate vehicle loan tax benefits
 */
export function calculateVehicleLoanTax(
  input: LoanInput,
  yearlySchedule: YearlyAmortization[]
): VehicleLoanTax {
  const isBusinessUse = input.vehicleUsage === "business";
  const warnings: string[] = [];
  const notes: string[] = [];

  if (!isBusinessUse) {
    warnings.push("Personal vehicle: No tax benefits available.");
    return {
      businessUse: false,
      taxSaved: 0,
      effectiveInterestRate: input.interestRate,
      postTaxEMI: 0,
      warnings,
      notes: ["Personal vehicle loans have no tax deductions."],
    };
  }

  const effectiveTaxRate = input.marginalTaxSlab
    ? input.marginalTaxSlab / 100
    : getEffectiveTaxRate(1000000, input.taxRegime) / 100;

  let totalInterest = 0;
  yearlySchedule.forEach((year) => {
    totalInterest += year.totalInterest;
  });

  const interestAsExpense = totalInterest;
  const taxSaved = interestAsExpense * effectiveTaxRate;

  // Depreciation benefit (simplified: 15% WDV for commercial vehicle)
  const depreciationBenefit = input.vehicleCost
    ? input.vehicleCost * 0.15 * effectiveTaxRate // First year depreciation
    : 0;

  const effectiveRate = input.interestRate * (1 - effectiveTaxRate);

  notes.push(
    `Business vehicle: Interest deductible as business expense. Depreciation benefit available on asset cost.`
  );

  return {
    businessUse: true,
    interestAsExpense,
    depreciationBenefit,
    taxSaved: taxSaved + depreciationBenefit,
    effectiveInterestRate: effectiveRate,
    postTaxEMI: 0,
    warnings,
    notes,
  };
}

/**
 * Calculate personal loan tax (no benefits)
 */
export function calculatePersonalLoanTax(): TaxComputation {
  return {
    taxSaved: 0,
    effectiveInterestRate: 0, // Will use original rate
    postTaxEMI: 0,
    warnings: [],
    notes: [
      "Personal loans have no tax deductions under Indian Income Tax Act.",
      "Consider investing the EMI amount instead for better returns.",
    ],
  };
}

/**
 * Main tax computation router
 */
export function calculateTaxComputation(
  input: LoanInput,
  yearlySchedule: YearlyAmortization[]
): TaxComputation {
  switch (input.loanType) {
    case "housing_loan":
      return calculateHousingLoanTax(input, yearlySchedule);
    case "education_loan":
      return calculateEducationLoanTax(input, yearlySchedule);
    case "business_loan":
      return calculateBusinessLoanTax(input, yearlySchedule);
    case "overdraft_loan":
      return calculateOverdraftLoanTax(input, yearlySchedule);
    case "vehicle_loan":
      return calculateVehicleLoanTax(input, yearlySchedule);
    case "personal_loan":
      return calculatePersonalLoanTax();
    default:
      return {
        taxSaved: 0,
        effectiveInterestRate: input.interestRate,
        postTaxEMI: 0,
        warnings: [],
        notes: [],
      };
  }
}
