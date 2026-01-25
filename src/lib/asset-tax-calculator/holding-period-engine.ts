/**
 * Holding Period Engine
 * Computes holding period and applies asset-class-specific thresholds.
 */

import type { AssetInput, HoldingPeriodDetails } from "./types";
import { getTaxRules } from "./config/tax-rules";

const EQUITY_CATEGORIES = ["equity_shares", "equity_mf"] as const;

export function computeHoldingDays(purchaseDate: string, saleDate: string): number {
  const p = new Date(purchaseDate);
  const s = new Date(saleDate);
  const ms = s.getTime() - p.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function computeHoldingPeriodDetails(input: AssetInput): HoldingPeriodDetails {
  const saleDate = input.simulateSaleDate || input.saleDate;
  const holdingDays = computeHoldingDays(input.purchaseDate, saleDate);
  const holdingMonths = Math.floor(holdingDays / 30);
  const rules = getTaxRules();
  const isEquity = EQUITY_CATEGORIES.includes(input.assetCategory as typeof EQUITY_CATEGORIES[number]);

  const thresholdMonths = isEquity ? rules.equityStcgMonths : rules.nonEquityLtcgMonths;
  const isShortTerm = holdingMonths <= thresholdMonths;
  const isLongTerm = !isShortTerm;

  let applicableRule: string;
  if (isEquity) {
    applicableRule = isShortTerm
      ? `STCG: Holding ≤ ${rules.equityStcgMonths} months. Tax @ ${rules.equityStcgRate}% (no indexation).`
      : `LTCG: Holding > ${rules.equityStcgMonths} months. Tax @ ${rules.equityLtcgRate}% on gains above ₹${(rules.equityLtcgExemption / 1_000_00).toFixed(2)} Lakh.`;
  } else if (input.assetCategory === "debt_mf") {
    applicableRule = "Debt MF (post 1-Apr-2023): Any holding → Taxed at slab rate. No indexation.";
  } else {
    applicableRule = isShortTerm
      ? `STCG: Holding ≤ ${rules.nonEquityLtcgMonths} months. Tax at slab rate.`
      : `LTCG: Holding > ${rules.nonEquityLtcgMonths} months. Tax @ ${rules.nonEquityLtcgRate}% with indexation.`;
  }

  return {
    purchaseDate: input.purchaseDate,
    saleDate,
    holdingDays,
    holdingMonths,
    isShortTerm,
    isLongTerm,
    thresholdMonths,
    applicableRule,
  };
}
