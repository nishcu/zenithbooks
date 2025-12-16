import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { parseBankStatementCSV, parseBankStatementExcel, type BankTransaction, type BankStatementParseResult } from '@/lib/bank-statement-parser';

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

    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unsupported file format. Please upload CSV (.csv) or Excel (.xlsx, .xls) file.' 
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

      parseResult = parseBankStatementExcel(jsonData);
    }

    // Return parsed results
    return NextResponse.json({
      success: true,
      transactions: parseResult.transactions,
      errors: parseResult.errors,
      format: parseResult.format,
      totalRows: parseResult.transactions.length + parseResult.errors.length,
      validTransactions: parseResult.transactions.length,
      errorCount: parseResult.errors.length,
      fileName: fileName
    }, { status: 200 });

  } catch (error: any) {
    console.error('Bank statement parse error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to parse bank statement: ${error.message || 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}

