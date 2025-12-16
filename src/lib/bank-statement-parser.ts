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
  format: 'csv' | 'excel' | 'pdf';
  detectedFormat?: string; // Bank name if detected
}

export interface ParseError {
  row: number;
  message: string;
  data?: any;
}

// Compatibility types for bank-reconciliation page
export interface ParsedTransaction {
  date: string;
  description: string;
  withdrawal: number | null;
  deposit: number | null;
}

export interface SkippedRow {
  rowNumber: number;
  reason: string;
  raw?: string;
}

export interface ParsedResult {
  transactions: ParsedTransaction[];
  rawRowCount?: number;
  skippedRowCount?: number;
  warnings?: string[];
  skippedRows?: SkippedRow[];
}

// Transaction categorization result
export interface TransactionCategory {
  suggestedAccount?: string;
  category?: string;
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
 * Parse PDF file - Extract text and parse transaction data
 * Note: PDF parsing is format-dependent and may not work perfectly for all banks
 */
export async function parseBankStatementPDF(arrayBuffer: ArrayBuffer): Promise<BankStatementParseResult> {
  const errors: ParseError[] = [];
  const transactions: BankTransaction[] = [];
  
  try {
    // Check if we're in a server environment (Node.js)
    if (typeof window !== 'undefined') {
      // Browser environment - PDF parsing not supported in browser
      throw new Error('PDF parsing is only supported in server-side environments. Please use the API endpoint.');
    }
    
    // Polyfill DOMMatrix for pdf-parse if it's not available (Node.js environment)
    // pdf-parse may try to use DOMMatrix which is browser-only
    if (typeof global !== 'undefined') {
      // @ts-ignore - Adding polyfill for Node.js
      if (!global.DOMMatrix) {
        // @ts-ignore
        global.DOMMatrix = class DOMMatrix {
          constructor(init?: string | number[]) {
            this.a = 1;
            this.b = 0;
            this.c = 0;
            this.d = 1;
            this.e = 0;
            this.f = 0;
            if (Array.isArray(init) && init.length >= 6) {
              this.a = init[0];
              this.b = init[1];
              this.c = init[2];
              this.d = init[3];
              this.e = init[4];
              this.f = init[5];
            }
          }
          a: number = 1;
          b: number = 0;
          c: number = 0;
          d: number = 1;
          e: number = 0;
          f: number = 0;
          multiply(other: any): DOMMatrix { return this; }
          translate(x: number, y: number): DOMMatrix { return this; }
          scale(x: number, y?: number): DOMMatrix { return this; }
          rotate(angle: number): DOMMatrix { return this; }
        };
      }
    }
    
    // pdf-parse is a CommonJS module that exports PDFParse class
    // Use require() directly in Node.js environment (server-side)
    const pdfBuffer = Buffer.from(arrayBuffer);
    
    let text: string;
    try {
      // pdf-parse exports PDFParse class
      // Configure worker BEFORE requiring to prevent dynamic loading issues
      const pdfParseModule = require('pdf-parse');
      const { PDFParse } = pdfParseModule;
      
      // Set worker configuration BEFORE creating any instances
      // In Node.js, setWorker('') disables dynamic worker loading
      if (typeof PDFParse?.setWorker === 'function') {
        try {
          PDFParse.setWorker('');
        } catch (workerConfigError: any) {
          // Log but continue - worker setup is optional in Node.js
          console.warn('PDFParse worker configuration warning:', workerConfigError.message);
        }
      }
      
      // Create instance with data buffer
      // In Node.js environment, PDFParse should use built-in parsing without worker
      const pdfParser = new PDFParse({ 
        data: pdfBuffer,
        verbosity: pdfParseModule.VerbosityLevel?.ERRORS || 0
      });
      
      // Get text from PDF
      // Wrap in try-catch to catch worker-related errors during parsing
      try {
        const result = await pdfParser.getText({});
        text = result.text || '';
      } catch (parseError: any) {
        const parseErrorMsg = parseError.message || String(parseError);
        // If worker error occurs during parsing, provide helpful message
        if (parseErrorMsg.includes('worker') || parseErrorMsg.includes('Cannot find module') || parseErrorMsg.includes('expression is too dynamic')) {
          throw new Error('PDF parsing failed due to worker configuration issue. Please convert your bank statement to CSV or Excel format and try again.');
        }
        throw parseError;
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      
      // Check for worker-related errors
      if (errorMsg.includes('worker') || errorMsg.includes('Cannot find module') || errorMsg.includes('expression is too dynamic')) {
        // Return a user-friendly error suggesting CSV/Excel conversion
        return {
          transactions: [],
          errors: [{
            row: 0,
            message: 'PDF parsing is not available due to technical limitations. Please convert your bank statement to CSV or Excel format and try again. Use the "Download Template" button for the correct format.'
          }],
          format: 'pdf'
        };
      }
      
      // Other PDF parsing errors
      return {
        transactions: [],
        errors: [{
          row: 0,
          message: `PDF parsing failed: ${errorMsg}. Please convert your bank statement to CSV or Excel format and try again.`
        }],
        format: 'pdf'
      };
    }
    
    if (!text || text.trim().length === 0) {
      return {
        transactions: [],
        errors: [{ row: 0, message: 'PDF file appears to be empty or contains no extractable text' }],
        format: 'pdf'
      };
    }
    
    // Split text into lines - also try splitting by multiple spaces or tabs
    const rawLines = text.split(/\n|\r\n/);
    const lines = rawLines.map(line => line.trim()).filter(line => line.length > 3); // Minimum 3 chars
    
    // More aggressive parsing - try to extract ANY line with date and amount
    // Don't skip lines unless they're clearly headers/footers
    
    // Parse ALL lines and try to extract transactions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip ONLY obvious header/footer rows
      const lineLower = line.toLowerCase().trim();
      if (lineLower === '' ||
          lineLower === 'date' ||
          lineLower === 'description' ||
          (lineLower.includes('page') && lineLower.match(/^\s*page\s+\d+\s*$/i)) ||
          (lineLower.includes('opening balance') && lineLower.match(/opening\s+balance.*$/i)) ||
          (lineLower.includes('closing balance') && lineLower.match(/closing\s+balance.*$/i)) ||
          lineLower.match(/^statement\s+of\s+account\s*$/i)) {
            continue;
          }

      try {
        // Try to extract date (DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD)
        const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
        if (!dateMatch) continue;
        
        const dateStr = dateMatch[0].replace(/-/g, '/');
        
        // Extract amounts - very flexible pattern
        // Match ANY number that could be an amount (with or without currency)
        const amountPattern = /(?:₹|Rs\.?|INR\s*|)\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{2})?|\d+\.\d{2}|\d+)/gi;
        const amountMatches: string[] = [];
        let match;
        while ((match = amountPattern.exec(line)) !== null) {
          const amount = match[0].replace(/[₹Rs.,INR\s]/g, '');
          const numValue = parseFloat(amount);
          // Only consider amounts >= 1 (skip small numbers that are likely not transactions)
          if (!isNaN(numValue) && numValue >= 1) {
            amountMatches.push(match[0]);
          }
        }
        
        // If no amounts found, try simpler pattern - just look for large numbers
        if (amountMatches.length === 0) {
          const simpleNumberPattern = /\b(\d{3,}(?:\.\d{2})?)\b/g;
          let simpleMatch;
          while ((simpleMatch = simpleNumberPattern.exec(line)) !== null) {
            const numValue = parseFloat(simpleMatch[1].replace(/,/g, ''));
            if (numValue >= 100) { // Only amounts >= 100
              amountMatches.push(simpleMatch[1]);
            }
          }
        }
        
        if (!amountMatches || amountMatches.length === 0) continue;
        
        // Extract description (text between date and amounts, or before/after)
        const dateIndex = line.indexOf(dateMatch[0]);
        const firstAmountIndex = line.indexOf(amountMatches[0]);
        
        let description = '';
        if (dateIndex < firstAmountIndex) {
          // Date comes before amount
          description = line.substring(dateIndex + dateMatch[0].length, firstAmountIndex).trim();
        } else {
          // Amount comes before date (less common)
          description = line.substring(firstAmountIndex + amountMatches[0].length, dateIndex).trim();
        }
        
        // If description is too short, try to get text from the whole line excluding date and amounts
        if (!description || description.length < 2) {
          // Remove date and all amounts from line, what remains is description
          let descLine = line;
          descLine = descLine.replace(dateMatch[0], '');
          amountMatches.forEach(amt => {
            descLine = descLine.replace(amt, '');
          });
          description = descLine.replace(/[|,;]/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        // Skip if description is still too short or is just numbers/special chars
        if (!description || description.length < 2 || /^[\d\s\.\-]+$/.test(description)) continue;
        
        // Determine if it's debit or credit
        // Common indicators: DR, CR, Debit, Credit, or position in statement
        const isDebit = line.toLowerCase().includes('dr') || 
                       line.toLowerCase().includes('debit') ||
                       line.toLowerCase().includes('withdraw') ||
                       /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}.*\d+.*\s+(\d+)/.test(line); // Amount at end often indicates debit
        
        const isCredit = line.toLowerCase().includes('cr') ||
                        line.toLowerCase().includes('credit') ||
                        line.toLowerCase().includes('deposit');
        
        // Extract numeric amounts (remove currency symbols and commas)
        const amounts = amountMatches.map(match => {
          const numStr = match.replace(/[₹Rs.,INR\s]/g, '');
          return parseFloat(numStr);
        }).filter(num => !isNaN(num) && num > 0);
        
        if (amounts.length === 0) continue;
        
        // Use the first significant amount
        const amount = amounts[0];
        
        // Determine debit/credit
        let debit = 0;
        let credit = 0;
        
        if (isDebit && !isCredit) {
          debit = amount;
        } else if (isCredit || (!isDebit && !isCredit)) {
          // If unclear or credit indicator, assume credit (deposit)
          credit = amount;
        } else {
          // If both or ambiguous, skip
          continue;
        }
        
        // Extract reference if present (UTR, Cheque No, etc.)
        const refMatch = line.match(/(?:UTR|CHQ|CHQNO|REF|REFNO)[\s:]*([A-Z0-9]+)/i);
        const reference = refMatch ? refMatch[1] : undefined;
        
        transactions.push({
          date: dateStr,
          description: description.substring(0, 200), // Limit description length
          debit,
          credit,
          balance: 0, // Balance might be in another column, hard to extract reliably
          reference,
          rowIndex: i + 1
        });
        
      } catch (lineError: any) {
        errors.push({
          row: i + 1,
          message: `Error parsing line: ${lineError.message || 'Unknown error'}`,
          data: line
        });
      }
    }
    
    if (transactions.length === 0) {
      errors.push({
        row: 0,
        message: 'No transactions found in PDF. The PDF format may not be supported. Please try converting to CSV or Excel format.'
      });
    }
      
    } catch (error: any) {
    errors.push({
      row: 0,
      message: `PDF parsing error: ${error.message || 'Unknown error'}. PDF format may not be supported.`
    });
  }
  
  return {
    transactions,
    errors,
    format: 'pdf'
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

/**
 * Compatibility function: Convert BankTransaction to ParsedTransaction format
 */
function convertToParsedTransaction(txn: BankTransaction): ParsedTransaction {
  return {
    date: txn.date,
    description: txn.description,
    withdrawal: txn.debit > 0 ? txn.debit : null,
    deposit: txn.credit > 0 ? txn.credit : null,
  };
}

/**
 * Compatibility function: Convert ParseError to SkippedRow
 */
function convertToSkippedRow(error: ParseError, rowData?: any): SkippedRow {
  return {
    rowNumber: error.row,
    reason: error.message,
    raw: rowData ? JSON.stringify(rowData) : undefined,
  };
}

/**
 * Compatibility function: Parse CSV file (for bank-reconciliation page)
 * Takes a File object and returns ParsedResult
 */
export async function parseCSV(file: File): Promise<ParsedResult> {
  const text = await file.text();
  const result = parseBankStatementCSV(text);
  
  const transactions = result.transactions.map(convertToParsedTransaction);
  const skippedRows = result.errors.map(err => convertToSkippedRow(err));
  
  return {
    transactions,
    rawRowCount: result.transactions.length + result.errors.length,
    skippedRowCount: result.errors.length,
    warnings: result.errors.length > 0 ? result.errors.map(e => `Row ${e.row}: ${e.message}`) : [],
    skippedRows: skippedRows.length > 0 ? skippedRows : undefined,
  };
}

/**
 * Compatibility function: Parse Excel file (for bank-reconciliation page)
 * Takes a File object and returns ParsedResult
 */
export async function parseExcel(file: File): Promise<ParsedResult> {
  // Dynamic import to avoid server-side issues
  const XLSX = await import('xlsx');
  
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    defval: '',
    raw: false
  });
  
  const result = parseBankStatementExcel(jsonData);
  
  const transactions = result.transactions.map(convertToParsedTransaction);
  const skippedRows = result.errors.map(err => convertToSkippedRow(err));
  
  return {
    transactions,
    rawRowCount: result.transactions.length + result.errors.length,
    skippedRowCount: result.errors.length,
    warnings: result.errors.length > 0 ? result.errors.map(e => `Row ${e.row}: ${e.message}`) : [],
    skippedRows: skippedRows.length > 0 ? skippedRows : undefined,
  };
}

/**
 * Compatibility function: Parse PDF file (for bank-reconciliation page)
 * Takes a File object and returns ParsedResult
 */
export async function parsePDF(file: File): Promise<ParsedResult> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await parseBankStatementPDF(arrayBuffer);
  
  const transactions = result.transactions.map(convertToParsedTransaction);
  const skippedRows = result.errors.map(err => convertToSkippedRow(err));
  
  return {
    transactions,
    rawRowCount: result.transactions.length + result.errors.length,
    skippedRowCount: result.errors.length,
    warnings: result.errors.length > 0 ? result.errors.map(e => `Row ${e.row}: ${e.message}`) : [],
    skippedRows: skippedRows.length > 0 ? skippedRows : undefined,
  };
}

/**
 * Compatibility function: Categorize transaction based on description
 * Returns suggested account code based on transaction description patterns
 */
export function categorizeTransaction(description: string): TransactionCategory {
  const desc = description.toLowerCase();
  
  // Basic categorization patterns
  if (desc.includes('salary') || desc.includes('wages')) {
    return { suggestedAccount: '6010', category: 'Salary' }; // Salaries and Wages - Indirect
  }
  if (desc.includes('rent')) {
    return { suggestedAccount: '6020', category: 'Rent' }; // Rent Expense
  }
  if (desc.includes('electricity') || desc.includes('power') || desc.includes('utility')) {
    return { suggestedAccount: '6140', category: 'Utilities' }; // Electricity & Water
  }
  if (desc.includes('interest') && (desc.includes('received') || desc.includes('credit'))) {
    return { suggestedAccount: '4510', category: 'Interest Income' }; // Interest Income
  }
  if (desc.includes('sales') || desc.includes('revenue')) {
    return { suggestedAccount: '4010', category: 'Sales' }; // Sales Revenue
  }
  if (desc.includes('purchase') || desc.includes('bought')) {
    return { suggestedAccount: '5050', category: 'Purchases' }; // Purchases
  }
  if (desc.includes('bank charges') || desc.includes('bank fee')) {
    return { suggestedAccount: '6070', category: 'Bank Charges' }; // Bank Charges
  }
  
  // Default suggestions based on common patterns
  return { suggestedAccount: undefined, category: 'Other' };
}