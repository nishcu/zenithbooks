/**
 * NAV & Unit Calculation Engine
 * Calculates units for SIP installments and lump sum investments
 */

import type { SIPInput, SIPLot, NAVHistoryEntry, InvestmentType } from "./types";
import { getTaxRules } from "../asset-tax-calculator/config/tax-rules";

/**
 * Get NAV for a specific date
 * Priority: navHistory > estimated NAV from CAGR
 */
function getNAVForDate(
  date: string,
  navHistory: NAVHistoryEntry[] | undefined,
  expectedCAGR: number | undefined,
  startDate: string,
  startNAV?: number
): number {
  // If NAV history is provided, use it
  if (navHistory && navHistory.length > 0) {
    // Find closest NAV entry (before or on the date)
    const sortedHistory = [...navHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const targetDate = new Date(date);
    
    // Find the last NAV entry on or before the target date
    let closestNAV = sortedHistory[0];
    for (const entry of sortedHistory) {
      const entryDate = new Date(entry.date);
      if (entryDate <= targetDate) {
        closestNAV = entry;
      } else {
        break;
      }
    }
    return closestNAV.nav;
  }

  // If CAGR is provided, estimate NAV
  if (expectedCAGR != null && startNAV != null) {
    const start = new Date(startDate);
    const current = new Date(date);
    const years = (current.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return startNAV * Math.pow(1 + expectedCAGR / 100, years);
  }

  // Fallback: assume NAV = 100 (for testing)
  return 100;
}

/**
 * Calculate SIP installments and units
 */
export function calculateSIPUnits(input: SIPInput): SIPLot[] {
  const lots: SIPLot[] = [];
  
  if (input.investmentMode === "lump_sum") {
    // Single lump sum investment
    const nav = getNAVForDate(input.startDate, input.navHistory, input.expectedCAGR, input.startDate, input.expectedCAGR ? 100 : undefined);
    const units = input.amount / nav;
    
    lots.push({
      installmentDate: input.startDate,
      investedAmount: input.amount,
      nav,
      units,
    });
    return lots;
  }

  // SIP mode
  if (!input.frequency) {
    throw new Error("SIP frequency is required for SIP mode");
  }

  const startDate = new Date(input.startDate);
  const exitDate = new Date(input.exitDate);
  
  let currentDate = new Date(startDate);
  let startNAV = input.navHistory?.[0]?.nav || (input.expectedCAGR ? 100 : 100);

  // Use proper date increment based on frequency (not just days)
  while (currentDate <= exitDate) {
    const nav = getNAVForDate(currentDate.toISOString().slice(0, 10), input.navHistory, input.expectedCAGR, input.startDate, startNAV);
    const units = input.amount / nav;

    lots.push({
      installmentDate: currentDate.toISOString().slice(0, 10),
      investedAmount: input.amount,
      nav,
      units,
    });

    // Increment date based on frequency
    switch (input.frequency) {
      case "Monthly":
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
        break;
      case "Quarterly":
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, currentDate.getDate());
        break;
      case "Annual":
        currentDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
        break;
    }
  }

  return lots;
}

/**
 * Get days between SIP installments based on frequency
 */
function getDaysBetweenInstallments(frequency: SIPFrequency): number {
  switch (frequency) {
    case "Monthly":
      return 30; // Approximate
    case "Quarterly":
      return 90;
    case "Annual":
      return 365;
    default:
      return 30;
  }
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate current value for all lots based on current NAV
 */
export function updateLotsWithCurrentValue(lots: SIPLot[], currentNAV: number): SIPLot[] {
  return lots.map(lot => ({
    ...lot,
    currentValue: lot.units * currentNAV,
  }));
}

/**
 * Calculate holding period for each lot
 */
export function calculateHoldingPeriods(lots: SIPLot[], exitDate: string, investmentType: InvestmentType): SIPLot[] {
  const rules = getTaxRules();
  const exit = new Date(exitDate);
  const thresholdMonths = investmentType === "equity_mf" || investmentType === "etf" || investmentType === "index_fund" 
    ? rules.equityStcgMonths 
    : rules.nonEquityLtcgMonths;

  return lots.map(lot => {
    const installment = new Date(lot.installmentDate);
    const days = Math.floor((exit.getTime() - installment.getTime()) / (24 * 60 * 60 * 1000));
    const months = Math.floor(days / 30);
    const isShortTerm = months <= thresholdMonths;
    const isLongTerm = !isShortTerm;

    return {
      ...lot,
      holdingDays: days,
      holdingMonths: months,
      isShortTerm,
      isLongTerm,
    };
  });
}
