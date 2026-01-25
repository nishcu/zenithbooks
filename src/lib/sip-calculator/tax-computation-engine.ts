/**
 * Tax Computation Engine for SIP Redemptions
 * Calculates STCG/LTCG tax based on FIFO redemption lots
 */

import type { RedemptionLot, InvestmentType, TaxComputation, CapitalGainsSummary } from "./types";
import { getTaxRules } from "../asset-tax-calculator/config/tax-rules";

const EQUITY_TYPES: InvestmentType[] = ["equity_mf", "etf", "index_fund"];

/**
 * Calculate capital gains summary from redeemed lots
 */
export function calculateCapitalGainsSummary(
  redeemedLots: RedemptionLot[],
  investmentType: InvestmentType,
  equityPercentage?: number
): CapitalGainsSummary {
  const isEquityType = EQUITY_TYPES.includes(investmentType) || 
    (investmentType === "hybrid_mf" && (equityPercentage ?? 0) > 65);

  let stcgAmount = 0;
  let ltcgAmount = 0;
  let stcgLots = 0;
  let ltcgLots = 0;

  for (const lot of redeemedLots) {
    if (lot.gainType === "STCG") {
      stcgAmount += lot.gain;
      stcgLots++;
    } else {
      ltcgAmount += lot.gain;
      ltcgLots++;
    }
  }

  // Apply exemptions (₹1.25L for equity LTCG)
  const rules = getTaxRules();
  let exemptions = 0;
  let taxableLTCG = ltcgAmount;

  if (isEquityType && ltcgAmount > 0) {
    exemptions = Math.min(ltcgAmount, rules.equityLtcgExemption);
    taxableLTCG = Math.max(0, ltcgAmount - exemptions);
  }

  return {
    stcgAmount,
    ltcgAmount,
    totalGain: stcgAmount + ltcgAmount,
    stcgLots,
    ltcgLots,
    exemptions,
    taxableSTCG: stcgAmount,
    taxableLTCG,
    totalTaxable: stcgAmount + taxableLTCG,
  };
}

/**
 * Calculate tax on capital gains
 */
export function calculateTax(
  capitalGains: CapitalGainsSummary,
  investmentType: InvestmentType,
  equityPercentage: number | undefined,
  includeCess: boolean = true
): TaxComputation {
  const rules = getTaxRules();
  const isEquityType = EQUITY_TYPES.includes(investmentType) || 
    (investmentType === "hybrid_mf" && (equityPercentage ?? 0) > 65);

  let stcgTax = 0;
  let ltcgTax = 0;
  const slabBreakdown: { from: number; to: number; rate: number; amount: number }[] = [];

  // Calculate STCG tax
  if (capitalGains.taxableSTCG > 0) {
    if (isEquityType) {
      // Equity STCG: 15%
      stcgTax = (capitalGains.taxableSTCG * rules.equityStcgRate) / 100;
    } else {
      // Debt MF STCG: slab rate
      stcgTax = slabTax(capitalGains.taxableSTCG, rules, slabBreakdown);
      const sr = surchargeRate(capitalGains.taxableSTCG, rules);
      if (sr > 0) stcgTax += stcgTax * sr;
    }
  }

  // Calculate LTCG tax
  if (capitalGains.taxableLTCG > 0) {
    if (isEquityType) {
      // Equity LTCG: 10% above exemption
      ltcgTax = (capitalGains.taxableLTCG * rules.equityLtcgRate) / 100;
    } else {
      // Debt MF LTCG: slab rate (post 1-Apr-2023, no indexation)
      ltcgTax = slabTax(capitalGains.taxableLTCG, rules, slabBreakdown);
      const sr = surchargeRate(capitalGains.taxableLTCG, rules);
      if (sr > 0) ltcgTax += ltcgTax * sr;
    }
  }

  const totalTax = stcgTax + ltcgTax;
  const healthEducationCess = includeCess ? totalTax * rules.cessRate : 0;
  const totalTaxLiability = totalTax + healthEducationCess;

  return {
    stcgTax,
    ltcgTax,
    totalTax,
    healthEducationCess,
    totalTaxLiability,
    slabBreakdown: slabBreakdown.length > 0 ? slabBreakdown : undefined,
  };
}

/**
 * Slab tax calculation
 */
function slabTax(
  taxableIncome: number,
  rules: ReturnType<typeof getTaxRules>,
  outBreakdown?: { from: number; to: number; rate: number; amount: number }[]
): number {
  let tax = 0;
  let remaining = taxableIncome;
  for (const slab of rules.slabRates) {
    if (remaining <= 0) break;
    const width = slab.to === Infinity ? remaining : slab.to - slab.from + 1;
    const inSlab = Math.min(remaining, width);
    const amt = (inSlab * slab.rate) / 100;
    tax += amt;
    if (outBreakdown && amt > 0)
      outBreakdown.push({
        from: slab.from,
        to: slab.to === Infinity ? Math.max(slab.from, remaining) : slab.to,
        rate: slab.rate,
        amount: amt,
      });
    remaining -= inSlab;
    if (slab.to === Infinity) break;
  }
  return tax;
}

/**
 * Surcharge rate calculation
 */
function surchargeRate(income: number, rules: ReturnType<typeof getTaxRules>): number {
  let rate = 0;
  for (const b of rules.surchargeBands) {
    if (income >= b.minIncome) rate = b.rate;
  }
  return rate;
}
