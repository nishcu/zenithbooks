/**
 * Unified Loan Calculator Engine - Types
 * ZenithBooks | Indian Loan EMI & Tax Calculator
 */

export type LoanType =
  | "housing_loan"
  | "education_loan"
  | "personal_loan"
  | "business_loan"
  | "overdraft_loan"
  | "vehicle_loan";

export type BorrowerType = "salaried_individual" | "business_professional";

export type TaxRegime = "old_regime" | "new_regime";

export type TenureUnit = "months" | "years";

export type PropertyType = "self_occupied" | "let_out";

export type VehicleUsage = "personal" | "business";

/**
 * Main input for loan calculator
 */
export interface LoanInput {
  loanType: LoanType;
  loanAmount: number;
  interestRate: number; // Annual percentage rate
  tenure: number;
  tenureUnit: TenureUnit;
  loanStartDate: string; // YYYY-MM-DD
  borrowerType: BorrowerType;
  taxRegime: TaxRegime;
  marginalTaxSlab?: number; // For business loans

  // Housing loan specific
  propertyType?: PropertyType;
  jointLoan?: boolean;
  coBorrowerShare?: number; // Percentage (0-100)
  prepaymentAmount?: number;
  prepaymentDate?: string;

  // Education loan specific
  educationLoanStartYear?: number; // For 80E deduction tracking

  // OD/CC specific
  averageUtilisation?: number; // Percentage (0-100)
  dailyOutstanding?: number[]; // Optional: daily balance array

  // Vehicle loan specific
  vehicleUsage?: VehicleUsage;
  vehicleCost?: number; // For depreciation calculation
}

/**
 * EMI calculation result
 */
export interface EMIResult {
  emi: number;
  totalInterest: number;
  totalPayment: number;
  principalAmount: number;
  numberOfMonths: number;
}

/**
 * Monthly amortization entry
 */
export interface MonthlyAmortization {
  month: number;
  date: string; // YYYY-MM-DD
  openingBalance: number;
  principal: number;
  interest: number;
  emi: number;
  closingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

/**
 * Yearly amortization summary
 */
export interface YearlyAmortization {
  year: number;
  financialYear: string; // e.g., "2024-25"
  totalPrincipal: number;
  totalInterest: number;
  totalEMI: number;
  openingBalance: number;
  closingBalance: number;
  taxDeduction?: number;
  taxSaved?: number;
}

/**
 * Tax computation for a loan type
 */
export interface TaxComputation {
  deductibleInterest?: number;
  deductiblePrincipal?: number;
  taxDeductionSection?: string; // e.g., "24(b)", "80E", "80C"
  taxSaved?: number;
  effectiveInterestRate?: number;
  postTaxEMI?: number;
  warnings?: string[];
  notes?: string[];
}

/**
 * Housing loan specific tax details
 */
export interface HousingLoanTax extends TaxComputation {
  interestDeduction24b: number;
  principalDeduction80C: number;
  interestDeductionCapped: boolean;
  principalDeductionCapped: boolean;
  jointLoanSplit?: {
    borrowerShare: number;
    coBorrowerShare: number;
  };
  prepaymentImpact?: {
    interestSaved: number;
    taxImpact: number;
  };
}

/**
 * Education loan specific tax details
 */
export interface EducationLoanTax extends TaxComputation {
  eligibleYearsRemaining: number;
  yearsUsed: number;
  maxEligibleYears: number; // 8 years
  yearWiseDeduction: Array<{
    year: number;
    interest: number;
    deduction: number;
    taxSaved: number;
  }>;
}

/**
 * Business loan specific tax details
 */
export interface BusinessLoanTax extends TaxComputation {
  interestAsExpense: number;
  reductionInTaxableProfit: number;
  effectivePostTaxInterestRate: number;
  cashFlowImpact: number;
}

/**
 * OD/CC loan specific tax details
 */
export interface OverdraftLoanTax extends TaxComputation {
  averageUtilisation: number;
  interestOnUtilised: number;
  interestSavedDueToLowerUtilisation: number;
  taxAdjustedCostOfFunds: number;
}

/**
 * Vehicle loan specific tax details
 */
export interface VehicleLoanTax extends TaxComputation {
  businessUse: boolean;
  depreciationBenefit?: number;
  interestAsExpense?: number;
}

/**
 * Complete loan calculation result
 */
export interface LoanCalculatorResult {
  loanInput: LoanInput;
  emiResult: EMIResult;
  monthlySchedule: MonthlyAmortization[];
  yearlySchedule: YearlyAmortization[];
  taxComputation: TaxComputation;
  postTaxMetrics: {
    totalTaxSaved: number;
    effectiveInterestRate: number;
    postTaxEMI: number;
    lifetimeCost: number;
    preTaxLifetimeCost: number;
  };
  regimeComparison?: {
    oldRegime: {
      taxSaved: number;
      effectiveRate: number;
      postTaxEMI: number;
    };
    newRegime: {
      taxSaved: number;
      effectiveRate: number;
      postTaxEMI: number;
    };
    recommendation?: string;
  };
  insights: string[];
  warnings: string[];
}
