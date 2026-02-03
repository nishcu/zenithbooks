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
  const paymentAccount = getPaymentModeAccount(parsed.paymentMode, chartOfAccounts, parsed.originalNarration);

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
    case "sales_return":
      entries.push(...generateSalesReturnEntry(parsed, matchingAccounts, paymentAccount, gstDetails, chartOfAccounts));
      break;
    case "purchase_return":
      entries.push(...generatePurchaseReturnEntry(parsed, matchingAccounts, paymentAccount, gstDetails, chartOfAccounts));
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
    case "sales_return":
      return "Journal"; // Sales returns are typically journal entries
    case "purchase_return":
      return "Journal"; // Purchase returns are typically journal entries
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

  // Handle personal vs business expenses
  // For personal expenses, use Drawings (Equity) instead of Expense
  // For mixed expenses, split between Drawings and Expense
  const personalPercentage = parsed.personalPercentage ?? (parsed.isPersonal ? 100 : 0);
  const businessPercentage = 100 - personalPercentage;
  
  // Get Drawings account
  const drawingsAccount = matchingAccounts.find((a) => 
    a.type === "Equity" && a.name.toLowerCase().includes("drawings")
  ) || chartOfAccounts.find((a) => a.code === "2040" || (a.type === "Equity" && a.name.toLowerCase().includes("drawings"))) ||
  { code: "2040", name: "Drawings", type: "Equity", keywords: [] };
  
  // Get debit account: Fixed Asset for capital purchase (vehicle, equipment, etc.), else Expense
  const debitAccount =
    matchingAccounts.find((a) => a.type === "Fixed Asset") ||
    matchingAccounts.find((a) => a.type === "Expense") ||
    getDefaultExpenseAccount(chartOfAccounts);
  if (!debitAccount) throw new Error("No expense or fixed asset account found");

  if (gstDetails && gstDetails.isGSTApplicable) {
    // GST Purchase Entry
    // For personal expenses with GST: No ITC, entire amount goes to Drawings
    if (parsed.isPersonal && personalPercentage === 100) {
      // Personal expense with GST - no ITC, entire amount to Drawings
      entries.push({
        accountCode: drawingsAccount.code,
        accountName: drawingsAccount.name,
        accountType: drawingsAccount.type,
        amount: gstDetails.totalAmount, // Total amount including GST
        isDebit: true,
        narration: parsed.originalNarration,
        gstDetails: { ...gstDetails, itcEligible: false }, // Mark ITC as not eligible
      });
    } else if (personalPercentage > 0 && personalPercentage < 100) {
      // Mixed personal/business with GST
      const personalAmount = (gstDetails.totalAmount * personalPercentage) / 100;
      const businessAmount = (gstDetails.totalAmount * businessPercentage) / 100;
      const personalTaxable = (gstDetails.taxableValue * personalPercentage) / 100;
      const businessTaxable = (gstDetails.taxableValue * businessPercentage) / 100;
      
      // Personal portion (no ITC)
      entries.push({
        accountCode: drawingsAccount.code,
        accountName: drawingsAccount.name,
        accountType: drawingsAccount.type,
        amount: personalAmount,
        isDebit: true,
        narration: `${parsed.originalNarration} (${personalPercentage}% personal)`,
      });
      
      // Business portion (with ITC)
      entries.push({
        accountCode: debitAccount.code,
        accountName: debitAccount.name,
        accountType: debitAccount.type,
        amount: businessTaxable,
        isDebit: true,
        narration: `${parsed.originalNarration} (${businessPercentage}% business)`,
        gstDetails: { ...gstDetails, taxableValue: businessTaxable },
      });
      
      // Add Input GST only for business portion
      if (gstDetails.itcEligible) {
        const businessCGST = gstDetails.cgstAmount ? (gstDetails.cgstAmount * businessPercentage) / 100 : 0;
        const businessSGST = gstDetails.sgstAmount ? (gstDetails.sgstAmount * businessPercentage) / 100 : 0;
        const businessIGST = gstDetails.igstAmount ? (gstDetails.igstAmount * businessPercentage) / 100 : 0;
        
        if (businessCGST > 0) {
          const inputCGST = chartOfAccounts.find((a) => a.code === "3001");
          if (inputCGST) {
            entries.push({
              accountCode: inputCGST.code,
              accountName: inputCGST.name,
              accountType: inputCGST.type,
              amount: businessCGST,
              isDebit: true,
              narration: `Input CGST @ ${gstDetails.gstRate}% (business portion)`,
            });
          }
        }
        if (businessSGST > 0) {
          const inputSGST = chartOfAccounts.find((a) => a.code === "3002");
          if (inputSGST) {
            entries.push({
              accountCode: inputSGST.code,
              accountName: inputSGST.name,
              accountType: inputSGST.type,
              amount: businessSGST,
              isDebit: true,
              narration: `Input SGST @ ${gstDetails.gstRate}% (business portion)`,
            });
          }
        }
        if (businessIGST > 0) {
          const inputIGST = chartOfAccounts.find((a) => a.code === "3003");
          if (inputIGST) {
            entries.push({
              accountCode: inputIGST.code,
              accountName: inputIGST.name,
              accountType: inputIGST.type,
              amount: businessIGST,
              isDebit: true,
              narration: `Input IGST @ ${gstDetails.gstRate}% (business portion)`,
            });
          }
        }
      }
    } else {
      // Business expense/fixed asset with GST (normal case)
      entries.push({
        accountCode: debitAccount.code,
        accountName: debitAccount.name,
        accountType: debitAccount.type,
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
      // Try multiple creditor account codes for compatibility
      const creditor = chartOfAccounts.find((a) => 
        a.code === "2001" || 
        a.code === "2410" || // Accounts Payable from main accounts.ts
        a.name.toLowerCase().includes("creditor") ||
        a.name.toLowerCase().includes("payable")
      );
      if (creditor) {
        entries.push({
          accountCode: creditor.code,
          accountName: creditor.name,
          accountType: creditor.type,
          amount: gstDetails.totalAmount,
          isDebit: false,
          narration: parsed.counterparty || "Supplier",
        });
      } else {
        // Fallback: use main accounts.ts code
        entries.push({
          accountCode: "2410",
          accountName: parsed.counterparty ? `${parsed.counterparty} (Supplier)` : "Accounts Payable / Sundry Creditors",
          accountType: "Current Liability",
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
    } else {
      // Fallback: Add Cash account if payment account not found
      // Try multiple cash account codes for compatibility
      const cashAccount = chartOfAccounts.find((a) => 
        a.code === "1001" || 
        a.code === "1510" || // Cash on Hand from main accounts.ts
        (a.name.toLowerCase().includes("cash") && (a.type === "Cash" || a.type === "Asset"))
      );
      
      if (cashAccount) {
        entries.push({
          accountCode: cashAccount.code,
          accountName: cashAccount.name,
          accountType: cashAccount.type,
          amount: gstDetails.totalAmount,
          isDebit: false,
          narration: parsed.originalNarration,
        });
      } else {
        // Final fallback: use main accounts.ts code
        entries.push({
          accountCode: "1510",
          accountName: "Cash on Hand",
          accountType: "Cash",
          amount: gstDetails.totalAmount,
          isDebit: false,
          narration: parsed.originalNarration,
        });
      }
    }
    }
  } else {
    // Non-GST Purchase Entry
    if (personalPercentage === 100) {
      // Fully personal expense
      entries.push({
        accountCode: drawingsAccount.code,
        accountName: drawingsAccount.name,
        accountType: drawingsAccount.type,
        amount,
        isDebit: true,
        narration: parsed.originalNarration,
      });
    } else if (personalPercentage > 0 && personalPercentage < 100) {
      // Mixed personal/business expense
      const personalAmount = (amount * personalPercentage) / 100;
      const businessAmount = (amount * businessPercentage) / 100;
      
      entries.push({
        accountCode: drawingsAccount.code,
        accountName: drawingsAccount.name,
        accountType: drawingsAccount.type,
        amount: personalAmount,
        isDebit: true,
        narration: `${parsed.originalNarration} (${personalPercentage}% personal)`,
      });
      
      entries.push({
        accountCode: debitAccount.code,
        accountName: debitAccount.name,
        accountType: debitAccount.type,
        amount: businessAmount,
        isDebit: true,
        narration: `${parsed.originalNarration} (${businessPercentage}% business)`,
      });
    } else {
      // Fully business expense or fixed asset purchase
      entries.push({
        accountCode: debitAccount.code,
        accountName: debitAccount.name,
        accountType: debitAccount.type,
        amount,
        isDebit: true,
        narration: parsed.originalNarration,
      });
    }

    if (parsed.paymentMode === "credit") {
      // Try multiple creditor account codes for compatibility
      const creditor = chartOfAccounts.find((a) => 
        a.code === "2001" || 
        a.code === "2410" || // Accounts Payable from main accounts.ts
        a.name.toLowerCase().includes("creditor") ||
        a.name.toLowerCase().includes("payable")
      );
      if (creditor) {
        entries.push({
          accountCode: creditor.code,
          accountName: creditor.name,
          accountType: creditor.type,
          amount,
          isDebit: false,
          narration: parsed.counterparty || "Supplier",
        });
      } else {
        // Fallback: use main accounts.ts code
        entries.push({
          accountCode: "2410",
          accountName: parsed.counterparty ? `${parsed.counterparty} (Supplier)` : "Accounts Payable / Sundry Creditors",
          accountType: "Current Liability",
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
    } else {
      // Fallback: Add Cash account if payment account not found
      const cashAccount = chartOfAccounts.find((a) => 
        a.code === "1001" || 
        a.code === "1510" || // Cash on Hand from main accounts.ts
        (a.name.toLowerCase().includes("cash") && (a.type === "Cash" || a.type === "Asset"))
      );
      
      if (cashAccount) {
        entries.push({
          accountCode: cashAccount.code,
          accountName: cashAccount.name,
          accountType: cashAccount.type,
          amount,
          isDebit: false,
          narration: parsed.originalNarration,
        });
      } else {
        // Final fallback: use main accounts.ts code
        entries.push({
          accountCode: "1510",
          accountName: "Cash on Hand",
          accountType: "Cash",
          amount,
          isDebit: false,
          narration: parsed.originalNarration,
        });
      }
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
    // Always create debit entry first (Debtor for credit sales, Cash/Bank for cash sales)
    if (parsed.paymentMode === "credit" || parsed.counterparty) {
      // Credit sale - create debtor entry
      // Try multiple debtor account codes for compatibility
      const debtor = chartOfAccounts.find((a) => 
        a.code === "2002" || 
        a.code === "1320" || // Accounts Receivable from main accounts.ts
        a.name.toLowerCase().includes("debtor") ||
        a.name.toLowerCase().includes("receivable")
      );
      if (debtor) {
        entries.push({
          accountCode: debtor.code,
          accountName: debtor.name,
          accountType: debtor.type,
          amount: gstDetails.totalAmount,
          isDebit: true,
          narration: parsed.counterparty || "Customer",
        });
      } else {
        // Fallback: use main accounts.ts code
        entries.push({
          accountCode: "1320",
          accountName: parsed.counterparty ? `${parsed.counterparty} (Customer)` : "Accounts Receivable / Sundry Debtors",
          accountType: "Current Asset",
          amount: gstDetails.totalAmount,
          isDebit: true,
          narration: parsed.counterparty || "Customer",
        });
      }
    } else {
      // Cash sale - debit Cash/Bank
      if (!paymentAccount) {
        // Try multiple cash account codes for compatibility
        paymentAccount = chartOfAccounts.find((a) => 
          a.code === "1001" || 
          a.code === "1510" || // Cash on Hand from main accounts.ts
          (a.name.toLowerCase().includes("cash") && a.type === "Cash")
        );
      }
      if (paymentAccount) {
        entries.push({
          accountCode: paymentAccount.code,
          accountName: paymentAccount.name,
          accountType: paymentAccount.type,
          amount: gstDetails.totalAmount,
          isDebit: true,
          narration: parsed.originalNarration,
        });
      } else {
        // Final fallback: use main accounts.ts code
        entries.push({
          accountCode: "1510",
          accountName: "Cash on Hand",
          accountType: "Cash",
          amount: gstDetails.totalAmount,
          isDebit: true,
          narration: parsed.originalNarration,
        });
      }
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
    // Always create debit entry first (Debtor for credit sales, Cash/Bank for cash sales)
    if (parsed.paymentMode === "credit" || parsed.counterparty) {
      // Credit sale - create debtor entry
      // Try multiple debtor account codes for compatibility
      const debtor = chartOfAccounts.find((a) => 
        a.code === "2002" || 
        a.code === "1320" || // Accounts Receivable from main accounts.ts
        a.name.toLowerCase().includes("debtor") ||
        a.name.toLowerCase().includes("receivable")
      );
      if (debtor) {
        entries.push({
          accountCode: debtor.code,
          accountName: debtor.name,
          accountType: debtor.type,
          amount,
          isDebit: true,
          narration: parsed.counterparty || "Customer",
        });
      } else {
        // Fallback: use main accounts.ts code
        entries.push({
          accountCode: "1320",
          accountName: parsed.counterparty ? `${parsed.counterparty} (Customer)` : "Accounts Receivable / Sundry Debtors",
          accountType: "Current Asset",
          amount,
          isDebit: true,
          narration: parsed.counterparty || "Customer",
        });
      }
    } else {
      // Cash sale - debit Cash/Bank
      if (!paymentAccount) {
        // Try multiple cash account codes for compatibility
        paymentAccount = chartOfAccounts.find((a) => 
          a.code === "1001" || 
          a.code === "1510" || // Cash on Hand from main accounts.ts
          (a.name.toLowerCase().includes("cash") && a.type === "Cash")
        );
      }
      if (paymentAccount) {
        entries.push({
          accountCode: paymentAccount.code,
          accountName: paymentAccount.name,
          accountType: paymentAccount.type,
          amount,
          isDebit: true,
          narration: parsed.originalNarration,
        });
      } else {
        // Final fallback: use main accounts.ts code
        entries.push({
          accountCode: "1510",
          accountName: "Cash on Hand",
          accountType: "Cash",
          amount,
          isDebit: true,
          narration: parsed.originalNarration,
        });
      }
    }

    // Credit Sales account
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

  // Handle personal vs business expenses (same logic as generatePurchaseEntry)
  const personalPercentage = parsed.personalPercentage ?? (parsed.isPersonal ? 100 : 0);
  const businessPercentage = 100 - personalPercentage;
  
  // Get Drawings account
  const drawingsAccount = matchingAccounts.find((a) => 
    a.type === "Equity" && a.name.toLowerCase().includes("drawings")
  ) || chartOfAccounts.find((a) => a.code === "2040" || (a.type === "Equity" && a.name.toLowerCase().includes("drawings"))) ||
  { code: "2040", name: "Drawings", type: "Equity", keywords: [] };
  
  // Get expense account
  const expenseAccount = matchingAccounts.find((a) => a.type === "Expense") || getDefaultExpenseAccount(chartOfAccounts);
  if (!expenseAccount) {
    throw new Error("No expense account found. Please ensure Chart of Accounts includes expense accounts.");
  }
  
  if (personalPercentage === 100) {
    // Fully personal expense
    entries.push({
      accountCode: drawingsAccount.code,
      accountName: drawingsAccount.name,
      accountType: drawingsAccount.type,
      amount,
      isDebit: true,
      narration: parsed.originalNarration,
    });
  } else if (personalPercentage > 0 && personalPercentage < 100) {
    // Mixed personal/business expense
    const personalAmount = (amount * personalPercentage) / 100;
    const businessAmount = (amount * businessPercentage) / 100;
    
    entries.push({
      accountCode: drawingsAccount.code,
      accountName: drawingsAccount.name,
      accountType: drawingsAccount.type,
      amount: personalAmount,
      isDebit: true,
      narration: `${parsed.originalNarration} (${personalPercentage}% personal)`,
    });
    
    entries.push({
      accountCode: expenseAccount.code,
      accountName: expenseAccount.name,
      accountType: expenseAccount.type,
      amount: businessAmount,
      isDebit: true,
      narration: `${parsed.originalNarration} (${businessPercentage}% business)`,
    });
  } else {
    // Fully business expense
    entries.push({
      accountCode: expenseAccount.code,
      accountName: expenseAccount.name,
      accountType: expenseAccount.type,
      amount,
      isDebit: true,
      narration: parsed.originalNarration,
    });
  }

  // Cr Payment Account (default to Cash if not found)
  if (!paymentAccount) {
    // Try multiple cash account codes for compatibility
    paymentAccount = chartOfAccounts.find((a) => 
      a.code === "1001" || 
      a.code === "1510" || // Cash on Hand from main accounts.ts
      (a.name.toLowerCase().includes("cash") && (a.type === "Cash" || a.type === "Asset"))
    );
  }

  if (!paymentAccount) {
    // Final fallback: use main accounts.ts code
    entries.push({
      accountCode: "1510",
      accountName: "Cash on Hand",
      accountType: "Cash",
      amount,
      isDebit: false,
      narration: parsed.originalNarration,
    });
  } else {
    entries.push({
      accountCode: paymentAccount.code,
      accountName: paymentAccount.name,
      accountType: paymentAccount.type,
      amount,
      isDebit: false,
      narration: parsed.originalNarration,
    });
  }

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
    // Try multiple cash account codes for compatibility
    paymentAccount = chartOfAccounts.find((a) => 
      a.code === "1001" || 
      a.code === "1510" || // Cash on Hand from main accounts.ts
      (a.name.toLowerCase().includes("cash") && (a.type === "Cash" || a.type === "Asset"))
    );
  }

  if (!paymentAccount) {
    // Final fallback: use main accounts.ts code
    entries.push({
      accountCode: "1510",
      accountName: "Cash on Hand",
      accountType: "Cash",
      amount,
      isDebit: false,
      narration: parsed.originalNarration,
    });
  } else {
    entries.push({
      accountCode: paymentAccount.code,
      accountName: paymentAccount.name,
      accountType: paymentAccount.type,
      amount,
      isDebit: false,
      narration: parsed.originalNarration,
    });
  }

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
 * Generate sales return entry
 * Dr Sales Returns (Expense/Contra Income), Cr Debtor/Cash
 */
function generateSalesReturnEntry(
  parsed: ParsedNarration,
  matchingAccounts: any[],
  paymentAccount: any,
  gstDetails: GSTDetails | undefined,
  chartOfAccounts: any[]
): AccountEntry[] {
  const entries: AccountEntry[] = [];
  const amount = parsed.amount || 0;

  // Get Sales Returns account (or Sales account for contra entry)
  // Main accounts.ts uses 4030 for Sales Returns
  const salesReturnsAccount = chartOfAccounts.find((a) => a.code === "4030") || 
    chartOfAccounts.find((a) => a.code === "4004") || // Fallback to smart-journal code
    chartOfAccounts.find((a) => a.name.toLowerCase().includes("sales return"));
  
  if (!salesReturnsAccount) {
    // Fallback to Sales account (will be shown as negative/contra)
    const salesAccount = chartOfAccounts.find((a) => a.code === "4001");
    if (!salesAccount) throw new Error("No sales or sales returns account found");
    
    // For sales return: Dr Sales Returns, Cr Debtor/Cash
    entries.push({
      accountCode: salesAccount.code,
      accountName: salesAccount.name,
      accountType: salesAccount.type,
      amount,
      isDebit: true, // Debit to reduce sales (contra entry)
      narration: parsed.originalNarration,
      gstDetails,
    });
  } else {
    // Use Sales Returns account
    entries.push({
      accountCode: salesReturnsAccount.code,
      accountName: salesReturnsAccount.name,
      accountType: salesReturnsAccount.type,
      amount,
      isDebit: true,
      narration: parsed.originalNarration,
      gstDetails,
    });
  }

  // Credit Debtor (if credit return) or Cash (if cash refund)
  if (parsed.paymentMode === "credit" || parsed.counterparty) {
    // Credit return - reduce debtor
    // Try multiple debtor account codes for compatibility
    const debtor = chartOfAccounts.find((a) => 
      a.code === "2002" || 
      a.code === "1320" || // Accounts Receivable from main accounts.ts
      a.name.toLowerCase().includes("debtor") ||
      a.name.toLowerCase().includes("receivable")
    );
    if (debtor) {
      entries.push({
        accountCode: debtor.code,
        accountName: debtor.name,
        accountType: debtor.type,
        amount,
        isDebit: false,
        narration: parsed.counterparty || "Customer",
      });
    } else {
      // Fallback - use party account if created, otherwise use default
      entries.push({
        accountCode: "1320", // Use main accounts.ts code
        accountName: parsed.counterparty ? `${parsed.counterparty} (Customer)` : "Accounts Receivable / Sundry Debtors",
        accountType: "Current Asset",
        amount,
        isDebit: false,
        narration: parsed.counterparty || "Customer",
      });
    }
  } else {
    // Cash refund - credit Cash
    if (!paymentAccount) {
      // Try multiple cash account codes for compatibility
      paymentAccount = chartOfAccounts.find((a) => 
        a.code === "1001" || 
        a.code === "1510" || // Cash on Hand from main accounts.ts
        (a.name.toLowerCase().includes("cash") && (a.type === "Cash" || a.type === "Asset"))
      );
    }
    if (paymentAccount) {
      entries.push({
        accountCode: paymentAccount.code,
        accountName: paymentAccount.name,
        accountType: paymentAccount.type,
        amount,
        isDebit: false,
        narration: parsed.originalNarration,
      });
    } else {
      // Final fallback: use main accounts.ts code
      entries.push({
        accountCode: "1510",
        accountName: "Cash on Hand",
        accountType: "Cash",
        amount,
        isDebit: false,
        narration: parsed.originalNarration,
      });
    }
  }

  // Handle GST for sales returns (Output GST reversal)
  if (gstDetails && gstDetails.isGSTApplicable) {
    // Reverse Output GST (Credit Output GST accounts)
    if (gstDetails.cgstAmount) {
      const outputCGST = chartOfAccounts.find((a) => a.code === "3004");
      if (outputCGST) {
        entries.push({
          accountCode: outputCGST.code,
          accountName: outputCGST.name,
          accountType: outputCGST.type,
          amount: gstDetails.cgstAmount,
          isDebit: true, // Debit to reverse output GST
          narration: `Output CGST reversal @ ${gstDetails.gstRate}%`,
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
          isDebit: true,
          narration: `Output SGST reversal @ ${gstDetails.gstRate}%`,
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
          isDebit: true,
          narration: `Output IGST reversal @ ${gstDetails.gstRate}%`,
        });
      }
    }
  }

  return entries;
}

/**
 * Generate purchase return entry
 * Dr Creditor/Cash, Cr Purchase Returns (Income/Contra Expense)
 */
function generatePurchaseReturnEntry(
  parsed: ParsedNarration,
  matchingAccounts: any[],
  paymentAccount: any,
  gstDetails: GSTDetails | undefined,
  chartOfAccounts: any[]
): AccountEntry[] {
  const entries: AccountEntry[] = [];
  const amount = parsed.amount || 0;

  // Get Purchase Returns account
  const purchaseReturnsAccount = chartOfAccounts.find((a) => a.code === "4005") ||
    chartOfAccounts.find((a) => a.name.toLowerCase().includes("purchase return"));
  
  if (!purchaseReturnsAccount) {
    // Fallback to Purchase account (contra entry)
    const purchaseAccount = chartOfAccounts.find((a) => a.code === "5007");
    if (!purchaseAccount) throw new Error("No purchase or purchase returns account found");
    
    entries.push({
      accountCode: purchaseAccount.code,
      accountName: purchaseAccount.name,
      accountType: purchaseAccount.type,
      amount,
      isDebit: false, // Credit to reduce purchase (contra entry)
      narration: parsed.originalNarration,
      gstDetails,
    });
  } else {
    entries.push({
      accountCode: purchaseReturnsAccount.code,
      accountName: purchaseReturnsAccount.name,
      accountType: purchaseReturnsAccount.type,
      amount,
      isDebit: false,
      narration: parsed.originalNarration,
      gstDetails,
    });
  }

  // Debit Creditor (if credit return) or Cash (if cash refund)
  if (parsed.paymentMode === "credit" || parsed.counterparty) {
    // Credit return - reduce creditor
    // Try multiple creditor account codes for compatibility
    const creditor = chartOfAccounts.find((a) => 
      a.code === "2001" || 
      a.code === "2410" || // Accounts Payable from main accounts.ts
      a.name.toLowerCase().includes("creditor") ||
      a.name.toLowerCase().includes("payable")
    );
    if (creditor) {
      entries.push({
        accountCode: creditor.code,
        accountName: creditor.name,
        accountType: creditor.type,
        amount,
        isDebit: true,
        narration: parsed.counterparty || "Supplier",
      });
    } else {
      // Fallback: use main accounts.ts code
      entries.push({
        accountCode: "2410",
        accountName: parsed.counterparty ? `${parsed.counterparty} (Supplier)` : "Accounts Payable / Sundry Creditors",
        accountType: "Current Liability",
        amount,
        isDebit: true,
        narration: parsed.counterparty || "Supplier",
      });
    }
  } else {
    // Cash refund - debit Cash
    if (!paymentAccount) {
      // Try multiple cash account codes for compatibility
      paymentAccount = chartOfAccounts.find((a) => 
        a.code === "1001" || 
        a.code === "1510" || // Cash on Hand from main accounts.ts
        (a.name.toLowerCase().includes("cash") && (a.type === "Cash" || a.type === "Asset"))
      );
    }
    if (paymentAccount) {
      entries.push({
        accountCode: paymentAccount.code,
        accountName: paymentAccount.name,
        accountType: paymentAccount.type,
        amount,
        isDebit: true,
        narration: parsed.originalNarration,
      });
    } else {
      entries.push({
        accountCode: "1001",
        accountName: "Cash",
        accountType: "Asset",
        amount,
        isDebit: true,
        narration: parsed.originalNarration,
      });
    }
  }

  // Handle GST for purchase returns (Input GST reversal)
  if (gstDetails && gstDetails.isGSTApplicable && gstDetails.itcEligible) {
    // Reverse Input GST (Credit Input GST accounts)
    if (gstDetails.cgstAmount) {
      const inputCGST = chartOfAccounts.find((a) => a.code === "3001");
      if (inputCGST) {
        entries.push({
          accountCode: inputCGST.code,
          accountName: inputCGST.name,
          accountType: inputCGST.type,
          amount: gstDetails.cgstAmount,
          isDebit: false, // Credit to reverse input GST
          narration: `Input CGST reversal @ ${gstDetails.gstRate}%`,
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
          isDebit: false,
          narration: `Input SGST reversal @ ${gstDetails.gstRate}%`,
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
          isDebit: false,
          narration: `Input IGST reversal @ ${gstDetails.gstRate}%`,
        });
      }
    }
  }

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

/**
 * Add GST to an existing journal entry (post-processing)
 * If GST already exists, it will be replaced with the new GST details
 */
export function addGSTToEntry(
  entry: JournalEntry,
  gstDetails: GSTDetails,
  chartOfAccounts: ChartOfAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  // Remove existing GST entries first (if any)
  const updatedEntries = entry.entries.filter((e) => {
    // Remove GST account entries (Input/Output CGST, SGST, IGST)
    const isGSTAccount = 
      e.accountCode === "3001" || // Input CGST
      e.accountCode === "3002" || // Input SGST
      e.accountCode === "3003" || // Input IGST
      e.accountCode === "3004" || // Output CGST
      e.accountCode === "3005" || // Output SGST
      e.accountCode === "3006" || // Output IGST
      e.accountName.toLowerCase().includes("input cgst") ||
      e.accountName.toLowerCase().includes("input sgst") ||
      e.accountName.toLowerCase().includes("input igst") ||
      e.accountName.toLowerCase().includes("output cgst") ||
      e.accountName.toLowerCase().includes("output sgst") ||
      e.accountName.toLowerCase().includes("output igst");
    return !isGSTAccount;
  });
  
  const isSale = entry.voucherType === "Sales" || entry.voucherType === "Receipt";
  
  // Find the main income/expense entry
  const mainEntryIndex = updatedEntries.findIndex(
    (e) => e.accountType === "Income" || e.accountType === "Expense"
  );
  
  if (mainEntryIndex === -1) {
    return entry; // Can't add GST without main entry
  }
  
  const mainEntry = updatedEntries[mainEntryIndex];
  
  // Get the original amount before GST (if entry had GST, restore to original taxable value)
  // If the entry already had GST, the main entry amount is the taxable value
  // If not, the main entry amount is the total amount
  const originalAmount = entry.gstDetails 
    ? entry.gstDetails.taxableValue 
    : mainEntry.amount;
  
  if (isSale) {
    // Sales entry: Update taxable value, add Output GST, update debtor/cash amount
    // Update main entry (Sales) to taxable value
    updatedEntries[mainEntryIndex] = {
      ...mainEntry,
      amount: gstDetails.taxableValue,
      gstDetails,
    };
    
    // Add Output GST entries
    if (gstDetails.cgstAmount) {
      const outputCGST = chartOfAccounts.find((a) => a.code === "3004");
      if (outputCGST) {
        updatedEntries.push({
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
        updatedEntries.push({
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
        updatedEntries.push({
          accountCode: outputIGST.code,
          accountName: outputIGST.name,
          accountType: outputIGST.type,
          amount: gstDetails.igstAmount,
          isDebit: false,
          narration: `Output IGST @ ${gstDetails.gstRate}%`,
        });
      }
    }
    
    // Update debtor/cash entry to total amount
    // Find debit entries (Debtor, Cash, or Bank accounts)
    const debtorEntryIndices = updatedEntries
      .map((e, idx) => (e.isDebit && (e.accountType === "Liability" || e.accountType === "Asset" || e.accountType === "Cash" || e.accountCode === "1320" || e.accountCode === "2002")) ? idx : -1)
      .filter(idx => idx !== -1);
    
    if (debtorEntryIndices.length > 0) {
      // Update the first debtor/cash entry
      debtorEntryIndices.forEach(idx => {
        updatedEntries[idx] = {
          ...updatedEntries[idx],
          amount: gstDetails.totalAmount,
        };
      });
    }
  } else {
    // Purchase entry: Update taxable value, add Input GST, update creditor/cash amount
    // Update main entry (Expense) to taxable value
    updatedEntries[mainEntryIndex] = {
      ...mainEntry,
      amount: gstDetails.taxableValue,
      gstDetails,
    };
    
    // Add Input GST entries (if ITC eligible)
    if (gstDetails.itcEligible) {
      if (gstDetails.cgstAmount) {
        const inputCGST = chartOfAccounts.find((a) => a.code === "3001");
        if (inputCGST) {
          updatedEntries.push({
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
          updatedEntries.push({
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
          updatedEntries.push({
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
    
    // Update creditor/cash entry to total amount
    const creditorIndex = updatedEntries.findIndex(
      (e) => !e.isDebit && (e.accountType === "Liability" || e.accountType === "Asset")
    );
    if (creditorIndex !== -1) {
      updatedEntries[creditorIndex] = {
        ...updatedEntries[creditorIndex],
        amount: gstDetails.totalAmount,
      };
    }
  }
  
  // Recalculate totals
  const totalDebit = updatedEntries.filter((e) => e.isDebit).reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = updatedEntries.filter((e) => !e.isDebit).reduce((sum, e) => sum + e.amount, 0);
  
  return {
    ...entry,
    entries: updatedEntries,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    gstDetails,
  };
}
