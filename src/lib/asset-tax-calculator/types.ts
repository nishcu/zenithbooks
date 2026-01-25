/**
 * Intelligent Asset Tax Calculator - Type Definitions
 * ZenithBooks | Indian Income Tax – Capital Gains & Asset Classification
 */

export type AssetCategory =
  | "equity_shares"
  | "equity_mf"
  | "debt_mf"
  | "gold"
  | "silver"
  | "commodities"
  | "real_estate"
  | "foreign_equity"
  | "foreign_property"
  | "crypto";

export type Country = "India" | "Foreign";
export type ModeOfHolding = "Investment" | "Trading";
export type TransactionFrequency = "Low" | "Medium" | "High";

export interface CostOfImprovement {
  date: string; // ISO date
  amount: number;
  description?: string; // Optional description (e.g., "Renovation", "Extension")
}

export interface AssetInput {
  assetCategory: AssetCategory;
  purchaseDate: string; // ISO date
  purchaseCost: number;
  saleDate: string;
  saleValue: number;
  country: Country;
  modeOfHolding: ModeOfHolding;
  frequencyOfTransactions: TransactionFrequency;
  /** Crypto flag – special treatment, TDS, etc. */
  isCrypto?: boolean;
  /** Optional: sale date override for "What if I sell later?" simulation */
  simulateSaleDate?: string;
  /** Cost of improvements (for Real Estate, Gold, etc. - indexed separately) */
  improvements?: CostOfImprovement[];
  /** Transfer expenses (brokerage, stamp duty, registration, etc.) */
  transferExpenses?: number;
}

export type IncomeType = "Capital Gains" | "Business Income";
export type GainType = "STCG" | "LTCG" | "Business";

export interface IncomeClassification {
  incomeType: IncomeType;
  gainType: GainType | null;
  reasoningText: string;
  factors: { factor: string; outcome: string }[];
}

export interface HoldingPeriodDetails {
  purchaseDate: string;
  saleDate: string;
  holdingDays: number;
  holdingMonths: number;
  isShortTerm: boolean;
  isLongTerm: boolean;
  thresholdMonths: number;
  applicableRule: string;
}

export interface IndexedImprovement {
  date: string;
  amount: number;
  improvementFY: string;
  ciiImprovement: number;
  indexedAmount: number;
  description?: string;
}

export interface IndexationResult {
  applies: boolean;
  purchaseFY: string;
  saleFY: string;
  ciiPurchase: number;
  ciiSale: number;
  indexedPurchaseCost: number;
  indexedImprovements: IndexedImprovement[];
  totalIndexedCost: number; // indexedPurchaseCost + sum of indexedImprovements
  transferExpenses: number;
  finalIndexedCost: number; // totalIndexedCost + transferExpenses
  taxWithIndexation: number;
  taxWithoutIndexation?: number;
  taxSavedDueToIndexation: number;
}

export interface TaxComputation {
  capitalGainAmount: number;
  /** Exemptions e.g. ₹1.25L equity LTCG */
  exemptions: number;
  taxableAmount: number;
  taxPayable: number;
  /** Health & Education Cess (4%) */
  healthEducationCess: number;
  totalTaxLiability: number;
  /** Slab-based component (if any) */
  slabBreakdown?: { from: number; to: number; rate: number; amount: number }[];
  /** STCG/LTCG specific rate applied */
  rateApplied?: number;
  /** GST applicable if business income & frequent trading */
  gstApplicable?: boolean;
}

export interface OptimizationInsight {
  type: "hold_for_ltcg" | "sell_after_days" | "sell_next_fy" | "indexation_saving" | "exemption_usage" | "gst_warning" | "schedule_fa";
  title: string;
  description: string;
  impactAmount?: number;
  impactPercent?: number;
  actionable?: string;
}

export interface ComplianceMapping {
  scheduleCG: boolean;
  scheduleBP: boolean;
  scheduleFA: boolean;
  aisReconciliationFlags: string[];
  itrAutoFillJson: Record<string, unknown>;
}

export interface AssetTaxCalculatorResult {
  assetSummary: {
    category: AssetCategory;
    categoryLabel: string;
    purchaseCost: number;
    saleValue: number;
    gainLoss: number;
    country: Country;
    modeOfHolding: ModeOfHolding;
    frequencyOfTransactions: TransactionFrequency;
    isCrypto: boolean;
  };
  incomeClassification: IncomeClassification;
  holdingPeriodDetails: HoldingPeriodDetails;
  indexation: IndexationResult | null;
  taxComputation: TaxComputation;
  optimizationInsights: OptimizationInsight[];
  complianceMapping: ComplianceMapping;
  warnings: string[];
}

export interface TaxRulesConfig {
  financialYear: string;
  equityStcgMonths: number;
  equityLtcgExemption: number;
  equityStcgRate: number;
  equityLtcgRate: number;
  debtMfSlabEffectiveFrom: string; // "2023-04-01"
  nonEquityLtcgMonths: number;
  nonEquityLtcgRate: number;
  cii: Record<string, number>;
  slabRates: { from: number; to: number; rate: number }[];
  cessRate: number;
  surchargeBands: { minIncome: number; rate: number }[];
}
