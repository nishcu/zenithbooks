/**
 * Indexation Engine
 * CII-based indexed cost for LTCG where indexation applies.
 * Includes cost of improvements (indexed separately) and transfer expenses.
 */

import type { AssetInput, IndexationResult, IndexedImprovement } from "./types";
import { getTaxRules, getCIIForFY, getFYFromDate } from "./config/tax-rules";
import { computeHoldingPeriodDetails } from "./holding-period-engine";

const INDEXATION_ASSETS: readonly string[] = [
  "gold", "silver", "commodities", "real_estate", "foreign_equity", "foreign_property",
];

export function computeIndexation(input: AssetInput): IndexationResult | null {
  const rules = getTaxRules();
  const holding = computeHoldingPeriodDetails(input);

  if (!holding.isLongTerm) return null;
  if (input.assetCategory === "debt_mf") return null;
  if (input.assetCategory === "equity_shares" || input.assetCategory === "equity_mf") return null;
  if (input.assetCategory === "crypto") return null; // Crypto: no indexation as per current law
  if (!INDEXATION_ASSETS.includes(input.assetCategory)) return null;

  const purchaseDate = new Date(input.purchaseDate);
  const purchaseFY = getFYFromDate(input.purchaseDate);
  const saleDate = input.simulateSaleDate || input.saleDate;
  const saleFY = getFYFromDate(saleDate);
  
  // Check if purchase is before 01-04-2001 (base year for CII)
  // As per Income Tax Act: For assets acquired before 01-04-2001, indexation is done from 2001-02 (CII = 100)
  const baseYearDate = new Date("2001-04-01");
  const isPreBaseYear = purchaseDate < baseYearDate;
  
  // Use 2001-02 (CII = 100) as base for pre-2001-02 purchases
  const effectivePurchaseFY = isPreBaseYear ? "2001-02" : purchaseFY;
  const ciiPurchase = isPreBaseYear ? 100 : (getCIIForFY(purchaseFY) ?? 100);
  const ciiSale = getCIIForFY(saleFY);

  // Check if CII is available for sale FY (must be available for indexation to work)
  if (ciiSale == null || ciiSale <= 0) {
    const transferExpenses = input.transferExpenses || 0;
    // Return applies: false so tax calculation falls back to non-indexed method
    return {
      applies: false,
      purchaseFY: effectivePurchaseFY,
      saleFY,
      ciiPurchase: ciiPurchase ?? 100,
      ciiSale: ciiSale ?? 0,
      indexedPurchaseCost: input.purchaseCost,
      indexedImprovements: [],
      totalIndexedCost: input.purchaseCost,
      transferExpenses,
      finalIndexedCost: input.purchaseCost + transferExpenses,
      taxWithIndexation: 0,
      taxWithoutIndexation: 0,
      taxSavedDueToIndexation: 0,
    };
  }

  // Index purchase cost
  // For pre-2001-02 purchases, index from 2001-02 (CII = 100) onwards
  const indexedPurchaseCost = (input.purchaseCost * ciiSale) / ciiPurchase;

  // Index improvements separately (each improvement indexed from its own FY)
  const indexedImprovements: IndexedImprovement[] = [];
  let totalIndexedImprovements = 0;

  if (input.improvements && input.improvements.length > 0) {
    for (const improvement of input.improvements) {
      const improvementDate = new Date(improvement.date);
      const improvementFY = getFYFromDate(improvement.date);
      
      // For improvements before 01-04-2001, use 2001-02 (CII = 100) as base
      const isImprovementPreBaseYear = improvementDate < baseYearDate;
      const effectiveImprovementFY = isImprovementPreBaseYear ? "2001-02" : improvementFY;
      const ciiImprovement = isImprovementPreBaseYear ? 100 : (getCIIForFY(improvementFY) ?? 100);
      
      if (ciiImprovement > 0) {
        const indexedAmount = (improvement.amount * ciiSale) / ciiImprovement;
        totalIndexedImprovements += indexedAmount;
        indexedImprovements.push({
          date: improvement.date,
          amount: improvement.amount,
          improvementFY: effectiveImprovementFY,
          ciiImprovement,
          indexedAmount,
          description: improvement.description,
        });
      } else {
        // Fallback: if CII not available, use original amount (no indexation)
        totalIndexedImprovements += improvement.amount;
        indexedImprovements.push({
          date: improvement.date,
          amount: improvement.amount,
          improvementFY: effectiveImprovementFY,
          ciiImprovement: 0,
          indexedAmount: improvement.amount,
          description: improvement.description,
        });
      }
    }
  }

  const totalIndexedCost = indexedPurchaseCost + totalIndexedImprovements;
  const transferExpenses = input.transferExpenses || 0;
  const finalIndexedCost = totalIndexedCost + transferExpenses;

  // Calculate tax with indexation
  const gainIndexed = Math.max(0, input.saleValue - finalIndexedCost);
  const taxWithIndexation = gainIndexed * (rules.nonEquityLtcgRate / 100);

  // Calculate tax without indexation (for comparison)
  const totalOriginalCost = input.purchaseCost + 
    (input.improvements?.reduce((sum, imp) => sum + imp.amount, 0) || 0) + 
    transferExpenses;
  const gainWithoutIndexation = Math.max(0, input.saleValue - totalOriginalCost);
  const taxWithoutIndexation = gainWithoutIndexation * (rules.nonEquityLtcgRate / 100);

  const taxSavedDueToIndexation = Math.max(0, taxWithoutIndexation - taxWithIndexation);

  return {
    applies: true,
    purchaseFY: effectivePurchaseFY, // Use effective FY (2001-02 for pre-base year purchases)
    saleFY,
    ciiPurchase,
    ciiSale,
    indexedPurchaseCost,
    indexedImprovements,
    totalIndexedCost,
    transferExpenses,
    finalIndexedCost,
    taxWithIndexation,
    taxWithoutIndexation,
    taxSavedDueToIndexation,
  };
}
