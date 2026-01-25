/**
 * SIP Formula Engine
 * Standard SIP calculator formula: FV = P × [({(1 + r)^n – 1} / r) × (1 + r)]
 * Industry-standard formula used by mutual fund calculators
 */

import type { SIPInput } from "./types";

export interface SIPFormulaResult {
  /** Total invested amount */
  totalInvested: number;
  /** Future value (maturity amount) */
  futureValue: number;
  /** Estimated returns (gain) */
  estimatedReturns: number;
  /** Number of installments */
  numberOfInstallments: number;
}

/**
 * Calculate SIP using standard formula
 * Formula: FV = P × [({(1 + r)^n – 1} / r) × (1 + r)]
 * Where:
 * - FV = Future Value
 * - P = Monthly Investment Amount
 * - r = Monthly Rate of Return (annual rate / 12)
 * - n = Number of months
 */
export function calculateSIPByFormula(input: SIPInput): SIPFormulaResult {
  if (input.investmentMode === "lump_sum") {
    // Lump sum: FV = P × (1 + r)^n
    const startDate = new Date(input.startDate);
    const exitDate = new Date(input.exitDate);
    const years = (exitDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    
    if (!input.expectedCAGR) {
      return {
        totalInvested: input.amount,
        futureValue: input.amount,
        estimatedReturns: 0,
        numberOfInstallments: 1,
      };
    }

    const futureValue = input.amount * Math.pow(1 + input.expectedCAGR / 100, years);
    const estimatedReturns = futureValue - input.amount;

    return {
      totalInvested: input.amount,
      futureValue,
      estimatedReturns,
      numberOfInstallments: 1,
    };
  }

  // SIP mode
  if (!input.frequency || !input.expectedCAGR) {
    throw new Error("SIP frequency and expected CAGR are required");
  }

  const startDate = new Date(input.startDate);
  const exitDate = new Date(input.exitDate);
  const numberOfInstallments = getNumberOfInstallments(startDate, exitDate, input.frequency);
  const annualRate = input.expectedCAGR / 100;
  
  // Calculate periodic rate based on frequency
  let periodicRate: number;
  
  switch (input.frequency) {
    case "Monthly":
      periodicRate = annualRate / 12; // Monthly rate
      break;
    case "Quarterly":
      periodicRate = annualRate / 4; // Quarterly rate
      break;
    case "Annual":
      periodicRate = annualRate; // Annual rate
      break;
  }

  // Standard SIP formula (industry-standard):
  // FV = P × [({(1 + r)^n – 1} / r) × (1 + r)]
  // Where:
  // - P = Periodic investment amount
  // - r = Periodic rate of return (annual rate / periods per year)
  // - n = Number of installments
  // - The (1 + r) multiplier accounts for payments at the beginning of each period
  const totalInvested = input.amount * numberOfInstallments;
  
  if (periodicRate === 0 || numberOfInstallments === 0) {
    // If rate is 0 or no installments, future value = total invested
    return {
      totalInvested,
      futureValue: totalInvested,
      estimatedReturns: 0,
      numberOfInstallments,
    };
  }
  
  // Calculate future value using standard SIP formula
  const futureValue = input.amount * (((Math.pow(1 + periodicRate, numberOfInstallments) - 1) / periodicRate) * (1 + periodicRate));
  const estimatedReturns = futureValue - totalInvested;

  return {
    totalInvested,
    futureValue,
    estimatedReturns,
    numberOfInstallments,
  };
}

/**
 * Get total number of installments between dates based on frequency
 * This counts actual installments, not approximate months
 */
function getNumberOfInstallments(
  startDate: Date,
  exitDate: Date,
  frequency: "Monthly" | "Quarterly" | "Annual"
): number {
  let count = 0;
  let currentDate = new Date(startDate);
  
  while (currentDate <= exitDate) {
    count++;
    switch (frequency) {
      case "Monthly":
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case "Quarterly":
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case "Annual":
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
  }
  
  return count;
}

/**
 * Derive NAV progression from SIP formula result
 * This helps us create realistic NAV values for tax calculations
 */
export function deriveNAVProgression(
  input: SIPInput,
  formulaResult: SIPFormulaResult
): { date: string; nav: number }[] {
  const navHistory: { date: string; nav: number }[] = [];
  const startNAV = 100; // Base NAV
  const startDate = new Date(input.startDate);
  const exitDate = new Date(input.exitDate);
  
  if (!input.expectedCAGR) return navHistory;

  const annualRate = input.expectedCAGR / 100;
  const daysBetween = getDaysBetweenInstallments(input.frequency || "Monthly");
  
  let currentDate = new Date(startDate);
  let currentNAV = startNAV;

  while (currentDate <= exitDate) {
    const years = (currentDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    currentNAV = startNAV * Math.pow(1 + annualRate, years);
    
    navHistory.push({
      date: currentDate.toISOString().slice(0, 10),
      nav: currentNAV,
    });

    currentDate = addDays(currentDate, daysBetween);
  }

  // Add exit date NAV
  const exitYears = (exitDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const exitNAV = startNAV * Math.pow(1 + annualRate, exitYears);
  navHistory.push({
    date: exitDate.toISOString().slice(0, 10),
    nav: exitNAV,
  });

  return navHistory;
}

function getDaysBetweenInstallments(frequency: "Monthly" | "Quarterly" | "Annual"): number {
  switch (frequency) {
    case "Monthly":
      return 30;
    case "Quarterly":
      return 90;
    case "Annual":
      return 365;
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
