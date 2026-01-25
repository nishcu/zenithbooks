/**
 * Income Classification Engine
 * Auto-classify as Capital Gains vs Business Income based on
 * holding period, frequency, and user-declared intent.
 */

import type { AssetInput, IncomeClassification, IncomeType, GainType } from "./types";
import { getTaxRules } from "./config/tax-rules";
import { computeHoldingDays } from "./holding-period-engine";

const EQUITY_CATEGORIES = ["equity_shares", "equity_mf"] as const;
const FREQUENCY_WEIGHT = { Low: 0, Medium: 1, High: 2 } as const;

export function classifyIncome(input: AssetInput): IncomeClassification {
  const rules = getTaxRules();
  const saleDate = input.simulateSaleDate || input.saleDate;
  const holdingDays = computeHoldingDays(input.purchaseDate, saleDate);
  const factors: { factor: string; outcome: string }[] = [];

  // 1. User-declared intent
  const isTrading = input.modeOfHolding === "Trading";
  factors.push({
    factor: "Mode of holding",
    outcome: input.modeOfHolding === "Investment" ? "Investment → supports Capital Gains" : "Trading → may support Business Income",
  });

  // 2. Frequency of transactions
  const freqWeight = FREQUENCY_WEIGHT[input.frequencyOfTransactions];
  factors.push({
    factor: "Transaction frequency",
    outcome: `${
      input.frequencyOfTransactions === "Low"
        ? "Low → supports Capital Gains"
        : input.frequencyOfTransactions === "High"
          ? "High → supports Business Income"
          : "Medium → neutral"
    }`,
  });

  // 3. Crypto: often treated as business if trading, else speculative CG
  if (input.assetCategory === "crypto" || input.isCrypto) {
    factors.push({
      factor: "Asset type",
      outcome: "Crypto – typically taxed as capital gains; frequent trading may invite Business Income treatment.",
    });
  }

  // 4. Holding period vs thresholds
  const isEquity = EQUITY_CATEGORIES.includes(input.assetCategory as typeof EQUITY_CATEGORIES[number]);
  const stcgThresholdDays = rules.equityStcgMonths * 30;
  const ltcgThresholdDays = rules.nonEquityLtcgMonths * 30;

  if (isEquity) {
    factors.push({
      factor: "Holding period (equity)",
      outcome:
        holdingDays <= stcgThresholdDays
          ? `≤ ${rules.equityStcgMonths} months → STCG`
          : `> ${rules.equityStcgMonths} months → LTCG`,
    });
  } else {
    factors.push({
      factor: "Holding period (non-equity)",
      outcome:
        holdingDays <= ltcgThresholdDays
          ? `≤ ${rules.nonEquityLtcgMonths} months → STCG`
          : `> ${rules.nonEquityLtcgMonths} months → LTCG (indexation if applicable)`,
    });
  }

  // Decision logic: Business Income vs Capital Gains
  let incomeType: IncomeType = "Capital Gains";
  let gainType: GainType | null = isEquity
    ? holdingDays <= stcgThresholdDays
      ? "STCG"
      : "LTCG"
    : holdingDays <= ltcgThresholdDays
      ? "STCG"
      : "LTCG";

  // Override to Business Income when:
  // - Trading intent AND (High frequency OR substantial volume indicator)
  // - CBDT/ITAT guidance: repeated trades + trading intent often = business
  const strongBusinessSignals =
    isTrading && (freqWeight >= 1 || (freqWeight === 1 && holdingDays < 90));

  if (strongBusinessSignals) {
    incomeType = "Business Income";
    gainType = "Business";
    factors.push({
      factor: "Classification result",
      outcome: "Trading intent with Medium/High frequency suggests Business Income. Consider ITR Schedule BP.",
    });
  } else {
    factors.push({
      factor: "Classification result",
      outcome: `Treated as ${incomeType} (${gainType}). Report in ITR Schedule CG.`,
    });
  }

  const reasoningText = buildReasoningText(incomeType, gainType, factors);

  return {
    incomeType,
    gainType,
    reasoningText,
    factors,
  };
}

function buildReasoningText(
  incomeType: IncomeType,
  gainType: GainType | null,
  factors: { factor: string; outcome: string }[]
): string {
  const main =
    incomeType === "Business Income"
      ? "Based on your mode of holding (Trading) and transaction frequency, this gain is classified as Business Income. It will be added to your other income and taxed at slab rates. GST may apply if you are frequently trading."
      : `This gain is classified as Capital Gains (${gainType}). ${gainType === "LTCG" ? "Long-term rates and indexation (where applicable) apply." : "Short-term rates apply."} Report in ITR Schedule CG.`;

  const extras = factors
    .filter((f) => f.factor !== "Classification result")
    .map((f) => `${f.factor}: ${f.outcome}`)
    .join(" ");

  return `${main} ${extras}`;
}
