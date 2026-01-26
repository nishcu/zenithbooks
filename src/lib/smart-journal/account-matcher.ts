/**
 * Account Matcher
 * Matches narration keywords to Chart of Accounts
 */

import type { ChartOfAccount, ParsedNarration } from "./types";
import { DEFAULT_CHART_OF_ACCOUNTS } from "./constants";

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

    // Check keyword matches
    for (const keyword of account.keywords) {
      if (lowerNarration.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }

    // Priority: Advance/Prepaid = Asset, Outstanding = Liability
    if (narration.isAdvance || narration.isPrepaid) {
      // For advance/prepaid, prioritize Asset accounts (Prepaid Expenses)
      if (account.type === "Asset" && (account.name.toLowerCase().includes("prepaid") || account.name.toLowerCase().includes("advance"))) {
        score += 20; // High priority for prepaid accounts
      }
      // If it's rent advance, prioritize Prepaid Rent
      if (lowerNarration.includes("rent") && account.name.toLowerCase().includes("prepaid rent")) {
        score += 30; // Highest priority
      }
      // Penalize expense accounts for advance/prepaid
      if (account.type === "Expense") {
        score -= 15; // Reduce score for expense accounts
      }
    }

    if (narration.isOutstanding) {
      // For outstanding, prioritize Liability accounts
      if (account.type === "Liability" && (account.name.toLowerCase().includes("outstanding") || account.name.toLowerCase().includes("accrued"))) {
        score += 20; // High priority for outstanding accounts
      }
      // If it's outstanding rent, prioritize Outstanding Rent
      if (lowerNarration.includes("rent") && account.name.toLowerCase().includes("outstanding rent")) {
        score += 30; // Highest priority
      }
      // Penalize expense accounts for outstanding
      if (account.type === "Expense") {
        score -= 15; // Reduce score for expense accounts
      }
    }

    // Priority: Personal expenses = Drawings (Equity), not Expense
    if (narration.isPersonal) {
      // For personal expenses, prioritize Drawings account
      if (account.type === "Equity" && account.name.toLowerCase().includes("drawings")) {
        score += 50; // Highest priority for Drawings
      }
      // Penalize expense accounts for personal use
      if (account.type === "Expense") {
        score -= 30; // Strongly penalize expense accounts for personal use
      }
    }

    // Type-based matching (only if not advance/prepaid/outstanding)
    if (!narration.isAdvance && !narration.isPrepaid && !narration.isOutstanding) {
      if (narration.transactionType === "purchase" || narration.transactionType === "expense") {
        if (account.type === "Expense") score += 5;
      }
      if (narration.transactionType === "sale" || narration.transactionType === "income") {
        if (account.type === "Income") score += 5;
      }
    }

    // Payment mode matching
    if (narration.paymentMode === "cash" && account.name.toLowerCase().includes("cash")) {
      score += 10;
    }
    if (narration.paymentMode === "bank" && account.name.toLowerCase().includes("bank")) {
      score += 10;
    }
    if (narration.paymentMode === "upi" && account.name.toLowerCase().includes("upi")) {
      score += 10;
    }

    if (score > 0) {
      matches.push({ account, score });
    }
  }

  // Sort by score and return top matches
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
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
 * Get default expense account
 */
export function getDefaultExpenseAccount(
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): ChartOfAccount | undefined {
  return chartOfAccounts.find((a) => a.type === "Expense" && a.code === "5001"); // Office Expenses
}

/**
 * Get default income account
 */
export function getDefaultIncomeAccount(
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): ChartOfAccount | undefined {
  return chartOfAccounts.find((a) => a.type === "Income" && a.code === "4001"); // Sales
}
