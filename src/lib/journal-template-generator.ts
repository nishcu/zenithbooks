/**
 * Journal Template Generator
 * Converts bank transactions into bulk journal template format
 * with bank side pre-filled and counter side blank
 */

import * as XLSX from 'xlsx';
import { formatExcelFromJson } from './export-utils';
import type { BankTransaction } from './bank-statement-parser';

export interface JournalTemplateRow {
  Date: string; // YYYY-MM-DD format
  Amount: number;
  DebitAccount: string; // Pre-filled for deposits, blank for withdrawals
  CreditAccount: string; // Pre-filled for withdrawals, blank for deposits
  Narration: string; // Transaction description from bank statement
}

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD format
 */
function convertDateFormat(dateStr: string): string {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Parse DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    // Validate parts are numbers
    if (!isNaN(Number(day)) && !isNaN(Number(month)) && !isNaN(Number(year))) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Try to parse as Date object if format is different
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  // Return original if can't parse
  return dateStr;
}

/**
 * Generate journal template rows from bank transactions
 * 
 * Logic:
 * - Deposit (Credit > 0): Bank DEBIT (filled), Counter CREDIT (blank)
 * - Withdrawal (Debit > 0): Bank CREDIT (filled), Counter DEBIT (blank)
 * 
 * @param transactions - Array of parsed bank transactions
 * @param bankAccountName - Name of the bank account (e.g., "HDFC Bank", "ICICI Bank")
 * @returns Array of journal template rows
 */
export function generateJournalTemplateRows(
  transactions: BankTransaction[],
  bankAccountName: string
): JournalTemplateRow[] {
  const rows: JournalTemplateRow[] = [];
  
  for (const transaction of transactions) {
    const date = convertDateFormat(transaction.date);
    const narration = transaction.description || 'Bank Transaction';
    
    // Add reference to narration if available
    const narrationWithRef = transaction.reference 
      ? `${narration} (Ref: ${transaction.reference})`
      : narration;
    
    if (transaction.credit > 0) {
      // DEPOSIT: Money IN to bank
      // Bank Account: DEBIT (filled)
      // Counter Account: CREDIT (blank - user fills)
      rows.push({
        Date: date,
        Amount: transaction.credit,
        DebitAccount: bankAccountName, // Pre-filled
        CreditAccount: '', // Blank - user fills
        Narration: narrationWithRef
      });
    } else if (transaction.debit > 0) {
      // WITHDRAWAL: Money OUT from bank
      // Bank Account: CREDIT (filled)
      // Counter Account: DEBIT (blank - user fills)
      rows.push({
        Date: date,
        Amount: transaction.debit,
        DebitAccount: '', // Blank - user fills
        CreditAccount: bankAccountName, // Pre-filled
        Narration: narrationWithRef
      });
    }
    // Skip transactions with both debit and credit (shouldn't happen after parsing)
  }
  
  return rows;
}

/**
 * Generate Excel workbook from journal template rows (Server-side version)
 * Returns Buffer for use in API routes
 * 
 * @param rows - Journal template rows
 * @returns Excel workbook buffer
 */
export function generateJournalTemplateExcelBuffer(
  rows: JournalTemplateRow[]
): Buffer {
  // Create main data sheet
  const ws = XLSX.utils.json_to_sheet(rows);
  formatExcelFromJson(ws, rows);
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Journal Entries");
  
  // Add instructions sheet
  const instructions = [
    { 
      Column: "Date", 
      Description: "Transaction date in YYYY-MM-DD format (e.g., 2024-01-15). Pre-filled from bank statement." 
    },
    { 
      Column: "Amount", 
      Description: "Transaction amount (numeric value, no currency symbols). Pre-filled from bank statement." 
    },
    { 
      Column: "DebitAccount", 
      Description: "Account name to debit. Pre-filled with bank account name for deposits. For withdrawals, leave blank and fill with appropriate expense/asset account name." 
    },
    { 
      Column: "CreditAccount", 
      Description: "Account name to credit. Pre-filled with bank account name for withdrawals. For deposits, leave blank and fill with appropriate income/liability account name." 
    },
    { 
      Column: "Narration", 
      Description: "Description of the transaction. Pre-filled from bank statement." 
    }
  ];
  
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  formatExcelFromJson(wsInstructions, instructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
  
  // Return Buffer for server-side use
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}

/**
 * Generate Excel workbook from journal template rows (Client-side version)
 * Downloads file directly in browser
 * 
 * @param rows - Journal template rows
 * @param fileName - Optional custom file name
 */
export function generateJournalTemplateExcelDownload(
  rows: JournalTemplateRow[],
  fileName?: string
): void {
  // Create main data sheet
  const ws = XLSX.utils.json_to_sheet(rows);
  formatExcelFromJson(ws, rows);
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Journal Entries");
  
  // Add instructions sheet
  const instructions = [
    { 
      Column: "Date", 
      Description: "Transaction date in YYYY-MM-DD format (e.g., 2024-01-15). Pre-filled from bank statement." 
    },
    { 
      Column: "Amount", 
      Description: "Transaction amount (numeric value, no currency symbols). Pre-filled from bank statement." 
    },
    { 
      Column: "DebitAccount", 
      Description: "Account name to debit. Pre-filled with bank account name for deposits. For withdrawals, leave blank and fill with appropriate expense/asset account name." 
    },
    { 
      Column: "CreditAccount", 
      Description: "Account name to credit. Pre-filled with bank account name for withdrawals. For deposits, leave blank and fill with appropriate income/liability account name." 
    },
    { 
      Column: "Narration", 
      Description: "Description of the transaction. Pre-filled from bank statement." 
    }
  ];
  
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  formatExcelFromJson(wsInstructions, instructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
  
  // Download file in browser
  const finalFileName = fileName || 'bank-statement-journal-template.xlsx';
  XLSX.writeFile(wb, finalFileName);
}

/**
 * Complete function to convert bank transactions to journal template Excel (Server-side)
 * Returns Buffer for use in API routes
 * 
 * @param transactions - Array of parsed bank transactions
 * @param bankAccountName - Name of the bank account
 * @returns Excel buffer
 */
export function convertBankStatementToJournalTemplate(
  transactions: BankTransaction[],
  bankAccountName: string
): Buffer {
  const rows = generateJournalTemplateRows(transactions, bankAccountName);
  return generateJournalTemplateExcelBuffer(rows);
}

/**
 * Complete function to convert bank transactions to journal template Excel (Client-side)
 * Downloads file directly in browser
 * 
 * @param transactions - Array of parsed bank transactions
 * @param bankAccountName - Name of the bank account
 * @param fileName - Optional custom file name
 */
export function downloadBankStatementJournalTemplate(
  transactions: BankTransaction[],
  bankAccountName: string,
  fileName?: string
): void {
  const rows = generateJournalTemplateRows(transactions, bankAccountName);
  generateJournalTemplateExcelDownload(rows, fileName);
}
