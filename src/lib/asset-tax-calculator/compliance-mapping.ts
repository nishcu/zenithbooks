/**
 * Compliance Mapping – ITR Schedules, AIS, auto-fill JSON
 */

import type { AssetInput, ComplianceMapping, IncomeClassification, TaxComputation } from "./types";
import { getFYFromDate } from "./config/tax-rules";

export function buildComplianceMapping(
  input: AssetInput,
  classification: IncomeClassification,
  tax: TaxComputation
): ComplianceMapping {
  const saleDate = input.simulateSaleDate || input.saleDate;
  const saleFY = getFYFromDate(saleDate);
  const scheduleCG = classification.incomeType === "Capital Gains";
  const scheduleBP = classification.incomeType === "Business Income";
  const scheduleFA =
    input.country === "Foreign" ||
    input.assetCategory === "foreign_equity" ||
    input.assetCategory === "foreign_property";

  const aisFlags: string[] = [];
  if (input.assetCategory === "equity_shares" || input.assetCategory === "equity_mf")
    aisFlags.push("AIS_CA_CAPITAL_GAINS_EQUITY");
  if (input.assetCategory === "debt_mf") aisFlags.push("AIS_CA_DEBT_MF");
  if (input.assetCategory === "crypto" || input.isCrypto) aisFlags.push("AIS_CA_CRYPTO");
  if (scheduleFA) aisFlags.push("AIS_CA_FOREIGN_ASSETS_SCHEDULE_FA");
  if (classification.gainType === "STCG") aisFlags.push("AIS_CG_STCG");
  if (classification.gainType === "LTCG") aisFlags.push("AIS_CG_LTCG");

  const itrAutoFillJson: Record<string, unknown> = {
    schedule: scheduleCG ? "CG" : scheduleBP ? "BP" : undefined,
    scheduleFA: scheduleFA || undefined,
    financialYear: saleFY,
    assetCategory: input.assetCategory,
    purchaseDate: input.purchaseDate,
    purchaseCost: input.purchaseCost,
    saleDate,
    saleValue: input.saleValue,
    capitalGain: tax.capitalGainAmount,
    exemptions: tax.exemptions,
    taxableAmount: tax.taxableAmount,
    taxPayable: tax.totalTaxLiability,
    incomeType: classification.incomeType,
    gainType: classification.gainType,
  };

  return {
    scheduleCG,
    scheduleBP,
    scheduleFA,
    aisReconciliationFlags: aisFlags,
    itrAutoFillJson,
  };
}
