/**
 * ITR Mapping for SIP Redemptions
 * Maps capital gains to ITR schedules
 */

import type { CapitalGainsSummary, TaxComputation, InvestmentType, ITRMapping } from "./types";
import { getFYFromDate } from "../asset-tax-calculator/config/tax-rules";

const EQUITY_TYPES: InvestmentType[] = ["equity_mf", "etf", "index_fund"];

/**
 * Build ITR mapping for SIP redemptions
 */
export function buildITRMapping(
  capitalGains: CapitalGainsSummary,
  tax: TaxComputation,
  investmentType: InvestmentType,
  exitDate: string
): ITRMapping {
  const isEquityType = EQUITY_TYPES.includes(investmentType);
  const exitFY = getFYFromDate(exitDate);

  const itrAutoFillJson: Record<string, unknown> = {
    schedule: "CG",
    scheduleOS: isEquityType ? false : true, // Debt MF may need Schedule OS
    financialYear: exitFY,
    investmentType,
    stcg: capitalGains.stcgAmount,
    ltcg: capitalGains.ltcgAmount,
    exemptions: capitalGains.exemptions,
    taxableSTCG: capitalGains.taxableSTCG,
    taxableLTCG: capitalGains.taxableLTCG,
    totalTaxable: capitalGains.totalTaxable,
    taxPayable: tax.totalTaxLiability,
    stcgTax: tax.stcgTax,
    ltcgTax: tax.ltcgTax,
  };

  return {
    scheduleCG: true,
    scheduleOS: !isEquityType, // Debt MF may require Schedule OS
    capitalGainSummary: {
      stcg: capitalGains.stcgAmount,
      ltcg: capitalGains.ltcgAmount,
      exemptions: capitalGains.exemptions,
      taxableAmount: capitalGains.totalTaxable,
      taxPayable: tax.totalTaxLiability,
    },
    itrAutoFillJson,
  };
}
