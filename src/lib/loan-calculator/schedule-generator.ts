/**
 * Amortization Schedule Generator
 * Converts monthly schedule to yearly summaries with tax implications
 */

import type { MonthlyAmortization, YearlyAmortization, LoanInput } from "./types";

/**
 * Get financial year from date
 */
export function getFinancialYear(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  if (month >= 4) {
    // April to March
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

/**
 * Generate yearly amortization schedule
 */
export function generateYearlySchedule(
  input: LoanInput,
  monthlySchedule: MonthlyAmortization[]
): YearlyAmortization[] {
  const yearlyMap = new Map<string, YearlyAmortization>();

  monthlySchedule.forEach((month) => {
    const fy = getFinancialYear(month.date);
    const year = new Date(month.date).getFullYear();

    if (!yearlyMap.has(fy)) {
      yearlyMap.set(fy, {
        year,
        financialYear: fy,
        totalPrincipal: 0,
        totalInterest: 0,
        totalEMI: 0,
        openingBalance: month.openingBalance,
        closingBalance: month.closingBalance,
      });
    }

    const yearData = yearlyMap.get(fy)!;
    yearData.totalPrincipal += month.principal;
    yearData.totalInterest += month.interest;
    yearData.totalEMI += month.emi;
    yearData.closingBalance = month.closingBalance;
  });

  return Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);
}
