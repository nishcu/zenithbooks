/**
 * Post-Tax Return Metrics Engine
 * Calculates pre-tax CAGR, post-tax CAGR, tax drag, etc.
 */

import type { InvestmentSummary, TaxComputation, PostTaxMetrics } from "./types";

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 */
function calculateCAGR(
  initialValue: number,
  finalValue: number,
  years: number
): number {
  if (initialValue <= 0 || years <= 0) return 0;
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}

/**
 * Calculate post-tax metrics
 */
export function calculatePostTaxMetrics(
  investmentSummary: InvestmentSummary,
  taxComputation: TaxComputation
): PostTaxMetrics {
  const preTaxValue = investmentSummary.marketValue;
  const postTaxValue = preTaxValue - taxComputation.totalTaxLiability;
  const totalInvested = investmentSummary.totalInvested;
  const years = investmentSummary.investmentPeriodMonths / 12;

  const preTaxCAGR = calculateCAGR(totalInvested, preTaxValue, years);
  const postTaxCAGR = calculateCAGR(totalInvested, postTaxValue, years);

  const taxDragPercent = preTaxCAGR > 0 ? ((preTaxCAGR - postTaxCAGR) / preTaxCAGR) * 100 : 0;
  const absolutePostTaxReturn = postTaxValue - totalInvested;
  const postTaxReturnPercent = totalInvested > 0 ? (absolutePostTaxReturn / totalInvested) * 100 : 0;

  return {
    preTaxCAGR,
    postTaxCAGR,
    taxDragPercent,
    absolutePostTaxReturn,
    postTaxReturnPercent,
    preTaxValue,
    postTaxValue,
  };
}
