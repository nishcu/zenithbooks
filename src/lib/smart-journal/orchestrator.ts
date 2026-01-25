/**
 * Smart Journal Entry Orchestrator
 * Main entry point for converting narration to journal entry
 */

import type {
  ParsingResult,
  JournalEntry,
  JournalConfirmation,
  GSTConfig,
  ChartOfAccount,
} from "./types";
import { parseNarration } from "./nlp-parser";
import { detectGST } from "./gst-engine";
import { generateJournalEntry } from "./accounting-rules";
import { DEFAULT_GST_CONFIG, DEFAULT_CHART_OF_ACCOUNTS } from "./constants";

/**
 * Process narration and generate journal entry
 */
export function processNarration(
  narration: string,
  gstConfig: GSTConfig = DEFAULT_GST_CONFIG,
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): ParsingResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse narration
  const parsed = parseNarration(narration);

  // Validate amount
  if (!parsed.amount) {
    errors.push("Amount not found in narration. Please specify amount.");
  }

  // Detect GST
  let gstDetails;
  if (parsed.amount) {
    gstDetails = detectGST(narration, parsed.amount, gstConfig);
  }

  // Generate journal entry
  let journalEntry: JournalEntry | undefined;
  let suggestedVoucherType: any = "Journal";

  try {
    journalEntry = generateJournalEntry(parsed, gstDetails, chartOfAccounts);
    suggestedVoucherType = journalEntry.voucherType;
  } catch (error: any) {
    errors.push(`Failed to generate journal entry: ${error.message}`);
  }

  // Warnings
  if (parsed.confidence < 0.7) {
    warnings.push("Low confidence in parsing. Please review the generated entry.");
  }
  if (!parsed.paymentMode) {
    warnings.push("Payment mode not detected. Defaulting to cash.");
  }
  if (journalEntry && !journalEntry.isBalanced) {
    warnings.push("Journal entry is not balanced. Please review amounts.");
  }

  // Find suggested accounts
  const suggestedAccounts = chartOfAccounts.filter((acc) =>
    journalEntry?.entries.some((e) => e.accountCode === acc.code)
  );

  return {
    parsed,
    suggestedAccounts,
    suggestedVoucherType,
    gstDetails,
    errors,
    warnings,
  };
}

/**
 * Create journal entry from parsing result
 */
export function createJournalEntry(
  parsingResult: ParsingResult,
  gstConfig: GSTConfig = DEFAULT_GST_CONFIG,
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const journalEntry = generateJournalEntry(
    parsingResult.parsed,
    parsingResult.gstDetails,
    chartOfAccounts
  );

  // Override voucher type if provided
  if (parsingResult.suggestedVoucherType) {
    journalEntry.voucherType = parsingResult.suggestedVoucherType;
  }

  return journalEntry;
}

/**
 * Validate journal entry before posting
 */
export function validateJournalEntry(entry: JournalEntry): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check balance
  if (!entry.isBalanced) {
    errors.push(`Entry not balanced. Debit: ${entry.totalDebit}, Credit: ${entry.totalCredit}`);
  }

  // Check minimum entries
  if (entry.entries.length < 2) {
    errors.push("Journal entry must have at least 2 accounts (one debit, one credit)");
  }

  // Check debit and credit entries exist
  const hasDebit = entry.entries.some((e) => e.isDebit);
  const hasCredit = entry.entries.some((e) => !e.isDebit);

  if (!hasDebit) {
    errors.push("No debit entry found");
  }
  if (!hasCredit) {
    errors.push("No credit entry found");
  }

  // Check amounts
  for (const e of entry.entries) {
    if (e.amount <= 0) {
      errors.push(`Invalid amount for ${e.accountName}: ${e.amount}`);
    }
  }

  // GST warnings
  if (entry.gstDetails && entry.gstDetails.isGSTApplicable) {
    if (entry.gstDetails.blockedCredit) {
      warnings.push(`ITC blocked: ${entry.gstDetails.reason || "Unknown reason"}`);
    }
    if (entry.gstDetails.isRCM) {
      warnings.push("Reverse Charge Mechanism (RCM) applicable. Ensure RCM liability is paid.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Apply user edits to journal entry
 */
export function applyUserEdits(
  entry: JournalEntry,
  edits: JournalConfirmation["userEdits"]
): JournalEntry {
  if (!edits) return entry;

  let updatedEntry = { ...entry };

  // Update voucher type
  if (edits.voucherType) {
    updatedEntry.voucherType = edits.voucherType;
  }

  // Update date
  if (edits.date) {
    updatedEntry.date = edits.date;
  }

  // Update narration
  if (edits.narration) {
    updatedEntry.narration = edits.narration;
  }

  // Update entries
  if (edits.entries) {
    updatedEntry.entries = entry.entries.map((e, index) => {
      const edit = edits.entries?.[index];
      if (edit) {
        return { ...e, ...edit };
      }
      return e;
    });

    // Recalculate totals
    updatedEntry.totalDebit = updatedEntry.entries
      .filter((e) => e.isDebit)
      .reduce((sum, e) => sum + e.amount, 0);
    updatedEntry.totalCredit = updatedEntry.entries
      .filter((e) => !e.isDebit)
      .reduce((sum, e) => sum + e.amount, 0);
    updatedEntry.isBalanced = Math.abs(updatedEntry.totalDebit - updatedEntry.totalCredit) < 0.01;
  }

  return updatedEntry;
}
