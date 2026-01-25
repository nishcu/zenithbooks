/**
 * Accounting Rules Engine
 * Applies double-entry accounting rules based on transaction type
 */

import type {
  ParsedNarration,
  JournalEntry,
  AccountEntry,
  VoucherType,
  GSTDetails,
} from "./types";
import { findMatchingAccounts, getPaymentModeAccount, getDefaultExpenseAccount, getDefaultIncomeAccount } from "./account-matcher";
import { DEFAULT_CHART_OF_ACCOUNTS } from "./constants";

/**
 * Generate journal entry from parsed narration
 */
export function generateJournalEntry(
  parsed: ParsedNarration,
  gstDetails?: GSTDetails,
  chartOfAccounts = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const voucherType = determineVoucherType(parsed);
  const entries: AccountEntry[] = [];

  // Get matching accounts
  const matchingAccounts = findMatchingAccounts(parsed, chartOfAccounts);
  const paymentAccount = getPaymentModeAccount(parsed.paymentMode, chartOfAccounts);

  // Generate entries based on transaction type
  switch (parsed.transactionType) {
    case "purchase":
    case "expense":
      entries.push(...generatePurchaseEntry(parsed, matchingAccounts, paymentAccount, gstDetails, chartOfAccounts));
      break;
    case "sale":
    case "income":
      entries.push(...generateSaleEntry(parsed, matchingAccounts, paymentAccount, gstDetails, chartOfAccounts));
      break;
    case "payment":
      entries.push(...generatePaymentEntry(parsed, matchingAccounts, paymentAccount, chartOfAccounts));
      break;
    case "receipt":
      entries.push(...generateReceiptEntry(parsed, matchingAccounts, paymentAccount, chartOfAccounts));
      break;
    case "advance":
    case "prepaid":
      entries.push(...generateAdvanceEntry(parsed, matchingAccounts, paymentAccount, chartOfAccounts));
      break;
    case "outstanding":
      entries.push(...generateOutstandingEntry(parsed, matchingAccounts, paymentAccount, chartOfAccounts));
      break;
    default:
      entries.push(...generateDefaultEntry(parsed, matchingAccounts, paymentAccount, chartOfAccounts));
  }

  // Calculate totals
  const totalDebit = entries.filter((e) => e.isDebit).reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = entries.filter((e) => !e.isDebit).reduce((sum, e) => sum + e.amount, 0);

  return {
    voucherType,
    date: new Date().toISOString().split("T")[0],
    narration: parsed.originalNarration,
    entries,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    gstDetails,
    counterparty: parsed.counterparty,
    paymentMode: parsed.paymentMode,
    metadata: {
      confidence: parsed.confidence,
      detectedTransactionType: parsed.transactionType,
      suggestedAccounts: matchingAccounts.map((a) => a.name),
    },
  };
}

/**
 * Determine voucher type
 */
function determineVoucherType(parsed: ParsedNarration): VoucherType {
  switch (parsed.transactionType) {
    case "purchase":
    case "expense":
      return parsed.paymentMode === "credit" ? "Purchase" : "Payment";
    case "sale":
    case "income":
      return parsed.paymentMode === "credit" ? "Sales" : "Receipt";
    case "payment":
      return "Payment";
    case "receipt":
      return "Receipt";
    default:
      return "Journal";
  }
}

/**
 * Generate purchase/expense entry
 */
function generatePurchaseEntry(
  parsed: ParsedNarration,
  matchingAccounts: any[],
  paymentAccount: any,
  gstDetails: GSTDetails | undefined,
  chartOfAccounts: any[]
): AccountEntry[] {
  const entries: AccountEntry[] = [];
  const amount = parsed.amount || 0;

  // Get expense account
  const expenseAccount = matchingAccounts.find((a) => a.type === "Expense") || getDefaultExpenseAccount(chartOfAccounts);
  if (!expenseAccount) throw new Error("No expense account found");

  if (gstDetails && gstDetails.isGSTApplicable) {
    // GST Purchase Entry
    // Dr Expense (taxable value)
    entries.push({
      accountCode: expenseAccount.code,
      accountName: expenseAccount.name,
      accountType: expenseAccount.type,
      amount: gstDetails.taxableValue,
      isDebit: true,
      narration: parsed.originalNarration,
      gstDetails,
    });

    // Dr Input GST (if ITC eligible)
    if (gstDetails.itcEligible) {
      if (gstDetails.cgstAmount) {
        const inputCGST = chartOfAccounts.find((a) => a.code === "3001");
        if (inputCGST) {
          entries.push({
            accountCode: inputCGST.code,
            accountName: inputCGST.name,
            accountType: inputCGST.type,
            amount: gstDetails.cgstAmount,
            isDebit: true,
            narration: `Input CGST @ ${gstDetails.gstRate}%`,
          });
        }
      }
      if (gstDetails.sgstAmount) {
        const inputSGST = chartOfAccounts.find((a) => a.code === "3002");
        if (inputSGST) {
          entries.push({
            accountCode: inputSGST.code,
            accountName: inputSGST.name,
            accountType: inputSGST.type,
            amount: gstDetails.sgstAmount,
            isDebit: true,
            narration: `Input SGST @ ${gstDetails.gstRate}%`,
          });
        }
      }
      if (gstDetails.igstAmount) {
        const inputIGST = chartOfAccounts.find((a) => a.code === "3003");
        if (inputIGST) {
          entries.push({
            accountCode: inputIGST.code,
            accountName: inputIGST.name,
            accountType: inputIGST.type,
            amount: gstDetails.igstAmount,
            isDebit: true,
            narration: `Input IGST @ ${gstDetails.gstRate}%`,
          });
        }
      }
    }

    // Cr Payment Account or Creditor
    if (parsed.paymentMode === "credit") {
      const creditor = chartOfAccounts.find((a) => a.code === "2001");
      if (creditor) {
        entries.push({
          accountCode: creditor.code,
          accountName: creditor.name,
          accountType: creditor.type,
          amount: gstDetails.totalAmount,
          isDebit: false,
          narration: parsed.counterparty || "Supplier",
        });
      }
    } else if (paymentAccount) {
      entries.push({
        accountCode: paymentAccount.code,
        accountName: paymentAccount.name,
        accountType: paymentAccount.type,
        amount: gstDetails.totalAmount,
        isDebit: false,
        narration: parsed.originalNarration,
      });
    }
  } else {
    // Non-GST Purchase Entry
    entries.push({
      accountCode: expenseAccount.code,
      accountName: expenseAccount.name,
      accountType: expenseAccount.type,
      amount,
      isDebit: true,
      narration: parsed.originalNarration,
    });

    if (parsed.paymentMode === "credit") {
      const creditor = chartOfAccounts.find((a) => a.code === "2001");
      if (creditor) {
        entries.push({
          accountCode: creditor.code,
          accountName: creditor.name,
          accountType: creditor.type,
          amount,
          isDebit: false,
          narration: parsed.counterparty || "Supplier",
        });
      }
    } else if (paymentAccount) {
      entries.push({
        accountCode: paymentAccount.code,
        accountName: paymentAccount.name,
        accountType: paymentAccount.type,
        amount,
        isDebit: false,
        narration: parsed.originalNarration,
      });
    }
  }

  return entries;
}

/**
 * Generate sale entry
 */
function generateSaleEntry(
  parsed: ParsedNarration,
  matchingAccounts: any[],
  paymentAccount: any,
  gstDetails: GSTDetails | undefined,
  chartOfAccounts: any[]
): AccountEntry[] {
  const entries: AccountEntry[] = [];
  const amount = parsed.amount || 0;

  // Get income account
  const incomeAccount = matchingAccounts.find((a) => a.type === "Income") || getDefaultIncomeAccount(chartOfAccounts);
  if (!incomeAccount) throw new Error("No income account found");

  if (gstDetails && gstDetails.isGSTApplicable) {
    // GST Sale Entry
    // Dr Payment Account or Debtor
    if (parsed.paymentMode === "credit") {
      const debtor = chartOfAccounts.find((a) => a.code === "2002");
      if (debtor) {
        entries.push({
          accountCode: debtor.code,
          accountName: debtor.name,
          accountType: debtor.type,
          amount: gstDetails.totalAmount,
          isDebit: true,
          narration: parsed.counterparty || "Customer",
        });
      }
    } else if (paymentAccount) {
      entries.push({
        accountCode: paymentAccount.code,
        accountName: paymentAccount.name,
        accountType: paymentAccount.type,
        amount: gstDetails.totalAmount,
        isDebit: true,
        narration: parsed.originalNarration,
      });
    }

    // Cr Sales (taxable value)
    entries.push({
      accountCode: incomeAccount.code,
      accountName: incomeAccount.name,
      accountType: incomeAccount.type,
      amount: gstDetails.taxableValue,
      isDebit: false,
      narration: parsed.originalNarration,
      gstDetails,
    });

    // Cr Output GST
    if (gstDetails.cgstAmount) {
      const outputCGST = chartOfAccounts.find((a) => a.code === "3004");
      if (outputCGST) {
        entries.push({
          accountCode: outputCGST.code,
          accountName: outputCGST.name,
          accountType: outputCGST.type,
          amount: gstDetails.cgstAmount,
          isDebit: false,
          narration: `Output CGST @ ${gstDetails.gstRate}%`,
        });
      }
    }
    if (gstDetails.sgstAmount) {
      const outputSGST = chartOfAccounts.find((a) => a.code === "3005");
      if (outputSGST) {
        entries.push({
          accountCode: outputSGST.code,
          accountName: outputSGST.name,
          accountType: outputSGST.type,
          amount: gstDetails.sgstAmount,
          isDebit: false,
          narration: `Output SGST @ ${gstDetails.gstRate}%`,
        });
      }
    }
    if (gstDetails.igstAmount) {
      const outputIGST = chartOfAccounts.find((a) => a.code === "3006");
      if (outputIGST) {
        entries.push({
          accountCode: outputIGST.code,
          accountName: outputIGST.name,
          accountType: outputIGST.type,
          amount: gstDetails.igstAmount,
          isDebit: false,
          narration: `Output IGST @ ${gstDetails.gstRate}%`,
        });
      }
    }
  } else {
    // Non-GST Sale Entry
    if (parsed.paymentMode === "credit") {
      const debtor = chartOfAccounts.find((a) => a.code === "2002");
      if (debtor) {
        entries.push({
          accountCode: debtor.code,
          accountName: debtor.name,
          accountType: debtor.type,
          amount,
          isDebit: true,
          narration: parsed.counterparty || "Customer",
        });
      }
    } else if (paymentAccount) {
      entries.push({
        accountCode: paymentAccount.code,
        accountName: paymentAccount.name,
        accountType: paymentAccount.type,
        amount,
        isDebit: true,
        narration: parsed.originalNarration,
      });
    }

    entries.push({
      accountCode: incomeAccount.code,
      accountName: incomeAccount.name,
      accountType: incomeAccount.type,
      amount,
      isDebit: false,
      narration: parsed.originalNarration,
    });
  }

  return entries;
}

/**
 * Generate payment entry
 */
function generatePaymentEntry(
  parsed: ParsedNarration,
  matchingAccounts: any[],
  paymentAccount: any,
  chartOfAccounts: any[]
): AccountEntry[] {
  const entries: AccountEntry[] = [];
  const amount = parsed.amount || 0;

  if (amount === 0) {
    throw new Error("Amount is required for payment entry");
  }

  // Dr Expense or Creditor
  const expenseAccount = matchingAccounts.find((a) => a.type === "Expense") || getDefaultExpenseAccount(chartOfAccounts);
  if (!expenseAccount) {
    throw new Error("No expense account found. Please ensure Chart of Accounts includes expense accounts.");
  }
  
  entries.push({
    accountCode: expenseAccount.code,
    accountName: expenseAccount.name,
    accountType: expenseAccount.type,
    amount,
    isDebit: true,
    narration: parsed.originalNarration,
  });

  // Cr Payment Account (default to Cash if not found)
  if (!paymentAccount) {
    paymentAccount = chartOfAccounts.find((a) => a.code === "1001"); // Default to Cash
  }
  
  if (!paymentAccount) {
    throw new Error("No payment account found. Please ensure Chart of Accounts includes Cash or Bank accounts.");
  }

  entries.push({
    accountCode: paymentAccount.code,
    accountName: paymentAccount.name,
    accountType: paymentAccount.type,
    amount,
    isDebit: false,
    narration: parsed.originalNarration,
  });

  return entries;
}

/**
 * Generate receipt entry
 */
function generateReceiptEntry(
  parsed: ParsedNarration,
  matchingAccounts: any[],
  paymentAccount: any,
  chartOfAccounts: any[]
): AccountEntry[] {
  const entries: AccountEntry[] = [];
  const amount = parsed.amount || 0;

  // Dr Payment Account
  if (paymentAccount) {
    entries.push({
      accountCode: paymentAccount.code,
      accountName: paymentAccount.name,
      accountType: paymentAccount.type,
      amount,
      isDebit: true,
      narration: parsed.originalNarration,
    });
  }

  // Cr Income or Debtor
  const incomeAccount = matchingAccounts.find((a) => a.type === "Income") || getDefaultIncomeAccount(chartOfAccounts);
  if (incomeAccount) {
    entries.push({
      accountCode: incomeAccount.code,
      accountName: incomeAccount.name,
      accountType: incomeAccount.type,
      amount,
      isDebit: false,
      narration: parsed.originalNarration,
    });
  }

  return entries;
}

/**
 * Generate advance/prepaid entry
 * Dr Prepaid Expense (Asset), Cr Cash/Bank
 */
function generateAdvanceEntry(
  parsed: ParsedNarration,
  matchingAccounts: any[],
  paymentAccount: any,
  chartOfAccounts: any[]
): AccountEntry[] {
  const entries: AccountEntry[] = [];
  const amount = parsed.amount || 0;

  if (amount === 0) {
    throw new Error("Amount is required for advance entry");
  }

  // Find prepaid account (prioritize specific prepaid accounts)
  let prepaidAccount = matchingAccounts.find((a) => 
    a.type === "Asset" && (a.name.toLowerCase().includes("prepaid") || a.name.toLowerCase().includes("advance"))
  );

  // If rent advance, use Prepaid Rent
  if (parsed.originalNarration.toLowerCase().includes("rent")) {
    prepaidAccount = chartOfAccounts.find((a) => a.code === "1006"); // Prepaid Rent
  }

  // Fallback to general Prepaid Expenses
  if (!prepaidAccount) {
    prepaidAccount = chartOfAccounts.find((a) => a.code === "1005"); // Prepaid Expenses
  }

  if (!prepaidAccount) {
    throw new Error("No prepaid expense account found. Please ensure Chart of Accounts includes prepaid accounts.");
  }

  // Dr Prepaid Expense (Asset)
  entries.push({
    accountCode: prepaidAccount.code,
    accountName: prepaidAccount.name,
    accountType: prepaidAccount.type,
    amount,
    isDebit: true,
    narration: parsed.originalNarration,
  });

  // Cr Payment Account (default to Cash if not found)
  if (!paymentAccount) {
    paymentAccount = chartOfAccounts.find((a) => a.code === "1001"); // Default to Cash
  }

  if (!paymentAccount) {
    throw new Error("No payment account found. Please ensure Chart of Accounts includes Cash or Bank accounts.");
  }

  entries.push({
    accountCode: paymentAccount.code,
    accountName: paymentAccount.name,
    accountType: paymentAccount.type,
    amount,
    isDebit: false,
    narration: parsed.originalNarration,
  });

  return entries;
}

/**
 * Generate outstanding/accrued entry
 * Dr Expense, Cr Outstanding Expense (Liability)
 */
function generateOutstandingEntry(
  parsed: ParsedNarration,
  matchingAccounts: any[],
  paymentAccount: any,
  chartOfAccounts: any[]
): AccountEntry[] {
  const entries: AccountEntry[] = [];
  const amount = parsed.amount || 0;

  if (amount === 0) {
    throw new Error("Amount is required for outstanding entry");
  }

  // Find expense account
  const expenseAccount = matchingAccounts.find((a) => a.type === "Expense") || getDefaultExpenseAccount(chartOfAccounts);
  if (!expenseAccount) {
    throw new Error("No expense account found. Please ensure Chart of Accounts includes expense accounts.");
  }

  // Dr Expense
  entries.push({
    accountCode: expenseAccount.code,
    accountName: expenseAccount.name,
    accountType: expenseAccount.type,
    amount,
    isDebit: true,
    narration: parsed.originalNarration,
  });

  // Find outstanding account (prioritize specific outstanding accounts)
  let outstandingAccount = matchingAccounts.find((a) => 
    a.type === "Liability" && (a.name.toLowerCase().includes("outstanding") || a.name.toLowerCase().includes("accrued"))
  );

  // If outstanding rent, use Outstanding Rent
  if (parsed.originalNarration.toLowerCase().includes("rent")) {
    outstandingAccount = chartOfAccounts.find((a) => a.code === "2004"); // Outstanding Rent
  }

  // Fallback to general Outstanding Expenses
  if (!outstandingAccount) {
    outstandingAccount = chartOfAccounts.find((a) => a.code === "2003"); // Outstanding Expenses
  }

  if (!outstandingAccount) {
    throw new Error("No outstanding expense account found. Please ensure Chart of Accounts includes outstanding accounts.");
  }

  // Cr Outstanding Expense (Liability)
  entries.push({
    accountCode: outstandingAccount.code,
    accountName: outstandingAccount.name,
    accountType: outstandingAccount.type,
    amount,
    isDebit: false,
    narration: parsed.originalNarration,
  });

  return entries;
}

/**
 * Generate default entry
 */
function generateDefaultEntry(
  parsed: ParsedNarration,
  matchingAccounts: any[],
  paymentAccount: any,
  chartOfAccounts: any[]
): AccountEntry[] {
  // Default to expense entry
  return generatePaymentEntry(parsed, matchingAccounts, paymentAccount, chartOfAccounts);
}
