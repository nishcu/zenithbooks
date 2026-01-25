/**
 * Unified Loan Calculator Orchestrator
 * Main entry point that coordinates all engines
 */

import type { LoanInput, LoanCalculatorResult, EMIResult } from "./types";
import { calculateEMIResult, generateMonthlySchedule } from "./emi-engine";
import { generateYearlySchedule } from "./schedule-generator";
import { calculateTaxComputation } from "./tax-rules-engine";

/**
 * Main calculator function
 */
export function calculateLoan(input: LoanInput): LoanCalculatorResult {
  // Step 1: Calculate EMI
  const emiResult = calculateEMIResult(input);

  // Step 2: Generate monthly schedule
  const monthlySchedule = generateMonthlySchedule(input, emiResult);

  // Step 3: Generate yearly schedule
  let yearlySchedule = generateYearlySchedule(input, monthlySchedule);
  
  // Step 3.5: Calculate tax saved per year and add to yearly schedule
  // This will be done after tax computation, so we'll update it later

  // Step 4: Calculate tax computation
  const taxComputation = calculateTaxComputation(input, yearlySchedule);
  
  // Step 4.5: Update yearly schedule with tax saved per year
  yearlySchedule = yearlySchedule.map((year, index) => {
    // Calculate tax saved for this year based on interest/principal
    let yearTaxSaved = 0;
    
    if (input.loanType === "housing_loan") {
      const housingTax = taxComputation as any;
      const totalInterest = yearlySchedule.reduce((sum, y) => sum + y.totalInterest, 0);
      const totalPrincipal = yearlySchedule.reduce((sum, y) => sum + y.totalPrincipal, 0);
      if (totalInterest > 0) {
        yearTaxSaved += (year.totalInterest / totalInterest) * (housingTax.interestDeduction24b || 0) * 0.3; // Rough tax rate
      }
      if (totalPrincipal > 0) {
        yearTaxSaved += (year.totalPrincipal / totalPrincipal) * (housingTax.principalDeduction80C || 0) * 0.3;
      }
    } else if (input.loanType === "education_loan") {
      const eduTax = taxComputation as any;
      if (eduTax.yearWiseDeduction && eduTax.yearWiseDeduction[index]) {
        yearTaxSaved = eduTax.yearWiseDeduction[index].taxSaved || 0;
      }
    } else if (input.loanType === "business_loan" || input.loanType === "overdraft_loan") {
      const effectiveTaxRate = input.marginalTaxSlab ? input.marginalTaxSlab / 100 : 0.3;
      yearTaxSaved = year.totalInterest * effectiveTaxRate;
    } else if (input.loanType === "vehicle_loan" && input.vehicleUsage === "business") {
      const effectiveTaxRate = input.marginalTaxSlab ? input.marginalTaxSlab / 100 : 0.3;
      yearTaxSaved = year.totalInterest * effectiveTaxRate;
    }
    
    return {
      ...year,
      taxSaved: Math.round(yearTaxSaved * 100) / 100,
    };
  });

  // Step 5: Calculate post-tax metrics
  const effectiveRate = taxComputation.effectiveInterestRate ?? input.interestRate;
  // Post-tax EMI is calculated as: EMI adjusted for effective rate
  // Simplified: If effective rate is lower, EMI impact is proportional
  const rateReduction = input.interestRate > 0 
    ? (input.interestRate - effectiveRate) / input.interestRate 
    : 0;
  const postTaxEMI = emiResult.emi * (1 - rateReduction * 0.3); // Rough approximation
  const totalTaxSaved = taxComputation.taxSaved || 0;
  const lifetimeCost = emiResult.totalPayment - totalTaxSaved;
  const preTaxLifetimeCost = emiResult.totalPayment;
  
  // Update tax computation with calculated post-tax EMI
  taxComputation.postTaxEMI = postTaxEMI;

  // Step 6: Regime comparison (if applicable)
  let regimeComparison;
  if (input.loanType === "housing_loan" || input.loanType === "education_loan") {
    const oldRegimeTax = calculateTaxComputation(
      { ...input, taxRegime: "old_regime" },
      yearlySchedule
    );
    const newRegimeTax = calculateTaxComputation(
      { ...input, taxRegime: "new_regime" },
      yearlySchedule
    );

    const oldEffectiveRate = oldRegimeTax.effectiveInterestRate ?? input.interestRate;
    const newEffectiveRate = newRegimeTax.effectiveInterestRate ?? input.interestRate;

    regimeComparison = {
      oldRegime: {
        taxSaved: oldRegimeTax.taxSaved || 0,
        effectiveRate: oldEffectiveRate,
        postTaxEMI: emiResult.emi * (oldEffectiveRate / input.interestRate),
      },
      newRegime: {
        taxSaved: newRegimeTax.taxSaved || 0,
        effectiveRate: newEffectiveRate,
        postTaxEMI: emiResult.emi * (newEffectiveRate / input.interestRate),
      },
      recommendation:
        (oldRegimeTax.taxSaved || 0) > (newRegimeTax.taxSaved || 0)
          ? "Old regime offers better tax benefits for this loan."
          : "New regime may be more beneficial. Consider your overall tax situation.",
    };
  }

  // Step 7: Generate insights
  const insights = generateInsights(input, emiResult, taxComputation, regimeComparison);

  // Step 8: Collect warnings
  const warnings = [
    ...(taxComputation.warnings || []),
    ...generateWarnings(input, emiResult, taxComputation),
  ];

  return {
    loanInput: input,
    emiResult,
    monthlySchedule,
    yearlySchedule,
    taxComputation,
    postTaxMetrics: {
      totalTaxSaved,
      effectiveInterestRate: effectiveRate,
      postTaxEMI,
      lifetimeCost,
      preTaxLifetimeCost,
    },
    regimeComparison,
    insights,
    warnings,
  };
}

/**
 * Generate insights
 */
function generateInsights(
  input: LoanInput,
  emiResult: EMIResult,
  taxComputation: any,
  regimeComparison?: any
): string[] {
  const insights: string[] = [];

  // Tax benefit insights
  if (taxComputation.taxSaved && taxComputation.taxSaved > 0) {
    insights.push(
      `Total tax saved over loan tenure: ₹${taxComputation.taxSaved.toLocaleString()}`
    );
    insights.push(
      `Effective interest rate after tax: ${taxComputation.effectiveInterestRate?.toFixed(2) || input.interestRate.toFixed(2)}%`
    );
  } else if (input.loanType === "personal_loan") {
    insights.push(
      "Consider investing the EMI amount in tax-saving instruments (ELSS, PPF) for better returns."
    );
  }

  // Regime comparison
  if (regimeComparison) {
    const betterRegime =
      regimeComparison.oldRegime.taxSaved > regimeComparison.newRegime.taxSaved
        ? "Old"
        : "New";
    insights.push(
      `${betterRegime} tax regime offers better benefits for this loan type.`
    );
  }

  // Prepayment vs invest
  if (input.loanType === "housing_loan" || input.loanType === "education_loan") {
    insights.push(
      "Compare prepayment benefits vs investing in tax-saving instruments (ELSS, PPF)."
    );
  }

  // OD/CC specific
  if (input.loanType === "overdraft_loan" && input.averageUtilisation && input.averageUtilisation < 100) {
    insights.push(
      `Lower utilisation (${input.averageUtilisation}%) reduces interest cost.`
    );
  }

  return insights;
}

/**
 * Generate warnings
 */
function generateWarnings(
  input: LoanInput,
  emiResult: EMIResult,
  taxComputation: any
): string[] {
  const warnings: string[] = [];

  // Housing loan specific
  if (input.loanType === "housing_loan") {
    if (input.propertyType === "self_occupied") {
      warnings.push(
        "If property is sold within 5 years of purchase, Section 80C principal deduction will be reversed."
      );
    }
  }

  // Education loan specific
  if (input.loanType === "education_loan") {
    if (taxComputation.eligibleYearsRemaining !== undefined && taxComputation.eligibleYearsRemaining === 0) {
      warnings.push("Section 80E deduction period exhausted. No further tax benefits available.");
    }
  }

  // Business loan
  if (input.loanType === "business_loan" && !input.marginalTaxSlab) {
    warnings.push(
      "Marginal tax slab not provided. Using estimated rate for calculations."
    );
  }

  return warnings;
}
