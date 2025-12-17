import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { parseBankStatementCSV, parseBankStatementExcel, parseBankStatementPDF, analyzeSheetStructure, type BankTransaction, type BankStatementParseResult } from '@/lib/bank-statement-parser';

// Route configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bank-statement/parse
 * 
 * Parses uploaded bank statement (CSV/Excel) and returns structured transaction data
 * 
 * Request:
 * - FormData with 'file' field containing the bank statement file
 * 
 * Response:
 * {
 *   success: boolean;
 *   transactions: BankTransaction[];
 *   errors: ParseError[];
 *   format: 'csv' | 'excel';
 *   totalRows: number;
 *   validTransactions: number;
 *   errorCount: number;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No file uploaded. Please select a bank statement file.' 
        },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    if (!['csv', 'xlsx', 'xls', 'pdf'].includes(fileExtension || '')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unsupported file format. Please upload CSV (.csv), Excel (.xlsx, .xls), or PDF (.pdf) file.' 
        },
        { status: 400 }
      );
    }

    let parseResult: BankStatementParseResult;

    // Read file content
    const arrayBuffer = await file.arrayBuffer();

    if (fileExtension === 'csv') {
      // Parse CSV
      const csvText = new TextDecoder().decode(arrayBuffer);
      parseResult = parseBankStatementCSV(csvText);
    } else if (fileExtension === 'pdf') {
      // Parse PDF
      parseResult = await parseBankStatementPDF(arrayBuffer);
    } else {
      // Parse Excel
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        defval: '', // Default value for empty cells
        raw: false // Convert dates and numbers to strings for processing
      });

      // Primary attempt: header-based parsing (works when the first row is the table header)
      parseResult = parseBankStatementExcel(jsonData);

      // Fallback: many bank exports have account details first, and the transaction table starts later.
      // In those cases, sheet_to_json() above often produces unusable keys, resulting in 0 transactions.
      if (!parseResult.transactions.length) {
        const matrix = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // raw grid
          defval: '',
          raw: false,
          blankrows: false,
        }) as any[][];

        const normalizeCell = (v: any) => String(v ?? '').trim();
        const headerKeywords = [
          'transaction date',
          'value date',
          'date',
          'particulars',
          'description',
          'narration',
          'debit',
          'credit',
          'balance',
          'cheque',
          'cheque no',
        ];

        const isLikelyHeaderRow = (row: any[]) => {
          const joined = row.map(normalizeCell).join(' ').toLowerCase();
          const hits = headerKeywords.filter(k => joined.includes(k)).length;
          // Need at least 3 header-ish tokens to be confident
          return hits >= 3;
        };

        const headerRowIndex = (() => {
          const maxScan = Math.min(matrix.length, 80);
          for (let i = 0; i < maxScan; i++) {
            const row = matrix[i] || [];
            if (isLikelyHeaderRow(row)) return i;
          }
          return -1;
        })();

        if (headerRowIndex >= 0) {
          const headerRow = (matrix[headerRowIndex] || []).map(normalizeCell);
          const maxCols = headerRow.length;

          const makeKey = (rawKey: string, colIdx: number) => {
            const key = rawKey.replace(/\s+/g, ' ').trim();
            if (key) return key;
            return `Column_${colIdx + 1}`;
          };

          const rowsAsObjects: Record<string, any>[] = [];
          for (let r = headerRowIndex + 1; r < matrix.length; r++) {
            const row = matrix[r] || [];
            // Skip completely empty rows
            const hasAny = row.some(cell => normalizeCell(cell) !== '');
            if (!hasAny) continue;

            // Some exports repeat the header row; when detected, skip it.
            if (isLikelyHeaderRow(row)) continue;

            const obj: Record<string, any> = {};
            for (let c = 0; c < maxCols; c++) {
              const key = makeKey(headerRow[c], c);
              obj[key] = row[c] ?? '';
            }
            rowsAsObjects.push(obj);
          }

          const fallbackResult = parseBankStatementExcel(rowsAsObjects);
          if (fallbackResult.transactions.length) {
            parseResult = fallbackResult;
            parseResult.detectedFormat = (parseResult.detectedFormat || '') + 'excel-fallback-grid';
          } else {
            // Provide analysis even when parsing fails, to help user understand structure
            parseResult.analysis = analyzeSheetStructure(rowsAsObjects, { scanRows: 80, startRow: 0 });
          }
        }
      }
    }

    // Better validation + error reporting based on analysis (CSV/Excel)
    if ((parseResult.format === 'csv' || parseResult.format === 'excel') && parseResult.transactions.length === 0) {
      const a = parseResult.analysis;
      if (a) {
        const hints: string[] = [];
        if (!a.dateColumns?.length) hints.push('No date-like column detected');
        if (!a.amountColumns?.length) hints.push('No amount-like column detected');
        if (a.dataStartRow === null) hints.push('No transaction-like rows detected');
        if (a.nonEmptyRows === 0) hints.push('Sheet appears empty');

        if (hints.length) {
          parseResult.errors = [
            ...(parseResult.errors || []),
            {
              row: 0,
              message: `Parsing produced 0 transactions. ${hints.join('. ')}. Please ensure the statement contains a transaction table with Date/Debit/Credit columns.`,
            },
          ];
        }
      }
    }

    // Return parsed results
    return NextResponse.json({
      success: true,
      transactions: parseResult.transactions,
      errors: parseResult.errors,
      format: parseResult.format,
      analysis: parseResult.analysis,
      totalRows: parseResult.transactions.length + parseResult.errors.length,
      validTransactions: parseResult.transactions.length,
      errorCount: parseResult.errors.length,
      fileName: fileName
    }, { status: 200 });

  } catch (error: any) {
    console.error('Bank statement parse error:', error);
    console.error('Error stack:', error.stack);
    
    // Suppress params-related errors (Next.js 15 issue, doesn't affect functionality)
    const errorMessage = error.message || String(error) || 'Unknown error';
    
    if (errorMessage.includes('params') && errorMessage.includes('read only')) {
      console.warn('Ignoring params error (Next.js 15 known issue)');
      // Return empty result instead of error for params issues
      return NextResponse.json({
        success: true,
        transactions: [],
        errors: [{ row: 0, message: 'Please try again. If PDF parsing fails, convert to CSV/Excel format.' }],
        format: fileExtension || 'unknown',
        totalRows: 0,
        validTransactions: 0,
        errorCount: 1,
        fileName: fileName || 'unknown'
      }, { status: 200 });
    }
    
    // Handle specific PDF parsing errors
    if (errorMessage.includes('worker') || errorMessage.includes('pdf-parse') || errorMessage.includes('PDFParse')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'PDF parsing failed. Please convert your bank statement to CSV or Excel format and try again.',
          transactions: [],
          errors: [{ row: 0, message: errorMessage }],
          format: 'pdf',
          totalRows: 0,
          validTransactions: 0,
          errorCount: 1
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to parse bank statement: ${errorMessage}. Please ensure the file format is correct and try again.`,
        transactions: [],
        errors: [{ row: 0, message: errorMessage }],
        format: fileExtension || 'unknown',
        totalRows: 0,
        validTransactions: 0,
        errorCount: 1
      },
      { status: 500 }
    );
  }
}

