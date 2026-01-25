/**
 * SIP / NAV-based Post-Tax Wealth Calculator - Type Definitions
 * ZenithBooks | Indian Mutual Funds – SIP, FIFO, Capital Gains Tax
 */

export type InvestmentType = "equity_mf" | "debt_mf" | "hybrid_mf" | "etf" | "index_fund";
export type InvestmentMode = "sip" | "lump_sum";
export type SIPFrequency = "Monthly" | "Quarterly" | "Annual";
export type RedemptionType = "Full" | "Partial";
export type GainType = "STCG" | "LTCG";

export interface SIPInput {
  investmentType: InvestmentType;
  investmentMode: InvestmentMode;
  /** For SIP: amount per installment. For lump sum: total amount. */
  amount: number;
  /** SIP frequency (only for SIP mode) */
  frequency?: SIPFrequency;
  /** Start date of investment */
  startDate: string; // ISO date
  /** Expected exit date or actual redemption date */
  exitDate: string; // ISO date
  /** Expected CAGR (annualized return %) OR actual NAV history */
  expectedCAGR?: number;
  navHistory?: NAVHistoryEntry[];
  /** Tax profile - individual slab rates */
  taxProfile: "individual";
  /** Redemption type */
  redemptionType: RedemptionType;
  /** Partial redemption amount (if Partial) */
  partialRedemptionAmount?: number;
  /** Equity percentage for hybrid funds (>65% = equity rules) */
  equityPercentage?: number;
}

export interface NAVHistoryEntry {
  date: string; // ISO date
  nav: number;
}

export interface SIPLot {
  installmentDate: string; // ISO date
  investedAmount: number;
  nav: number;
  units: number;
  /** Current value = units * current NAV */
  currentValue?: number;
  /** Holding period in days from installment date to exit date */
  holdingDays?: number;
  /** Holding period in months */
  holdingMonths?: number;
  /** Is this lot short-term or long-term? */
  isShortTerm?: boolean;
  isLongTerm?: boolean;
}

export interface RedemptionLot extends SIPLot {
  /** Gain/loss on this lot */
  gain: number;
  /** Gain type: STCG or LTCG */
  gainType: GainType;
  /** Taxable amount after exemptions */
  taxableAmount: number;
  /** Tax payable on this lot */
  taxPayable: number;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalUnits: number;
  currentNAV: number;
  marketValue: number;
  totalGain: number;
  totalGainPercent: number;
  numberOfLots: number;
  investmentPeriodDays: number;
  investmentPeriodMonths: number;
}

export interface CapitalGainsSummary {
  stcgAmount: number;
  ltcgAmount: number;
  totalGain: number;
  stcgLots: number;
  ltcgLots: number;
  exemptions: number; // ₹1.25L equity LTCG exemption
  taxableSTCG: number;
  taxableLTCG: number;
  totalTaxable: number;
}

export interface TaxComputation {
  stcgTax: number;
  ltcgTax: number;
  totalTax: number;
  healthEducationCess: number;
  totalTaxLiability: number;
  /** Slab breakdown for debt MF / STCG */
  slabBreakdown?: { from: number; to: number; rate: number; amount: number }[];
}

export interface PostTaxMetrics {
  preTaxCAGR: number;
  postTaxCAGR: number;
  taxDragPercent: number;
  absolutePostTaxReturn: number;
  postTaxReturnPercent: number;
  preTaxValue: number;
  postTaxValue: number;
}

export interface ExitSimulation {
  exitDate: string;
  holdingPeriodMonths: number;
  marketValue: number;
  totalGain: number;
  taxLiability: number;
  postTaxValue: number;
  postTaxCAGR: number;
  taxDragPercent: number;
  /** Highlight if this is optimal */
  isOptimal?: boolean;
  /** Reason why this exit is optimal */
  optimalReason?: string;
}

export interface SIPInsight {
  type: "ltcg_eligibility" | "tax_savings" | "optimal_exit" | "cagr_impact" | "fifo_breakdown" | "exemption_usage";
  title: string;
  description: string;
  impactAmount?: number;
  impactPercent?: number;
  actionable?: string;
  /** Date when insight becomes relevant */
  relevantDate?: string;
}

export interface ITRMapping {
  scheduleCG: boolean;
  scheduleOS: boolean;
  capitalGainSummary: {
    stcg: number;
    ltcg: number;
    exemptions: number;
    taxableAmount: number;
    taxPayable: number;
  };
  itrAutoFillJson: Record<string, unknown>;
}

export interface SIPCalculatorResult {
  investmentSummary: InvestmentSummary;
  unitBreakup: SIPLot[];
  redemptionLots: RedemptionLot[];
  capitalGainsSummary: CapitalGainsSummary;
  taxComputation: TaxComputation;
  postTaxMetrics: PostTaxMetrics;
  exitSimulations: ExitSimulation[];
  insights: SIPInsight[];
  itrMapping: ITRMapping;
}
