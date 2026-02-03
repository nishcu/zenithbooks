/**
 * Account Matcher
 * Matches narration keywords to Chart of Accounts with phrase priority and context rules.
 * Core feature: accurate expense/income mapping for Smart Entry (marketing-critical).
 */

import type { ChartOfAccount, ParsedNarration } from "./types";
import { DEFAULT_CHART_OF_ACCOUNTS } from "./constants";

/** Base score per keyword match; longer (phrase) matches get bonus to prefer specific intent */
const KEYWORD_BASE_SCORE = 8;
const PHRASE_BONUS_PER_WORD = 2; // multi-word keyword = more specific, higher score

/**
 * Find matching accounts from Chart of Accounts
 */
export function findMatchingAccounts(
  narration: ParsedNarration,
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): ChartOfAccount[] {
  const lowerNarration = narration.originalNarration.toLowerCase();
  const matches: Array<{ account: ChartOfAccount; score: number }> = [];

  for (const account of chartOfAccounts) {
    let score = 0;

    // Keyword matches with phrase priority: longer phrases score higher (e.g. "advance salary" > "salary")
    for (const keyword of account.keywords) {
      const kw = keyword.toLowerCase();
      if (lowerNarration.includes(kw)) {
        const wordCount = kw.trim().split(/\s+/).length;
        score += KEYWORD_BASE_SCORE + (wordCount > 1 ? wordCount * PHRASE_BONUS_PER_WORD : 0);
      }
    }

    // ---- Advance/Prepaid → Asset ----
    if (narration.isAdvance || narration.isPrepaid) {
      if (account.type === "Asset" && (account.name.toLowerCase().includes("prepaid") || account.name.toLowerCase().includes("advance"))) {
        score += 25;
      }
      if (lowerNarration.includes("rent") && account.name.toLowerCase().includes("prepaid rent")) {
        score += 35;
      }
      if (lowerNarration.includes("salary") && account.name.toLowerCase().includes("prepaid salary")) {
        score += 35;
      }
      if (account.type === "Expense") {
        score -= 18;
      }
    }

    // ---- Outstanding → Liability ----
    if (narration.isOutstanding) {
      if (account.type === "Liability" && (account.name.toLowerCase().includes("outstanding") || account.name.toLowerCase().includes("accrued"))) {
        score += 25;
      }
      if (lowerNarration.includes("rent") && account.name.toLowerCase().includes("outstanding rent")) {
        score += 35;
      }
      if (lowerNarration.includes("salary") && account.name.toLowerCase().includes("outstanding salary")) {
        score += 35;
      }
      if (account.type === "Expense") {
        score -= 18;
      }
    }

    // ---- Personal → Drawings ----
    if (narration.isPersonal) {
      if (account.type === "Equity" && account.name.toLowerCase().includes("drawings")) {
        score += 50;
      }
      if (account.type === "Expense") {
        score -= 35;
      }
    }

    // ---- Transaction type hint ----
    if (!narration.isAdvance && !narration.isPrepaid && !narration.isOutstanding) {
      if (narration.transactionType === "purchase" || narration.transactionType === "expense") {
        if (account.type === "Expense") score += 5;
      }
      if (narration.transactionType === "sale" || narration.transactionType === "income") {
        if (account.type === "Income" || account.type === "Revenue" || account.type === "Other Income") score += 5;
      }
    }

    // ---- Payment mode ----
    if (narration.paymentMode === "cash" && account.name.toLowerCase().includes("cash")) {
      score += 10;
    }
    if (narration.paymentMode === "bank" && account.name.toLowerCase().includes("bank")) {
      score += 10;
    }
    if (narration.paymentMode === "upi" && account.name.toLowerCase().includes("upi")) {
      score += 10;
    }

    // ---- Context: Delivery/Freight outward (delivering goods to customers) → Freight Outwards only ----
    const isDeliveryOutward =
      (lowerNarration.includes("delivering") || lowerNarration.includes("delivery") || lowerNarration.includes("freight") || lowerNarration.includes("dispatch")) &&
      (lowerNarration.includes("goods") || lowerNarration.includes("customers") || lowerNarration.includes("customer") || lowerNarration.includes("to client"));
    if (isDeliveryOutward && account.type === "Expense") {
      if (account.name.toLowerCase().includes("freight") || account.name.toLowerCase().includes("cartage outward") || account.name.toLowerCase().includes("postage")) {
        score += 30;
      }
      if (account.name.toLowerCase().includes("purchase") && !account.name.toLowerCase().includes("return")) {
        score -= 20;
      }
    }

    // ---- Context: Salary/Wages → Salaries and Wages only (never Office / Stationery) ----
    const isSalaryContext =
      lowerNarration.includes("salary") || lowerNarration.includes("salaries") || lowerNarration.includes("wages") || lowerNarration.includes("payroll") || lowerNarration.includes("pay slip") || lowerNarration.includes("payslip");
    if (isSalaryContext && account.type === "Expense") {
      if (account.name.toLowerCase().includes("salaries") || account.name.toLowerCase().includes("wages")) {
        score += 30;
      }
      if (account.name.toLowerCase().includes("office") && !account.name.toLowerCase().includes("salary")) {
        score -= 20;
      }
      if (account.name.toLowerCase().includes("stationery") || account.name.toLowerCase().includes("stationary")) {
        score -= 20;
      }
    }

    // ---- Context: Electricity/Power/Light bill → Electricity only (not generic "bill") ----
    const isElectricityContext =
      lowerNarration.includes("electricity") || lowerNarration.includes("electric") || lowerNarration.includes("power bill") || lowerNarration.includes("light bill") || lowerNarration.includes("current bill") || lowerNarration.includes("eb bill");
    if (isElectricityContext && account.type === "Expense") {
      if (account.name.toLowerCase().includes("electricity") || account.name.toLowerCase().includes("power") || account.name.toLowerCase().includes("water")) {
        score += 22;
      }
    }

    // ---- Context: Carriage/Freight inward (on purchase) → Carriage Inwards only ----
    const isCarriageInward =
      (lowerNarration.includes("carriage inward") || lowerNarration.includes("freight inward") || lowerNarration.includes("cartage inward") || lowerNarration.includes("transport for purchase") || lowerNarration.includes("bringing goods"));
    if (isCarriageInward && account.type === "Expense") {
      if (account.name.toLowerCase().includes("carriage inward") || account.name.toLowerCase().includes("freight inward")) {
        score += 28;
      }
      if (account.name.toLowerCase().includes("freight out") || account.name.toLowerCase().includes("cartage outward")) {
        score -= 18;
      }
    }

    // ---- Context: Bank charges/fee → Bank Charges only ----
    const isBankChargesContext = lowerNarration.includes("bank charge") || lowerNarration.includes("bank fee") || lowerNarration.includes("ledger fee") || lowerNarration.includes("sms charge") || lowerNarration.includes("transaction charge");
    if (isBankChargesContext && account.type === "Expense") {
      if (account.name.toLowerCase().includes("bank charge")) {
        score += 25;
      }
    }

    // ---- Context: Insurance premium → Insurance Expense only ----
    const isInsuranceContext = lowerNarration.includes("insurance") || lowerNarration.includes("premium");
    if (isInsuranceContext && account.type === "Expense" && !lowerNarration.includes("prepaid insurance")) {
      if (account.name.toLowerCase().includes("insurance") && !account.name.toLowerCase().includes("prepaid")) {
        score += 20;
      }
    }

    // ---- Context: Rent (not advance) → Rent Expense only ----
    const isRentContext =
      (lowerNarration.includes("rent") || lowerNarration.includes("rental") || lowerNarration.includes("lease")) &&
      !lowerNarration.includes("advance") && !lowerNarration.includes("prepaid") && !lowerNarration.includes("outstanding");
    if (isRentContext && account.type === "Expense") {
      if (account.name.toLowerCase().includes("rent") && !account.name.toLowerCase().includes("prepaid") && !account.name.toLowerCase().includes("outstanding")) {
        score += 18;
      }
    }

    // ---- Context: Audit/Legal/Professional → Professional/Audit/Legal only ----
    const isProfessionalContext =
      lowerNarration.includes("audit") || lowerNarration.includes("advocate") || lowerNarration.includes("lawyer") || lowerNarration.includes("legal") || lowerNarration.includes("ca ") || lowerNarration.includes("chartered accountant") || lowerNarration.includes("consultant");
    if (isProfessionalContext && account.type === "Expense") {
      if (account.name.toLowerCase().includes("audit") || account.name.toLowerCase().includes("legal") || account.name.toLowerCase().includes("professional") || account.name.toLowerCase().includes("advocate")) {
        score += 20;
      }
    }

    // ---- Context: Postage/Courier → Postage & Courier (not Freight Outwards for small parcels) ----
    const isPostageContext = lowerNarration.includes("postage") || lowerNarration.includes("courier") || lowerNarration.includes("speed post") || lowerNarration.includes("parcel") || lowerNarration.includes("registered post");
    if (isPostageContext && account.type === "Expense") {
      if (account.name.toLowerCase().includes("postage") || account.name.toLowerCase().includes("courier")) {
        score += 22;
      }
    }

    // ---- Conflict: "Purchase" without delivery context → prefer Purchase of Goods; "material" alone with "purchase" ----
    const hasPurchaseWord = lowerNarration.includes("purchase") || lowerNarration.includes("purchased") || lowerNarration.includes("bought");
    const noDelivery = !lowerNarration.includes("delivering") && !lowerNarration.includes("delivery to");
    if (hasPurchaseWord && noDelivery && account.type === "Expense") {
      if (account.name.toLowerCase().includes("purchase") || account.name.toLowerCase().includes("cogs")) {
        score += 12;
      }
    }

    if (score > 0) {
      matches.push({ account, score });
    }
  }

  // Deduplicate by account code (same account may appear from merged chart) and sort by score
  const byCode = new Map<string, { account: ChartOfAccount; score: number }>();
  for (const m of matches) {
    const existing = byCode.get(m.account.code);
    if (!existing || existing.score < m.score) {
      byCode.set(m.account.code, m);
    }
  }

  return Array.from(byCode.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((m) => m.account);
}

/**
 * Get default account for payment mode
 */
export function getPaymentModeAccount(
  paymentMode: string | undefined,
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): ChartOfAccount | undefined {
  if (!paymentMode) return undefined;

  const lowerMode = paymentMode.toLowerCase();

  if (lowerMode === "cash") {
    return chartOfAccounts.find((a) => a.name.toLowerCase().includes("cash"));
  }
  if (lowerMode === "bank" || lowerMode === "cheque" || lowerMode === "neft" || lowerMode === "rtgs") {
    return chartOfAccounts.find((a) => a.name.toLowerCase().includes("bank"));
  }
  if (lowerMode === "upi") {
    return chartOfAccounts.find((a) => a.name.toLowerCase().includes("upi"));
  }

  return undefined;
}

/**
 * Get default expense account (used when no keyword match; prefer Office Expenses / Miscellaneous)
 */
export function getDefaultExpenseAccount(
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): ChartOfAccount | undefined {
  return (
    chartOfAccounts.find((a) => a.type === "Expense" && a.code === "5001") || // Office Expenses
    chartOfAccounts.find((a) => a.type === "Expense" && a.code === "6120") || // Miscellaneous
    chartOfAccounts.find((a) => a.type === "Expense")
  );
}

/**
 * Get default income account
 */
export function getDefaultIncomeAccount(
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): ChartOfAccount | undefined {
  return chartOfAccounts.find((a) => a.type === "Income" && a.code === "4001"); // Sales
}
