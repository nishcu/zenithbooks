/**
 * Tax Calculation Engine
 * Computes tax on capital gains / business income with exemptions, cess, slab.
 */

import type { AssetInput, TaxComputation, IncomeClassification, IndexationResult } from "./types";
import { getTaxRules, getFYFromDate } from "./config/tax-rules";
import { classifyIncome } from "./classification-engine";
import { computeHoldingPeriodDetails } from "./holding-period-engine";
import { computeIndexation } from "./indexation-engine";

const EQUITY_CATEGORIES = ["equity_shares", "equity_mf"] as const;

export interface TaxCalculationInput extends AssetInput {
  /** Include Health & Education Cess (4%). Default true. */
  includeCess?: boolean;
}

function slabTax(
  taxableIncome: number,
  rules: ReturnType<typeof import("./config/tax-rules").getTaxRules>,
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

function surchargeRate(income: number, rules: ReturnType<typeof import("./config/tax-rules").getTaxRules>): number {
  let rate = 0;
  for (const b of rules.surchargeBands) {
    if (income >= b.minIncome) rate = b.rate;
  }
  return rate;
}

export function computeTax(input: TaxCalculationInput): TaxComputation {
  const rules = getTaxRules();
  const includeCess = input.includeCess !== false;
  const classification = classifyIncome(input);
  const holding = computeHoldingPeriodDetails(input);
  const indexation = computeIndexation(input);

  // Calculate base cost (non-indexed) for reference
  const totalBaseCost = input.purchaseCost + 
    (input.improvements?.reduce((sum, imp) => sum + imp.amount, 0) || 0) +
    (input.transferExpenses || 0);
  const baseGain = Math.max(0, input.saleValue - totalBaseCost);

  let capitalGainAmount: number;
  let exemptions = 0;
  let taxableAmount: number;
  let taxPayable = 0;
  let rateApplied: number | undefined;
  const slabBreakdown: { from: number; to: number; rate: number; amount: number }[] = [];
  let gstApplicable = false;

  if (classification.incomeType === "Business Income") {
    capitalGainAmount = baseGain;
    taxableAmount = baseGain;
    taxPayable = slabTax(taxableAmount, rules, slabBreakdown);
    rateApplied = undefined;
    const sr = surchargeRate(taxableAmount, rules);
    if (sr > 0) taxPayable += taxPayable * sr;
    gstApplicable = input.frequencyOfTransactions === "High";
  } else {
    const isEquity = EQUITY_CATEGORIES.includes(input.assetCategory as typeof EQUITY_CATEGORIES[number]);

    if (input.assetCategory === "debt_mf") {
      capitalGainAmount = baseGain;
      taxableAmount = baseGain;
      taxPayable = slabTax(taxableAmount, rules, slabBreakdown);
      const sr = surchargeRate(taxableAmount, rules);
      if (sr > 0) taxPayable += taxPayable * sr;
    } else if (isEquity) {
      capitalGainAmount = baseGain;
      if (holding.isShortTerm) {
        taxableAmount = baseGain;
        rateApplied = rules.equityStcgRate;
        taxPayable = (baseGain * rules.equityStcgRate) / 100;
      } else {
        exemptions = Math.min(baseGain, rules.equityLtcgExemption);
        taxableAmount = Math.max(0, baseGain - exemptions);
        rateApplied = rules.equityLtcgRate;
        taxPayable = (taxableAmount * rules.equityLtcgRate) / 100;
      }
    } else {
      // Non-equity assets (Real Estate, Gold, Silver, Commodities, Foreign assets)
      if (holding.isShortTerm) {
        capitalGainAmount = baseGain;
        taxableAmount = baseGain;
        taxPayable = slabTax(taxableAmount, rules, slabBreakdown);
        const sr = surchargeRate(taxableAmount, rules);
        if (sr > 0) taxPayable += taxPayable * sr;
      } else {
        // LTCG - MUST use indexation if eligible
        if (indexation?.applies) {
          // Use indexed gain for both capitalGainAmount and taxableAmount
          const indexedGain = Math.max(0, input.saleValue - indexation.finalIndexedCost);
          capitalGainAmount = indexedGain; // Indexed gain is the actual capital gain
          taxableAmount = indexedGain;
          taxPayable = indexation.taxWithIndexation;
          rateApplied = rules.nonEquityLtcgRate;
        } else {
          // Fallback: if indexation doesn't apply (shouldn't happen for eligible assets), use base cost
          capitalGainAmount = baseGain;
          taxableAmount = baseGain;
          taxPayable = (baseGain * rules.nonEquityLtcgRate) / 100;
          rateApplied = rules.nonEquityLtcgRate;
        }
      }
    }
  }

  const healthEducationCess = includeCess ? taxPayable * rules.cessRate : 0;
  const totalTaxLiability = taxPayable + healthEducationCess;

  return {
    capitalGainAmount,
    exemptions,
    taxableAmount,
    taxPayable,
    healthEducationCess,
    totalTaxLiability,
    slabBreakdown: slabBreakdown.length ? slabBreakdown : undefined,
    rateApplied,
    gstApplicable: gstApplicable || undefined,
  };
}
