/**
 * Loan Calculator Constants
 */

import type { LoanType } from "./types";

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  housing_loan: "Housing Loan",
  education_loan: "Education Loan",
  personal_loan: "Personal Loan",
  business_loan: "Business Loan",
  overdraft_loan: "Overdraft / Cash Credit",
  vehicle_loan: "Vehicle Loan",
};

export const BORROWER_TYPE_LABELS: Record<"salaried_individual" | "business_professional", string> = {
  salaried_individual: "Salaried Individual",
  business_professional: "Business / Professional",
};

export const TAX_REGIME_LABELS: Record<"old_regime" | "new_regime", string> = {
  old_regime: "Old Tax Regime",
  new_regime: "New Tax Regime",
};

/**
 * Tax deduction limits (FY 2024-25)
 */
export const TAX_LIMITS = {
  HOUSING_INTEREST_SELF_OCCUPIED: 200000, // Section 24(b)
  HOUSING_PRINCIPAL_80C: 150000, // Section 80C
  EDUCATION_INTEREST_MAX_YEARS: 8, // Section 80E
} as const;

/**
 * Tax slab rates (Old Regime - FY 2024-25)
 */
export const OLD_REGIME_SLABS = [
  { from: 0, to: 250000, rate: 0 },
  { from: 250001, to: 500000, rate: 5 },
  { from: 500001, to: 1000000, rate: 20 },
  { from: 1000001, to: Infinity, rate: 30 },
] as const;

/**
 * Tax slab rates (New Regime - FY 2024-25)
 */
export const NEW_REGIME_SLABS = [
  { from: 0, to: 300000, rate: 0 },
  { from: 300001, to: 700000, rate: 5 },
  { from: 700001, to: 1000000, rate: 10 },
  { from: 1000001, to: 1200000, rate: 15 },
  { from: 1200001, to: 1500000, rate: 20 },
  { from: 1500001, to: Infinity, rate: 30 },
] as const;

/**
 * Surcharge rates
 */
export const SURCHARGE_BANDS = [
  { minIncome: 0, maxIncome: 5000000, rate: 0 },
  { minIncome: 5000001, maxIncome: 10000000, rate: 10 },
  { minIncome: 10000001, maxIncome: 20000000, rate: 15 },
  { minIncome: 20000001, maxIncome: 50000000, rate: 25 },
  { minIncome: 50000001, maxIncome: 100000000, rate: 37 },
  { minIncome: 100000001, maxIncome: Infinity, rate: 37 },
] as const;

/**
 * Health & Education Cess
 */
export const CESS_RATE = 4; // 4% on tax
