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
  GSTDetails,
} from "./types";
import { parseNarration } from "./nlp-parser";
import { detectGST, calculateGSTForEntry } from "./gst-engine";
import { generateJournalEntry, addGSTToEntry } from "./accounting-rules";
import { findOrCreatePartyAccount } from "./party-creator";
import { DEFAULT_GST_CONFIG, DEFAULT_CHART_OF_ACCOUNTS } from "./constants";

/**
 * Process narration and generate journal entry
 * Optionally creates party accounts if counterparty is detected
 */
export async function processNarration(
  narration: string,
  gstConfig: GSTConfig = DEFAULT_GST_CONFIG,
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS,
  userId?: string
): Promise<ParsingResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse narration
  const parsed = parseNarration(narration);

  // Validate amount
  if (!parsed.amount) {
    errors.push("Amount not found in narration. Please specify amount.");
  }

  // Create party account if counterparty detected and userId provided
  let partyAccount = null;
  if (parsed.counterparty && userId) {
    try {
      partyAccount = await findOrCreatePartyAccount(parsed, userId);
      if (partyAccount) {
        // Update chart of accounts with the new party account
        chartOfAccounts = [
          ...chartOfAccounts,
          {
            code: partyAccount.accountCode,
            name: partyAccount.accountName,
            type: partyAccount.accountType,
            keywords: [parsed.counterparty.toLowerCase()],
          },
        ];
      }
    } catch (error: any) {
      warnings.push(`Could not create party account: ${error.message}`);
    }
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
    // If party account was created, add it to chart of accounts before generating entry
    if (partyAccount) {
      chartOfAccounts = [
        ...chartOfAccounts,
        {
          code: partyAccount.accountCode,
          name: partyAccount.accountName,
          type: partyAccount.accountType,
          keywords: [parsed.counterparty!.toLowerCase()],
        },
      ];
    }
    
    journalEntry = generateJournalEntry(parsed, gstDetails, chartOfAccounts);
    
    // If party account was created, update the entry to use it
    if (partyAccount && journalEntry) {
      // Find entries that should use the party account
      // For sales: debtor entry (debit, liability/asset)
      // For purchases: creditor entry (credit, liability)
      const isSale = parsed.transactionType === "sale" || parsed.transactionType === "income";
      const entryToUpdate = journalEntry.entries.find((e) => {
        if (isSale) {
          // Sales: find debit entry that's a debtor (liability type or code 2002)
          return e.isDebit && (e.accountCode === "2002" || e.accountType === "Liability");
        } else {
          // Purchase: find credit entry that's a creditor (liability type or code 2001)
          return !e.isDebit && (e.accountCode === "2001" || e.accountType === "Liability");
        }
      });
      
      if (entryToUpdate) {
        entryToUpdate.accountCode = partyAccount.accountCode;
        entryToUpdate.accountName = partyAccount.accountName;
      }
    }
    
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
 * Add GST to an existing journal entry (post-processing)
 */
export function addGSTToJournalEntry(
  entry: JournalEntry,
  gstRate: number,
  isInclusive: boolean,
  gstType: "CGST_SGST" | "IGST",
  gstConfig: GSTConfig = DEFAULT_GST_CONFIG,
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  // Find the main amount (from income/expense entry)
  const mainEntry = entry.entries.find(
    (e) => e.accountType === "Income" || e.accountType === "Expense"
  );
  
  if (!mainEntry) {
    return entry; // Can't add GST without main entry
  }

  const amount = mainEntry.amount;
  const gstDetails = calculateGSTForEntry(amount, gstRate, isInclusive, gstType, gstConfig);
  
  return addGSTToEntry(entry, gstDetails, chartOfAccounts);
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
