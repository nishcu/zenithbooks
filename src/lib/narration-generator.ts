/**
 * Automatic Narration Generator for Journal Entries
 * Analyzes journal lines and generates meaningful narrations based on transaction patterns
 */

import { allAccounts, type Account } from "./accounts";

export interface JournalLine {
  account: string;
  debit: string | number;
  credit: string | number;
}

export interface AccountInfo {
  code: string;
  name: string;
  type: string;
}

/**
 * Generate automatic narration based on journal entry lines
 */
export function generateAutoNarration(
  lines: JournalLine[],
  accounts: AccountInfo[] = [],
  customers: Array<{ id: string; name: string }> = [],
  vendors: Array<{ id: string; name: string }> = []
): string {
  if (!lines || lines.length === 0) {
    return "Journal Entry";
  }

  // Helper function to get account info
  const getAccountInfo = (accountCode: string): AccountInfo | null => {
    // Check in provided accounts first
    const found = accounts.find(a => a.code === accountCode);
    if (found) return found;
    
    // Check in system accounts
    const systemAccount = allAccounts.find(a => a.code === accountCode);
    if (systemAccount) return systemAccount;
    
    // Check if it's a customer
    const customer = customers.find(c => c.id === accountCode);
    if (customer) return { code: accountCode, name: customer.name, type: "Customer" };
    
    // Check if it's a vendor
    const vendor = vendors.find(v => v.id === accountCode);
    if (vendor) return { code: accountCode, name: vendor.name, type: "Vendor" };
    
    return null;
  };

  // Parse amounts and categorize accounts
  const parsedLines = lines.map(line => {
    const debit = parseFloat(String(line.debit).replace(/,/g, '')) || 0;
    const credit = parseFloat(String(line.credit).replace(/,/g, '')) || 0;
    const accountInfo = getAccountInfo(String(line.account).trim());
    return {
      account: String(line.account).trim(),
      accountInfo,
      debit,
      credit,
      amount: debit || credit
    };
  });

  // Filter out zero lines
  const activeLines = parsedLines.filter(l => l.amount > 0);
  
  if (activeLines.length === 0) {
    return "Journal Entry";
  }

  // Identify account categories
  const cashAccounts = activeLines.filter(l => 
    l.accountInfo?.type === "Cash" || l.account === "1510"
  );
  const bankAccounts = activeLines.filter(l => 
    l.accountInfo?.type === "Bank" || l.account.startsWith("152")
  );
  const customerLines = activeLines.filter(l => 
    l.accountInfo?.type === "Customer" || customers.some(c => c.id === l.account)
  );
  const vendorLines = activeLines.filter(l => 
    l.accountInfo?.type === "Vendor" || vendors.some(v => v.id === l.account)
  );
  const revenueAccounts = activeLines.filter(l => 
    l.accountInfo?.type === "Revenue" || l.account === "4010"
  );
  const expenseAccounts = activeLines.filter(l => 
    l.accountInfo?.type === "Expense" || ["5010", "5050", "6010", "6020", "6030", "6040", "6050"].includes(l.account)
  );
  const purchaseAccounts = activeLines.filter(l => 
    ["5010", "5050"].includes(l.account)
  );

  // Pattern 1: Cash/Bank Receipt (Cash/Bank Dr, Customer/Revenue Cr)
  const cashReceipt = cashAccounts.find(c => c.debit > 0);
  const bankReceipt = bankAccounts.find(b => b.debit > 0);
  if (cashReceipt || bankReceipt) {
    const receiptAccount = cashReceipt || bankReceipt;
    const creditSide = activeLines.find(l => l.credit > 0 && l.account !== receiptAccount.account);
    
    if (creditSide) {
      const accountName = creditSide.accountInfo?.name || creditSide.account;
      const receiptType = cashReceipt ? "Cash" : receiptAccount.accountInfo?.name || "Bank";
      return `Received payment from ${accountName} via ${receiptType}`;
    }
  }

  // Pattern 2: Cash/Bank Payment (Cash/Bank Cr, Vendor/Expense Dr)
  const cashPayment = cashAccounts.find(c => c.credit > 0);
  const bankPayment = bankAccounts.find(b => b.credit > 0);
  if (cashPayment || bankPayment) {
    const paymentAccount = cashPayment || bankPayment;
    const debitSide = activeLines.find(l => l.debit > 0 && l.account !== paymentAccount.account);
    
    if (debitSide) {
      const accountName = debitSide.accountInfo?.name || debitSide.account;
      const paymentType = cashPayment ? "Cash" : paymentAccount.accountInfo?.name || "Bank";
      
      // Check if it's an expense
      if (expenseAccounts.some(e => e.account === debitSide.account)) {
        return `Payment for ${accountName} via ${paymentType}`;
      }
      
      // Check if it's a vendor payment
      const isVendorPayment = vendorLines.some(v => v.account === debitSide.account);
      if (isVendorPayment) {
        return `Paid to ${accountName} via ${paymentType}`;
      }
      
      return `Payment to ${accountName} via ${paymentType}`;
    }
  }

  // Pattern 3: Purchase Transaction (Purchase Dr, Vendor Cr)
  const purchaseLine = purchaseAccounts.find(p => p.debit > 0);
  const vendorLine = vendorLines.find(l => l.credit > 0);
  if (purchaseLine && vendorLine) {
    const vendorName = vendorLine.accountInfo?.name || vendorLine.account;
    return `Purchase from ${vendorName}`;
  }

  // Pattern 4: Sales Transaction (Customer Dr, Revenue Cr)
  const customerLine = customerLines.find(c => c.debit > 0);
  const revenueLine = revenueAccounts.find(r => r.credit > 0);
  if (customerLine && revenueLine) {
    const customerName = customerLine.accountInfo?.name || customerLine.account;
    return `Sale to ${customerName}`;
  }

  // Pattern 5: Expense Payment (Expense Dr, Cash/Bank Cr)
  const expenseLine = expenseAccounts.find(e => e.debit > 0);
  if (expenseLine && (cashPayment || bankPayment)) {
    const expenseName = expenseLine.accountInfo?.name || expenseLine.account;
    const paymentType = cashPayment ? "Cash" : bankPayment?.accountInfo?.name || "Bank";
    return `Payment for ${expenseName} via ${paymentType}`;
  }

  // Pattern 6: Transfer between Bank Accounts
  const bankDebit = bankAccounts.find(b => b.debit > 0);
  const bankCredit = bankAccounts.find(b => b.credit > 0 && b.account !== bankDebit?.account);
  if (bankDebit && bankCredit) {
    const fromBank = bankDebit.accountInfo?.name || bankDebit.account;
    const toBank = bankCredit.accountInfo?.name || bankCredit.account;
    return `Transfer from ${fromBank} to ${toBank}`;
  }

  // Pattern 7: Multiple accounts - describe the transaction
  if (activeLines.length === 2) {
    const line1 = activeLines[0];
    const line2 = activeLines[1];
    
    const name1 = line1.accountInfo?.name || line1.account;
    const name2 = line2.accountInfo?.name || line2.account;
    
    if (line1.debit > 0 && line2.credit > 0) {
      return `${name1} to ${name2}`;
    } else if (line1.credit > 0 && line2.debit > 0) {
      return `${name2} to ${name1}`;
    }
  }

  // Pattern 8: Multi-line entry - describe by primary accounts
  if (activeLines.length > 2) {
    const debitAccounts = activeLines.filter(l => l.debit > 0);
    const creditAccounts = activeLines.filter(l => l.credit > 0);
    
    const primaryDebit = debitAccounts[0]?.accountInfo?.name || debitAccounts[0]?.account;
    const primaryCredit = creditAccounts[0]?.accountInfo?.name || creditAccounts[0]?.account;
    
    if (primaryDebit && primaryCredit) {
      return `Journal Entry: ${primaryDebit} to ${primaryCredit}`;
    }
  }

  // Fallback: Generic narration with account names
  const accountNames = activeLines
    .map(l => l.accountInfo?.name || l.account)
    .filter((name, index, arr) => arr.indexOf(name) === index) // Unique
    .join(", ");
  
  return accountNames ? `Journal Entry - ${accountNames}` : "Journal Entry";
}

/**
 * Check if narration should be auto-generated (empty or default)
 */
export function shouldAutoGenerateNarration(narration: string | undefined | null): boolean {
  if (!narration) return true;
  const trimmed = narration.trim();
  if (trimmed === "" || trimmed === "Journal Entry") return true;
  return false;
}

