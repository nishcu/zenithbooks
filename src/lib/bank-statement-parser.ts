/**
 * Bank Statement Parser
 * Supports PDF, CSV, and Excel file formats
 */

import * as XLSX from 'xlsx';

export interface ParsedTransaction {
  date: string;
  description: string;
  withdrawal: number | null;
  deposit: number | null;
  balance?: number | null;
  reference?: string;
  type?: 'debit' | 'credit';
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  accountNumber?: string;
  accountName?: string;
  statementPeriod?: { from: string; to: string };
  openingBalance?: number;
  closingBalance?: number;
  rawRowCount?: number;
  skippedRowCount?: number;
  warnings?: string[];
}

function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  let stringValue = String(value).trim();
  if (!stringValue) return null;

  const hasParentheses =
    stringValue.includes('(') && stringValue.includes(')');

  // Remove currency symbols, spaces (including non-breaking) and alpha chars
  stringValue = stringValue
    .replace(/\s+/g, '')
    .replace(/[^\d.,\-]/g, '');

  if (!stringValue) return null;

  stringValue = stringValue.replace(/,/g, '');

  if (hasParentheses && !stringValue.startsWith('-')) {
    stringValue = `-${stringValue}`;
  }

  const parsed = Number.parseFloat(stringValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAmount(value: number | null): number | null {
  if (value === null) return null;
  const absValue = Math.abs(value);
  return absValue > 0 ? absValue : null;
}

/**
 * Parse CSV file
 */
export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV file is empty or invalid'));
          return;
        }

        // Try to detect header row
        let dateIndex = -1;
        let descIndex = -1;
        let debitIndex = -1;
        let creditIndex = -1;
        let withdrawalIndex = -1;
        let depositIndex = -1;
        let balanceIndex = -1;
        let amountIndex = -1;
        let typeIndex = -1;

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const normalizedHeaders = headers.map(h => h.replace(/\s+/g, ''));
        
        headers.forEach((header, index) => {
          const normalized = normalizedHeaders[index];
          if (header.includes('date')) dateIndex = index;
          if (header.includes('description') || header.includes('particulars') || header.includes('narration') || header.includes('details')) descIndex = index;
          if (/\b(dr|debit|withdrawal)\b/.test(header)) {
            debitIndex = index;
            withdrawalIndex = index;
          }
          if (/\b(cr|credit|deposit)\b/.test(header)) {
            creditIndex = index;
            depositIndex = index;
          }
          if ((header.includes('amount') || header.includes('amt')) && !header.includes('balance') && amountIndex === -1) {
            amountIndex = index;
          }
          if (header.includes('balance')) balanceIndex = index;
          if (
            typeIndex === -1 &&
            (
              header.includes('dr/cr') ||
              header.includes('cr/dr') ||
              normalized === 'drcr' ||
              normalized === 'crdr' ||
              header.includes('txn type') ||
              header.includes('transaction type') ||
              header.includes('debit/credit')
            )
          ) {
            typeIndex = index;
          }
        });

        // If no headers found, assume standard format: Date, Description, Withdrawal, Deposit
        if (dateIndex === -1) dateIndex = 0;
        if (descIndex === -1) descIndex = 1;
        if (withdrawalIndex === -1 && debitIndex === -1) withdrawalIndex = 2;
        if (depositIndex === -1 && creditIndex === -1) depositIndex = 3;

        const transactions: ParsedTransaction[] = [];
        const startIndex = headers.some(h => h.includes('date')) ? 1 : 0;
        let rawRowCount = 0;
        let skippedRowCount = 0;

        for (let i = startIndex; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const getValue = (idx: number) => (idx >= 0 && idx < values.length ? values[idx] : '');
          
          if (values.length < 2) continue;
          const hasContent = values.some(value => value && value.trim() !== '');
          if (!hasContent) continue;

          rawRowCount++;

          const dateStr = getValue(dateIndex);
          const description = getValue(descIndex);
          const withdrawalStr = getValue(withdrawalIndex >= 0 ? withdrawalIndex : debitIndex);
          const depositStr = getValue(depositIndex >= 0 ? depositIndex : creditIndex);
          const balanceStr = getValue(balanceIndex);
          const amountStr = getValue(amountIndex);
          const typeIndicator = getValue(typeIndex);

          if (!dateStr || !description) {
            skippedRowCount++;
            continue;
          }

          const withdrawalRaw = parseAmount(withdrawalStr);
          const depositRaw = parseAmount(depositStr);
          const balance = parseAmount(balanceStr);
          const amountValue = parseAmount(amountStr);
          const derivedType = determineTypeFromIndicator(typeIndicator);

          let withdrawal = normalizeAmount(withdrawalRaw);
          let deposit = normalizeAmount(depositRaw);

          if ((withdrawal === null && deposit === null) && amountValue !== null && amountValue !== 0) {
            if (derivedType === 'credit') {
              deposit = Math.abs(amountValue);
            } else if (derivedType === 'debit') {
              withdrawal = Math.abs(amountValue);
            } else if (amountValue > 0) {
              deposit = amountValue;
            } else if (amountValue < 0) {
              withdrawal = Math.abs(amountValue);
            }
          }

          if (withdrawal === null && deposit === null) {
            skippedRowCount++;
            continue;
          }

          transactions.push({
            date: parseDate(dateStr),
            description: description.trim(),
            withdrawal: withdrawal && withdrawal > 0 ? withdrawal : null,
            deposit: deposit && deposit > 0 ? deposit : null,
            balance: balance || null,
            type: deposit && deposit > 0 ? 'credit' : 'debit',
          });
        }

        const warnings: string[] = [];
        if (skippedRowCount > 0) {
          warnings.push(`${skippedRowCount} row${skippedRowCount === 1 ? '' : 's'} skipped due to missing dates or amounts.`);
        }

        resolve({ transactions, rawRowCount, skippedRowCount, warnings });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Parse Excel file
 */
export function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', raw: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];

        if (json.length < 2) {
          reject(new Error('Excel file is empty or invalid'));
          return;
        }

        // Detect header row
        const headerRow = json[0].map((h: any) => String(h || '').toLowerCase());
        let dateIndex = -1;
        let descIndex = -1;
        let debitIndex = -1;
        let creditIndex = -1;
        let withdrawalIndex = -1;
        let depositIndex = -1;
        let balanceIndex = -1;
        let amountIndex = -1;
        let typeIndex = -1;

        headerRow.forEach((header, index) => {
          const h = String(header || '').toLowerCase();
          const normalized = h.replace(/\s+/g, '');
          if (h.includes('date')) dateIndex = index;
          if (h.includes('description') || h.includes('particulars') || h.includes('narration') || h.includes('details')) descIndex = index;
          if (/\b(dr|debit|withdrawal)\b/.test(h)) {
            debitIndex = index;
            withdrawalIndex = index;
          }
          if (/\b(cr|credit|deposit)\b/.test(h)) {
            creditIndex = index;
            depositIndex = index;
          }
          if ((h.includes('amount') || h.includes('amt')) && !h.includes('balance') && amountIndex === -1) {
            amountIndex = index;
          }
          if (h.includes('balance')) balanceIndex = index;
          if (
            typeIndex === -1 &&
            (
              h.includes('dr/cr') ||
              h.includes('cr/dr') ||
              normalized === 'drcr' ||
              normalized === 'crdr' ||
              h.includes('txn type') ||
              h.includes('transaction type') ||
              h.includes('debit/credit')
            )
          ) {
            typeIndex = index;
          }
        });

        // Default indices if not found
        if (dateIndex === -1) dateIndex = 0;
        if (descIndex === -1) descIndex = 1;
        if (withdrawalIndex === -1 && debitIndex === -1) withdrawalIndex = 2;
        if (depositIndex === -1 && creditIndex === -1) depositIndex = 3;

        const transactions: ParsedTransaction[] = [];
        const startIndex = headerRow.some(h => h.includes('date')) ? 1 : 0;
        let rawRowCount = 0;
        let skippedRowCount = 0;

        for (let i = startIndex; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length < 2) continue;

          const getCell = (idx: number) =>
            idx >= 0 && idx < row.length ? row[idx] : '';

          const hasContent = row.some(cell => {
            if (cell === null || cell === undefined) return false;
            return String(cell).trim() !== '';
          });
          if (!hasContent) continue;

          rawRowCount++;

          const dateStr = String(getCell(dateIndex) || '');
          const description = String(getCell(descIndex) || '');
          const withdrawalStr = getCell(withdrawalIndex >= 0 ? withdrawalIndex : debitIndex);
          const depositStr = getCell(depositIndex >= 0 ? depositIndex : creditIndex);
          const balanceStr = getCell(balanceIndex);
          const amountStr = getCell(amountIndex);
          const typeIndicator = getCell(typeIndex);

          if (!dateStr || !description) {
            skippedRowCount++;
            continue;
          }

          const withdrawalRaw = parseAmount(withdrawalStr);
          const depositRaw = parseAmount(depositStr);
          const balance = parseAmount(balanceStr);
          const amountValue = parseAmount(amountStr);
          const derivedType = determineTypeFromIndicator(typeIndicator);

          let withdrawal = normalizeAmount(withdrawalRaw);
          let deposit = normalizeAmount(depositRaw);

          if ((withdrawal === null && deposit === null) && amountValue !== null && amountValue !== 0) {
            if (derivedType === 'credit') {
              deposit = Math.abs(amountValue);
            } else if (derivedType === 'debit') {
              withdrawal = Math.abs(amountValue);
            } else if (amountValue > 0) {
              deposit = amountValue;
            } else if (amountValue < 0) {
              withdrawal = Math.abs(amountValue);
            }
          }

          if (withdrawal === null && deposit === null) {
            skippedRowCount++;
            continue;
          }

          transactions.push({
            date: parseDate(dateStr),
            description: description.trim(),
            withdrawal: withdrawal && withdrawal > 0 ? withdrawal : null,
            deposit: deposit && deposit > 0 ? deposit : null,
            balance: balance || null,
            type: deposit && deposit > 0 ? 'credit' : 'debit',
          });
        }

        const warnings: string[] = [];
        if (skippedRowCount > 0) {
          warnings.push(`${skippedRowCount} row${skippedRowCount === 1 ? '' : 's'} skipped due to missing dates or amounts.`);
        }

        resolve({ transactions, rawRowCount, skippedRowCount, warnings });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse PDF file
 * Note: PDF parsing requires pdfjs-dist library. For now, we provide a helpful error message.
 * Users can convert PDF to CSV/Excel or use a backend API for PDF processing.
 * 
 * To enable PDF parsing, install: npm install pdfjs-dist
 * Then uncomment and use the pdf.js implementation below.
 */
export function parsePDF(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    // For now, show a helpful message
    // PDF parsing can be enabled by installing pdfjs-dist and implementing the parser
    reject(new Error(
      'PDF parsing is currently not available in the browser. ' +
      'Please convert your PDF bank statement to CSV or Excel format. ' +
      'Most banks allow you to download statements in CSV/Excel format. ' +
      'Alternatively, you can use online PDF to Excel converters. ' +
      'We recommend using CSV or Excel format for best results.'
    ));
    
    /* 
    // Uncomment this when pdfjs-dist is installed:
    try {
      // Dynamic import of pdf.js to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Extract text and parse transactions...
      // (Implementation would go here)
      
    } catch (error: any) {
      reject(new Error(`PDF parsing failed: ${error.message}`));
    }
    */
  });
}

/**
 * Parse date string in various formats
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Try parsing as Excel date number
  if (!isNaN(Number(dateStr))) {
    const excelDate = Number(dateStr);
    if (excelDate > 25569) { // Excel epoch starts at 1900-01-01
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
  }

  // Try common date formats
  const formats = [
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, // DD-MM-YYYY or DD/MM/YYYY
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
    /(\d{1,2})\s+(\w{3,})\s+(\d{4})/i, // DD MMM YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // DD-MM-YYYY
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (format === formats[1]) {
        // YYYY-MM-DD
        const [, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (format === formats[2]) {
        // DD MMM YYYY
        const [, day, month, year] = match;
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = monthNames.findIndex(m => month.toLowerCase().startsWith(m));
        if (monthIndex !== -1) {
          return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
  }

  // Try direct Date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  // Default to today
  return new Date().toISOString().split('T')[0];
}

function determineTypeFromIndicator(value?: unknown): 'credit' | 'debit' | null {
  const normalized = typeof value === 'string'
    ? value.toLowerCase().trim()
    : typeof value === 'number'
      ? String(value).toLowerCase().trim()
      : '';

  if (!normalized) return null;

  const alphanumeric = normalized.replace(/[^a-z]/g, '');
  const creditKeywords = ['cr', 'credit', 'c', 'receipt', 'deposit', 'inward', 'received'];
  const debitKeywords = ['dr', 'debit', 'd', 'payment', 'withdrawal', 'wdl', 'outward', 'paid'];

  if (creditKeywords.some(keyword => alphanumeric === keyword || normalized.includes(keyword))) {
    return 'credit';
  }

  if (debitKeywords.some(keyword => alphanumeric === keyword || normalized.includes(keyword))) {
    return 'debit';
  }

  return null;
}

/**
 * Auto-detect transaction type and suggest account
 */
export function categorizeTransaction(description: string): {
  type: 'receipt' | 'payment' | 'unknown';
  suggestedAccount?: string;
  category?: string;
} {
  const desc = description.toLowerCase();
  
  // Receipt patterns
  const receiptPatterns = [
    { pattern: /salary|income|revenue|sale|invoice|payment received|credit|deposit|refund/i, account: '4010', category: 'Revenue' },
    { pattern: /loan|advance received|borrowed/i, account: '1610', category: 'Loan' },
    { pattern: /investment|dividend|interest received/i, account: '1410', category: 'Investment' },
  ];

  // Payment patterns
  const paymentPatterns = [
    { pattern: /rent|lease|accommodation/i, account: '5010', category: 'Rent' },
    { pattern: /salary|wages|payroll|employee/i, account: '5020', category: 'Salaries' },
    { pattern: /electricity|power|utility/i, account: '5030', category: 'Utilities' },
    { pattern: /phone|telecom|mobile/i, account: '5030', category: 'Utilities' },
    { pattern: /internet|broadband/i, account: '5030', category: 'Utilities' },
    { pattern: /purchase|buy|vendor|supplier|bill/i, account: '5050', category: 'Purchases' },
    { pattern: /tax|gst|tds|income tax/i, account: '2110', category: 'Tax' },
    { pattern: /loan repayment|emi|installment/i, account: '1610', category: 'Loan' },
    { pattern: /insurance|premium/i, account: '5040', category: 'Insurance' },
    { pattern: /maintenance|repair|service/i, account: '5060', category: 'Maintenance' },
  ];

  for (const receipt of receiptPatterns) {
    if (receipt.pattern.test(desc)) {
      return { type: 'receipt', suggestedAccount: receipt.account, category: receipt.category };
    }
  }

  for (const payment of paymentPatterns) {
    if (payment.pattern.test(desc)) {
      return { type: 'payment', suggestedAccount: payment.account, category: payment.category };
    }
  }

  return { type: 'unknown' };
}

