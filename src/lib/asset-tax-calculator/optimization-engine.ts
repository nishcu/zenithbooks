/**
 * Tax Optimization Insights Engine
 * Data-driven suggestions: hold for LTCG, sell later, FY shift, indexation, etc.
 */

import type { AssetInput, OptimizationInsight, TaxComputation, IndexationResult } from "./types";
import { getTaxRules, getFYFromDate } from "./config/tax-rules";
import { computeHoldingPeriodDetails } from "./holding-period-engine";
import { classifyIncome } from "./classification-engine";
import { computeIndexation } from "./indexation-engine";
import { computeTax } from "./tax-calculation-engine";

const EQUITY_CATEGORIES = ["equity_shares", "equity_mf"] as const;

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateOptimizationInsights(
  input: AssetInput,
  taxResult: TaxComputation,
  indexation: IndexationResult | null,
  holding: ReturnType<typeof computeHoldingPeriodDetails>
): OptimizationInsight[] {
  const insights: OptimizationInsight[] = [];
  const rules = getTaxRules();
  const isEquity = EQUITY_CATEGORIES.includes(input.assetCategory as typeof EQUITY_CATEGORIES[number]);
  const classification = classifyIncome(input);

  if (classification.incomeType === "Business Income") {
    if (input.frequencyOfTransactions === "High") {
      insights.push({
        type: "gst_warning",
        title: "GST may apply",
        description: "Frequent trading reported as business income. If turnover exceeds threshold, GST registration and compliance may be required.",
        actionable: "Verify GST applicability with your CA.",
      });
    }
    return insights;
  }

  const gain = Math.max(0, input.saleValue - input.purchaseCost);
  const saleDateForFY = input.simulateSaleDate || input.saleDate;
  const saleFY = getFYFromDate(saleDateForFY);
  const purchaseFY = getFYFromDate(input.purchaseDate);

  if (taxResult.exemptions > 0) {
    insights.push({
      type: "exemption_usage",
      title: "Equity LTCG exemption used",
      description: `₹${(taxResult.exemptions / 1_00_000).toFixed(2)} Lakh exemption applied. Taxable LTCG reduced.`,
      impactAmount: taxResult.exemptions * (rules.equityLtcgRate / 100),
    });
  }

  if (indexation?.applies && indexation.taxSavedDueToIndexation > 0) {
    insights.push({
      type: "indexation_saving",
      title: "Indexation saved tax",
      description: `Indexed cost (CII ${indexation.ciiPurchase} → ${indexation.ciiSale}) reduced taxable gain.`,
      impactAmount: indexation.taxSavedDueToIndexation,
      actionable: "Ensure purchase year CII is correctly used for cost inflation.",
    });
  }

  if (isEquity && holding.isShortTerm) {
    const daysToLtcg = rules.equityStcgMonths * 30 - holding.holdingDays;
    if (daysToLtcg > 0) {
      const currentSale = input.simulateSaleDate || input.saleDate;
      const futureSaleDate = addDays(currentSale, daysToLtcg);
      const simInput: AssetInput = { ...input, simulateSaleDate: futureSaleDate };
      const simTax = computeTax(simInput);
      const taxReduction = taxResult.totalTaxLiability - simTax.totalTaxLiability;
      if (taxReduction > 0) {
        insights.push({
          type: "hold_for_ltcg",
          title: "Hold for LTCG to reduce tax",
          description: `If you sell after ${daysToLtcg} more days (${futureSaleDate}), gain becomes LTCG. Tax @ 10% above ₹1.25 Lakh vs 15% STCG now.`,
          impactAmount: taxReduction,
          impactPercent: (taxReduction / taxResult.totalTaxLiability) * 100,
          actionable: `Selling on or after ${futureSaleDate} may reduce tax by ₹${Math.round(taxReduction).toLocaleString("en-IN")}.`,
        });
      }
    }
  } else if (!isEquity && holding.isShortTerm && input.assetCategory !== "debt_mf") {
    const monthsToLtcg = rules.nonEquityLtcgMonths - holding.holdingMonths;
    if (monthsToLtcg > 0) {
      const daysToAdd = monthsToLtcg * 30;
      const currentSale = input.simulateSaleDate || input.saleDate;
      const futureSale = addDays(currentSale, daysToAdd);
      const simInput: AssetInput = { ...input, simulateSaleDate: futureSale };
      const simTax = computeTax(simInput);
      const taxReduction = taxResult.totalTaxLiability - simTax.totalTaxLiability;
      if (taxReduction > 0) {
        insights.push({
          type: "hold_for_ltcg",
          title: "Hold for LTCG (24 months)",
          description: `If you sell after ${monthsToLtcg} more months, gain qualifies for 20% with indexation instead of slab.`,
          impactAmount: taxReduction,
          impactPercent: (taxReduction / taxResult.totalTaxLiability) * 100,
          actionable: `Selling on or after ~${futureSale} may reduce tax by ₹${Math.round(taxReduction).toLocaleString("en-IN")}.`,
        });
      }
    }
  }

  const nextFYStart = saleFY.slice(0, 4) === "2024" ? "2025-04-01" : `${parseInt(saleFY.slice(0, 4)) + 1}-04-01`;
  const saleDate = new Date(saleDateForFY);
  const apr1 = new Date(nextFYStart);
  if (saleDate < apr1 && saleDate >= new Date(`${apr1.getFullYear() - 1}-04-01`)) {
    const daysToNextFY = Math.ceil((apr1.getTime() - saleDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysToNextFY <= 90 && daysToNextFY > 0) {
      const simInput: AssetInput = { ...input, simulateSaleDate: nextFYStart };
      const simTax = computeTax(simInput);
      const save = taxResult.totalTaxLiability - simTax.totalTaxLiability;
      if (save > 0) {
        insights.push({
          type: "sell_next_fy",
          title: "Selling in next FY may save tax",
          description: `If you defer sale to ${nextFYStart} (next financial year), tax could be lower due to FY-specific utilisation of exemptions or slab.`,
          impactAmount: save,
          actionable: `Deferring sale by ${daysToNextFY} days to ${nextFYStart} may save ₹${Math.round(save).toLocaleString("en-IN")}.`,
        });
      }
    }
  }

  if (input.country === "Foreign" || input.assetCategory === "foreign_equity" || input.assetCategory === "foreign_property") {
    insights.push({
      type: "schedule_fa",
      title: "Schedule FA reporting",
      description: "Foreign assets must be reported in ITR Schedule FA. Ensure disclosure of foreign equity/property and any foreign income.",
      actionable: "Fill Schedule FA and report in Form 67 if claiming FTC.",
    });
  }

  return insights;
}
