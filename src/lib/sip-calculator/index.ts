/**
 * SIP / NAV-based Post-Tax Wealth Calculator – Orchestrator
 * ZenithBooks | Indian Mutual Funds – SIP, FIFO, Capital Gains Tax
 */

import type { SIPInput, SIPCalculatorResult } from "./types";
import { calculateSIPByFormula, deriveNAVProgression } from "./sip-formula-engine";
import { calculateSIPUnits, updateLotsWithCurrentValue } from "./nav-unit-engine";
import { applyFIFORedemption, calculateInvestmentSummary } from "./fifo-redemption-engine";
import { calculateCapitalGainsSummary, calculateTax } from "./tax-computation-engine";
import { calculatePostTaxMetrics } from "./post-tax-metrics-engine";
import { generateExitSimulations } from "./exit-simulation-engine";
import { generateInsights } from "./insights-engine";
import { buildITRMapping } from "./itr-mapping";

export function runSIPCalculator(input: SIPInput): SIPCalculatorResult {
  // Step 1: Calculate using standard SIP formula
  const formulaResult = calculateSIPByFormula(input);
  
  // Step 2: Derive NAV progression from formula (for tax calculations)
  // If NAV history is not provided, derive it from CAGR to match formula result
  const derivedNAVHistory = input.navHistory || deriveNAVProgression(input, formulaResult);
  const inputWithNAV: SIPInput = {
    ...input,
    navHistory: derivedNAVHistory,
  };

  // Step 3: Calculate SIP units using NAV-based approach (for FIFO tax calculations)
  const lots = calculateSIPUnits(inputWithNAV);

  // Step 4: Get exit NAV (from history or derived)
  const exitNAV = getExitNAV(inputWithNAV);

  // Step 5: Update lots with current value at exit NAV
  const lotsWithValue = updateLotsWithCurrentValue(lots, exitNAV);
  
  // Step 6: Scale market value to match formula result (for consistency)
  // This ensures our NAV-based calculation aligns with industry-standard formula
  const totalUnits = lotsWithValue.reduce((sum, lot) => sum + lot.units, 0);
  const currentMarketValue = totalUnits * exitNAV;
  const scaleFactor = currentMarketValue > 0 ? formulaResult.futureValue / currentMarketValue : 1;
  
  // Adjust exit NAV to match formula result
  const adjustedExitNAV = exitNAV * scaleFactor;
  const lotsWithAdjustedValue = updateLotsWithCurrentValue(lots, adjustedExitNAV);

  // Step 7: Apply FIFO redemption using adjusted NAV
  const redeemedLots = applyFIFORedemption(lotsWithAdjustedValue, input, adjustedExitNAV);

  // Step 8: Calculate investment summary
    // Use formula result for market value (matches industry standard)
  const investmentSummary = {
    ...calculateInvestmentSummary(lotsWithAdjustedValue, adjustedExitNAV, input.exitDate),
    // Override with formula result for consistency with industry calculators
    marketValue: formulaResult.futureValue,
    totalGain: formulaResult.estimatedReturns,
    totalGainPercent: formulaResult.totalInvested > 0 
      ? (formulaResult.estimatedReturns / formulaResult.totalInvested) * 100 
      : 0,
  };

  // Step 9: Calculate capital gains summary
  const capitalGains = calculateCapitalGainsSummary(
    redeemedLots,
    input.investmentType,
    input.equityPercentage
  );

  // Step 10: Calculate tax (comprehensive income tax calculations)
  const tax = calculateTax(capitalGains, input.investmentType, input.equityPercentage);

  // Step 11: Calculate post-tax metrics
  const postTaxMetrics = calculatePostTaxMetrics(investmentSummary, tax);

  // Step 12: Generate exit simulations
  const exitSimulations = generateExitSimulations(input, lotsWithAdjustedValue);

  // Step 13: Generate insights
  const insights = generateInsights(input, lotsWithAdjustedValue, redeemedLots, capitalGains, exitSimulations);

  // Step 11: Build ITR mapping
  const itrMapping = buildITRMapping(capitalGains, tax, input.investmentType, input.exitDate);

  return {
    investmentSummary,
    unitBreakup: lotsWithAdjustedValue, // Use adjusted lots for display
    redemptionLots: redeemedLots,
    capitalGainsSummary: capitalGains,
    taxComputation: tax,
    postTaxMetrics,
    exitSimulations,
    insights,
    itrMapping,
  };
}

/**
 * Get exit NAV from history or estimate from CAGR
 */
function getExitNAV(input: SIPInput): number {
  if (input.navHistory && input.navHistory.length > 0) {
    const sorted = [...input.navHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const targetDate = new Date(input.exitDate);
    
    let closest = sorted[0];
    for (const entry of sorted) {
      if (new Date(entry.date) <= targetDate) {
        closest = entry;
      } else break;
    }
    return closest.nav;
  }

  if (input.expectedCAGR != null) {
    const baseNAV = input.navHistory?.[0]?.nav || 100;
    const baseDate = input.navHistory?.[0] ? new Date(input.navHistory[0].date) : new Date(input.startDate);
    const currentDate = new Date(input.exitDate);
    const years = (currentDate.getTime() - baseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return baseNAV * Math.pow(1 + input.expectedCAGR / 100, years);
  }

  return 100; // Fallback
}

export * from "./types";
export { calculateSIPUnits, updateLotsWithCurrentValue } from "./nav-unit-engine";
export { applyFIFORedemption } from "./fifo-redemption-engine";
export { calculateCapitalGainsSummary, calculateTax } from "./tax-computation-engine";
export { calculatePostTaxMetrics } from "./post-tax-metrics-engine";
export { generateExitSimulations } from "./exit-simulation-engine";
export { generateInsights } from "./insights-engine";
export { buildITRMapping } from "./itr-mapping";
