/**
 * Bank Statement Parser
 * Converts bank statements (CSV/Excel) into structured transaction data
 * for bulk journal template generation
 */

// @ts-ignore - papaparse types not available, but works at runtime
import Papa from 'papaparse';

export interface BankTransaction {
  date: string; // DD/MM/YYYY format
  description: string;
  debit: number; // Amount debited from bank (withdrawal/outgoing)
  credit: number; // Amount credited to bank (deposit/incoming)
  balance: number;
  reference?: string; // Cheque No, UTR, Transaction ID, etc.
  rowIndex: number; // Original row number in the statement for error tracking
}

export interface BankStatementParseResult {
  transactions: BankTransaction[];
  errors: ParseError[];
  format: 'csv' | 'excel';
  detectedFormat?: string; // Bank name if detected
}

export interface ParseError {
  row: number;
  message: string;
  data?: any;
}

/**
 * Common bank statement column aliases
 * Different banks use different column names for the same data
 */
const COLUMN_ALIASES = {
  date: ['Date', 'Transaction Date', 'Value Date', 'Posting Date', 'date', 'DATE', 'Transaction_Date', 'Value_Date'],
  description: ['Description', 'Particulars', 'Narration', 'Remarks', 'Transaction Details', 'Narration/Description', 'description', 'DESCRIPTION', 'Particulars/Narration', 'Transaction_Details'],
  debit: ['Debit', 'Withdrawal', 'Withdraw', 'Dr', 'DR', 'Debit Amount', 'Withdrawal Amount', 'debit', 'DEBIT', 'Debit_Amount'],
  credit: ['Credit', 'Deposit', 'Dep', 'Cr', 'CR', 'Credit Amount', 'Deposit Amount', 'credit', 'CREDIT', 'Credit_Amount'],
  balance: ['Balance', 'Closing Balance', 'Running Balance', 'Available Balance', 'balance', 'BALANCE', 'Closing_Balance', 'Running_Balance'],
  reference: ['Reference', 'Cheque No', 'Cheque Number', 'Chq No', 'Chq Number', 'UTR', 'Transaction ID', 'Ref No', 'Reference No', 'reference', 'REFERENCE', 'Cheque_No', 'Transaction_ID', 'UTR_No']
};

/**
 * Find column index by checking multiple possible names
 */
function findColumnIndex(row: any, aliases: string[]): number {
  const keys = Object.keys(row);
  
  for (const alias of aliases) {
    // Exact match (case-insensitive)
    const exactMatch = keys.find(key => key.toLowerCase() === alias.toLowerCase());
    if (exactMatch !== undefined) {
      return keys.indexOf(exactMatch);
    }
    
    // Partial match (contains)
    const partialMatch = keys.find(key => key.toLowerCase().includes(alias.toLowerCase()) || alias.toLowerCase().includes(key.toLowerCase()));
    if (partialMatch !== undefined) {
      return keys.indexOf(partialMatch);
    }
  }
  
  return -1;
}

/**
 * Get column value from row using aliases
 */
function getColumnValue(row: any, aliases: string[]): string | number | null {
  const keys = Object.keys(row);
  
  for (const alias of aliases) {
    const key = keys.find(k => k.toLowerCase() === alias.toLowerCase() || 
                                k.toLowerCase().includes(alias.toLowerCase()) ||
                                alias.toLowerCase().includes(k.toLowerCase()));
    if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  
  return null;
}

/**
 * Normalize date to DD/MM/YYYY format
 * Handles various date formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.
 */
function normalizeDate(dateValue: any): string {
  if (!dateValue) return '';
  
  const dateStr = String(dateValue).trim();
  
  // If already in DD/MM/YYYY format, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try to parse various formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY or MM-DD-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const [, part1, part2, year] = match;
      // For YYYY-MM-DD, convert to DD/MM/YYYY
      if (format.source.includes('\\d{4}') && format.source.startsWith('^')) {
        return `${part2}/${part1}/${year}`;
      }
      // For MM/DD/YYYY, check if day > 12 (likely DD/MM/YYYY)
      const num1 = parseInt(part1);
      const num2 = parseInt(part2);
      if (num1 > 12) {
        // First part is day
        return `${part1}/${part2}/${year}`;
      } else if (num2 > 12) {
        // Second part is day
        return `${part2}/${part1}/${year}`;
      } else {
        // Ambiguous - assume DD/MM/YYYY (Indian format)
        return `${part1}/${part2}/${year}`;
      }
    }
  }
  
  // Try JavaScript Date parsing as fallback
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return dateStr; // Return as-is if can't parse
}

/**
 * Normalize amount - remove currency symbols, commas, and convert to number
 */
function normalizeAmount(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  
  // Convert to string and clean
  let cleaned = String(value).trim();
  
  // Remove currency symbols (₹, $, etc.)
  cleaned = cleaned.replace(/[₹$€£]/g, '');
  
  // Remove commas and spaces
  cleaned = cleaned.replace(/,/g, '').replace(/\s/g, '');
  
  // Parse as float
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : Math.abs(num); // Always return positive, preserve sign in debit/credit
}

/**
 * Normalize description - clean extra spaces and special characters
 */
function normalizeDescription(value: any): string {
  if (!value) return '';
  
  let desc = String(value).trim();
  // Remove extra whitespace
  desc = desc.replace(/\s+/g, ' ');
  // Remove special control characters but keep basic punctuation
  desc = desc.replace(/[\x00-\x1F\x7F]/g, '');
  
  return desc;
}

/**
 * Parse a single row from bank statement
 */
function parseTransactionRow(row: any, rowIndex: number): { transaction: BankTransaction | null; error: ParseError | null } {
  try {
    // Get date
    const dateValue = getColumnValue(row, COLUMN_ALIASES.date);
    const date = normalizeDate(dateValue);
    
    if (!date) {
      return {
        transaction: null,
        error: {
          row: rowIndex + 1,
          message: 'Date column not found or empty',
          data: row
        }
      };
    }
    
    // Get description
    const descriptionValue = getColumnValue(row, COLUMN_ALIASES.description);
    const description = normalizeDescription(descriptionValue) || 'Bank Transaction';
    
    // Get debit and credit amounts
    const debitValue = getColumnValue(row, COLUMN_ALIASES.debit);
    const creditValue = getColumnValue(row, COLUMN_ALIASES.credit);
    
    const debit = debitValue ? normalizeAmount(debitValue) : 0;
    const credit = creditValue ? normalizeAmount(creditValue) : 0;
    
    // Both debit and credit cannot be present for a single transaction
    // If both are present, prioritize the non-zero value
    let finalDebit = 0;
    let finalCredit = 0;
    
    if (debit > 0 && credit > 0) {
      // Both present - this might be a split transaction or error
      // Prioritize the larger value or check if one is clearly the withdrawal/deposit
      if (debit >= credit) {
        finalDebit = debit;
        finalCredit = 0;
      } else {
        finalDebit = 0;
        finalCredit = credit;
      }
    } else if (debit > 0) {
      finalDebit = debit;
      finalCredit = 0;
    } else if (credit > 0) {
      finalDebit = 0;
      finalCredit = credit;
    } else {
      // No amount found - skip this row
      return {
        transaction: null,
        error: {
          row: rowIndex + 1,
          message: 'No debit or credit amount found',
          data: row
        }
      };
    }
    
    // Get balance (optional)
    const balanceValue = getColumnValue(row, COLUMN_ALIASES.balance);
    const balance = balanceValue ? normalizeAmount(balanceValue) : 0;
    
    // Get reference (optional)
    const referenceValue = getColumnValue(row, COLUMN_ALIASES.reference);
    const reference = referenceValue ? String(referenceValue).trim() : undefined;
    
    const transaction: BankTransaction = {
      date,
      description,
      debit: finalDebit,
      credit: finalCredit,
      balance,
      reference,
      rowIndex: rowIndex + 1
    };
    
    return { transaction, error: null };
    
  } catch (error: any) {
    return {
      transaction: null,
      error: {
        row: rowIndex + 1,
        message: `Error parsing row: ${error.message || 'Unknown error'}`,
        data: row
      }
    };
  }
}

/**
 * Parse CSV data using PapaParse for robust CSV handling
 */
export function parseBankStatementCSV(csvText: string): BankStatementParseResult {
  const errors: ParseError[] = [];
  const transactions: BankTransaction[] = [];
  
  try {
    // Use PapaParse for robust CSV handling
    // This handles quoted fields, commas in fields, etc.
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings for consistent processing
      transformHeader: (header: string) => header.trim(), // Trim header whitespace
      transform: (value: string) => value?.trim() || '' // Trim cell values
    });
    
    if (parseResult.errors && parseResult.errors.length > 0) {
      // Log parsing errors but continue processing
      parseResult.errors.forEach((err: any) => {
        if (err.row !== undefined) {
          errors.push({
            row: err.row + 2, // +2 because row is 0-indexed and we have header
            message: `CSV parsing error: ${err.message || 'Unknown error'}`,
          });
        }
      });
    }
    
    const jsonData = parseResult.data as any[];
    
    if (!jsonData || jsonData.length === 0) {
      return {
        transactions: [],
        errors: [{ row: 0, message: 'CSV file appears to be empty or has no data rows' }],
        format: 'csv'
      };
    }
    
    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip if row is empty (all values are null/undefined/empty string)
      const hasData = Object.values(row).some(value => 
        value !== null && value !== undefined && String(value).trim() !== ''
      );
      
      if (!hasData) {
        continue;
      }
      
      const result = parseTransactionRow(row, i);
      if (result.error) {
        errors.push(result.error);
      } else if (result.transaction) {
        transactions.push(result.transaction);
      }
    }
    
  } catch (error: any) {
    errors.push({
      row: 0,
      message: `CSV parsing error: ${error.message || 'Unknown error'}`,
    });
  }
  
  return {
    transactions,
    errors,
    format: 'csv'
  };
}

/**
 * Basic CSV parser fallback (if PapaParse is not available)
 * This is a simple implementation that may not handle all edge cases
 */
function parseBankStatementCSVBasic(csvText: string): BankStatementParseResult {
  const errors: ParseError[] = [];
  const transactions: BankTransaction[] = [];
  
  try {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 2) {
      return {
        transactions: [],
        errors: [{ row: 0, message: 'CSV file must have at least a header row and one data row' }],
        format: 'csv'
      };
    }
    
    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      
      // Create row object
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Skip if all values are empty
      if (values.every(v => !v || v === '')) {
        continue;
      }
      
      const result = parseTransactionRow(row, i);
      if (result.error) {
        errors.push(result.error);
      } else if (result.transaction) {
        transactions.push(result.transaction);
      }
    }
    
  } catch (error: any) {
    errors.push({
      row: 0,
      message: `CSV parsing error: ${error.message || 'Unknown error'}`,
    });
  }
  
  return {
    transactions,
    errors,
    format: 'csv'
  };
}

/**
 * Parse Excel/JSON data (from XLSX.utils.sheet_to_json)
 */
export function parseBankStatementExcel(jsonData: any[]): BankStatementParseResult {
  const errors: ParseError[] = [];
  const transactions: BankTransaction[] = [];
  
  if (!jsonData || jsonData.length === 0) {
    return {
      transactions: [],
      errors: [{ row: 0, message: 'Excel file appears to be empty or has no data rows' }],
      format: 'excel'
    };
  }
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    // Skip if row is empty (all values are null/undefined/empty string)
    const hasData = Object.values(row).some(value => 
      value !== null && value !== undefined && String(value).trim() !== ''
    );
    
    if (!hasData) {
      continue;
    }
    
    const result = parseTransactionRow(row, i);
    if (result.error) {
      errors.push(result.error);
    } else if (result.transaction) {
      transactions.push(result.transaction);
    }
  }
  
  return {
    transactions,
    errors,
    format: 'excel'
  };
}

/**
 * Main parser function - determines format and parses accordingly
 */
export function parseBankStatement(
  fileContent: ArrayBuffer | string,
  fileName: string
): BankStatementParseResult {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  
  if (fileExtension === 'csv') {
    const csvText = typeof fileContent === 'string' 
      ? fileContent 
      : new TextDecoder().decode(fileContent);
    return parseBankStatementCSV(csvText);
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    // This should be called with pre-parsed JSON data from XLSX
    // The actual Excel parsing should happen in the API route
    return {
      transactions: [],
      errors: [{ row: 0, message: 'Excel parsing should be done via parseBankStatementExcel with pre-parsed JSON data' }],
      format: 'excel'
    };
  } else {
    return {
      transactions: [],
      errors: [{ row: 0, message: `Unsupported file format: ${fileExtension}. Please upload CSV or Excel file.` }],
      format: 'csv' // Default
    };
  }
}