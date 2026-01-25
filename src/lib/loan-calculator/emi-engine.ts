/**
 * EMI Calculation Engine
 * Standard amortization formula: EMI = [P × r × (1+r)^n] / [(1+r)^n − 1]
 */

import type { LoanInput, EMIResult, MonthlyAmortization } from "./types";

// Date utilities
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate EMI using standard formula
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  numberOfMonths: number
): number {
  if (numberOfMonths === 0 || annualRate === 0) {
    return principal / numberOfMonths || 0;
  }

  const monthlyRate = annualRate / 100 / 12;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfMonths)) /
    (Math.pow(1 + monthlyRate, numberOfMonths) - 1);

  return Math.round(emi * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate complete EMI result
 */
export function calculateEMIResult(input: LoanInput): EMIResult {
  const numberOfMonths =
    input.tenureUnit === "years" ? input.tenure * 12 : input.tenure;

  const emi = calculateEMI(input.loanAmount, input.interestRate, numberOfMonths);
  const totalPayment = emi * numberOfMonths;
  const totalInterest = totalPayment - input.loanAmount;

  return {
    emi,
    totalInterest,
    totalPayment,
    principalAmount: input.loanAmount,
    numberOfMonths,
  };
}

/**
 * Generate monthly amortization schedule
 */
export function generateMonthlySchedule(
  input: LoanInput,
  emiResult: EMIResult
): MonthlyAmortization[] {
  const schedule: MonthlyAmortization[] = [];
  const monthlyRate = input.interestRate / 100 / 12;
  let balance = input.loanAmount;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  const startDate = new Date(input.loanStartDate);

  for (let month = 1; month <= emiResult.numberOfMonths; month++) {
    const interest = balance * monthlyRate;
    const principal = emiResult.emi - interest;
    const newBalance = balance - principal;

    cumulativeInterest += interest;
    cumulativePrincipal += principal;

    const currentDate = addMonths(startDate, month - 1);

    schedule.push({
      month,
      date: formatDate(currentDate),
      openingBalance: Math.round(balance * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      emi: emiResult.emi,
      closingBalance: Math.max(0, Math.round(newBalance * 100) / 100),
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
      cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
    });

    balance = newBalance;
  }

  return schedule;
}

/**
 * Calculate outstanding balance at a specific date
 */
export function calculateOutstandingBalance(
  input: LoanInput,
  emiResult: EMIResult,
  targetDate: string
): number {
  const startDate = new Date(input.loanStartDate);
  const target = new Date(targetDate);

  if (target <= startDate) {
    return input.loanAmount;
  }

  const monthsElapsed = Math.floor(
    (target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );

  if (monthsElapsed >= emiResult.numberOfMonths) {
    return 0;
  }

  const monthlyRate = input.interestRate / 100 / 12;
  const balance =
    input.loanAmount *
      Math.pow(1 + monthlyRate, monthsElapsed) -
    emiResult.emi *
      ((Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate);

  return Math.max(0, Math.round(balance * 100) / 100);
}
