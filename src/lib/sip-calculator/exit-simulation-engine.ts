/**
 * Exit Date Simulation Engine
 * Simulates multiple exit dates to find optimal tax-efficient exit
 */

import type { SIPInput, SIPLot, ExitSimulation, InvestmentSummary } from "./types";
import { calculateSIPUnits, updateLotsWithCurrentValue, calculateHoldingPeriods } from "./nav-unit-engine";
import { applyFIFORedemption } from "./fifo-redemption-engine";
import { calculateCapitalGainsSummary, calculateTax } from "./tax-computation-engine";
import { calculatePostTaxMetrics } from "./post-tax-metrics-engine";
import { calculateInvestmentSummary } from "./fifo-redemption-engine";
import { getTaxRules } from "../asset-tax-calculator/config/tax-rules";

const EQUITY_TYPES = ["equity_mf", "etf", "index_fund"];

/**
 * Generate exit simulations for multiple dates
 */
export function generateExitSimulations(
  input: SIPInput,
  lots: SIPLot[]
): ExitSimulation[] {
  const simulations: ExitSimulation[] = [];
  const startDate = new Date(input.startDate);
  const originalExitDate = new Date(input.exitDate);
  
  // Get current NAV or estimate from CAGR
  const currentNAV = input.navHistory?.[input.navHistory.length - 1]?.nav || 
    (input.expectedCAGR ? estimateNAVForSimulation(input.startDate, input.expectedCAGR, input.navHistory?.[0]?.nav || 100, input.navHistory) : 100);

  // Simulation dates
  const simulationDates = [
    new Date(), // Exit now
    addMonths(originalExitDate, -6), // 6 months before
    addMonths(originalExitDate, -3), // 3 months before
    originalExitDate, // Original exit date
    addMonths(originalExitDate, 3), // 3 months after
    addMonths(originalExitDate, 6), // 6 months after
  ].filter(date => date >= startDate).sort((a, b) => a.getTime() - b.getTime());

  // Add LTCG eligibility date if applicable
  const rules = getTaxRules();
  const isEquityType = EQUITY_TYPES.includes(input.investmentType) || 
    (input.investmentType === "hybrid_mf" && (input.equityPercentage ?? 0) > 65);
  const thresholdMonths = isEquityType ? rules.equityStcgMonths : rules.nonEquityLtcgMonths;
  
  // Find when oldest lot becomes LTCG
  const oldestLot = lots[0];
  if (oldestLot) {
    const oldestDate = new Date(oldestLot.installmentDate);
    const ltcgDate = addMonths(oldestDate, thresholdMonths + 1);
    if (ltcgDate <= addMonths(originalExitDate, 12) && !simulationDates.some(d => 
      Math.abs(d.getTime() - ltcgDate.getTime()) < 7 * 24 * 60 * 60 * 1000
    )) {
      simulationDates.push(ltcgDate);
      simulationDates.sort((a, b) => a.getTime() - b.getTime());
    }
  }

  // Simulate each exit date
  for (const exitDate of simulationDates) {
    const exitDateStr = exitDate.toISOString().slice(0, 10);
    const exitNAV = estimateNAVForSimulation(exitDateStr, input.expectedCAGR, currentNAV, input.navHistory);
    
    // Update lots with current value
    const lotsWithValue = updateLotsWithCurrentValue(lots, exitNAV);
    
    // Apply FIFO redemption
    const redeemedLots = applyFIFORedemption(lotsWithValue, {
      ...input,
      exitDate: exitDateStr,
      redemptionType: "Full",
    }, exitNAV);

    // Calculate capital gains and tax
    const capitalGains = calculateCapitalGainsSummary(
      redeemedLots,
      input.investmentType,
      input.equityPercentage
    );
    const tax = calculateTax(capitalGains, input.investmentType, input.equityPercentage);

    // Calculate investment summary
    const summary = calculateInvestmentSummary(lotsWithValue, exitNAV, exitDateStr);
    
    // Calculate post-tax metrics
    const metrics = calculatePostTaxMetrics(summary, tax);

    const months = Math.floor((exitDate.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));

    simulations.push({
      exitDate: exitDateStr,
      holdingPeriodMonths: months,
      marketValue: summary.marketValue,
      totalGain: summary.totalGain,
      taxLiability: tax.totalTaxLiability,
      postTaxValue: metrics.postTaxValue,
      postTaxCAGR: metrics.postTaxCAGR,
      taxDragPercent: metrics.taxDragPercent,
    });
  }

  // Find optimal exit (highest post-tax value)
  if (simulations.length > 0) {
    const optimal = simulations.reduce((best, sim) => 
      sim.postTaxValue > best.postTaxValue ? sim : best
    );
    optimal.isOptimal = true;
    optimal.optimalReason = "Highest post-tax redemption value";
  }

  return simulations;
}

/**
 * Estimate NAV for simulation exit date
 */
function estimateNAVForSimulation(
  date: string,
  cagr: number | undefined,
  baseNAV: number,
  navHistory?: Array<{ date: string; nav: number }>
): number {
  if (navHistory && navHistory.length > 0) {
    const sorted = [...navHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const targetDate = new Date(date);
    
    let closest = sorted[0];
    for (const entry of sorted) {
      if (new Date(entry.date) <= targetDate) {
        closest = entry;
      } else break;
    }
    return closest.nav;
  }

  if (cagr != null) {
    const baseDate = navHistory?.[0] ? new Date(navHistory[0].date) : new Date();
    const currentDate = new Date(date);
    const years = (currentDate.getTime() - baseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return baseNAV * Math.pow(1 + cagr / 100, years);
  }

  return baseNAV;
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
