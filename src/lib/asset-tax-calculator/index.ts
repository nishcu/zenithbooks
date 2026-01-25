/**
 * Intelligent Asset Tax Calculator – Orchestrator
 * ZenithBooks | Indian Income Tax – Capital Gains & Asset Classification
 */

import type { AssetInput, AssetTaxCalculatorResult } from "./types";
import { ASSET_CATEGORY_LABELS } from "./constants";
import { classifyIncome } from "./classification-engine";
import { computeHoldingPeriodDetails } from "./holding-period-engine";
import { computeIndexation } from "./indexation-engine";
import { computeTax } from "./tax-calculation-engine";
import { generateOptimizationInsights } from "./optimization-engine";
import { buildComplianceMapping } from "./compliance-mapping";
import { getTaxRules } from "./config/tax-rules";

export function runAssetTaxCalculator(input: AssetInput): AssetTaxCalculatorResult {
  const warnings: string[] = [];
  const totalCost = input.purchaseCost + 
    (input.improvements?.reduce((sum, imp) => sum + imp.amount, 0) || 0) +
    (input.transferExpenses || 0);
  const gain = input.saleValue - totalCost;

  if (gain < 0) {
    warnings.push("This calculation is for a loss. Tax on loss may involve carry-forward; only gain scenarios are fully computed.");
  }

  const classification = classifyIncome(input);
  const holding = computeHoldingPeriodDetails(input);
  const indexation = computeIndexation(input);
  const tax = computeTax({ ...input, includeCess: true });
  const optimizationInsights = generateOptimizationInsights(input, tax, indexation, holding);
  const complianceMapping = buildComplianceMapping(input, classification, tax);

  const rules = getTaxRules();
  if (tax.taxableAmount > 5_000_000) {
    warnings.push("Surcharge may apply if your total income exceeds ₹50 Lakh. This calculator uses only the gain for surcharge; total tax may be higher.");
  }

  if (input.assetCategory === "crypto" || input.isCrypto) {
    warnings.push("Crypto gains: 1% TDS on transfer (where applicable) and reporting in ITR. Ensure Schedule SFT-2 / VDA disclosure.");
  }

  const categoryLabel = ASSET_CATEGORY_LABELS[input.assetCategory];

  const assetSummary = {
    category: input.assetCategory,
    categoryLabel,
    purchaseCost: input.purchaseCost,
    saleValue: input.saleValue,
    gainLoss: gain,
    country: input.country,
    modeOfHolding: input.modeOfHolding,
    frequencyOfTransactions: input.frequencyOfTransactions,
    isCrypto: input.assetCategory === "crypto" || !!input.isCrypto,
  };

  return {
    assetSummary,
    incomeClassification: classification,
    holdingPeriodDetails: holding,
    indexation,
    taxComputation: tax,
    optimizationInsights,
    complianceMapping,
    warnings,
  };
}

export * from "./types";
export * from "./constants";
export * from "./config/tax-rules";
export { classifyIncome } from "./classification-engine";
export { computeHoldingPeriodDetails, computeHoldingDays } from "./holding-period-engine";
export { computeIndexation } from "./indexation-engine";
export { computeTax } from "./tax-calculation-engine";
export { generateOptimizationInsights } from "./optimization-engine";
export { buildComplianceMapping } from "./compliance-mapping";
