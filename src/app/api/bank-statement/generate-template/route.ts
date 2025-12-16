import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { 
  convertBankStatementToJournalTemplate,
  generateJournalTemplateRows 
} from '@/lib/journal-template-generator';
import type { BankTransaction } from '@/lib/bank-statement-parser';

// Route configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bank-statement/generate-template
 * 
 * Generates a pre-filled bulk journal template Excel file from bank transactions
 * 
 * Request Body (JSON):
 * {
 *   transactions: BankTransaction[];
 *   bankAccountName: string;
 *   fileName?: string; // Optional custom file name
 * }
 * 
 * Response:
 * - Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
 * - Content-Disposition header with file name
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { transactions, bankAccountName, fileName } = body;
    
    // Validate required fields
    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'transactions array is required' 
        },
        { status: 400 }
      );
    }
    
    if (!bankAccountName || typeof bankAccountName !== 'string' || bankAccountName.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'bankAccountName is required and must be a non-empty string' 
        },
        { status: 400 }
      );
    }
    
    if (transactions.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'transactions array cannot be empty' 
        },
        { status: 400 }
      );
    }
    
    // Validate transaction structure
    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i];
      if (!txn.date || typeof txn.debit === 'undefined' || typeof txn.credit === 'undefined') {
        return NextResponse.json(
          { 
            success: false, 
            error: `Transaction at index ${i} is missing required fields (date, debit, or credit)` 
          },
          { status: 400 }
        );
      }
    }
    
    // Generate journal template rows
    const rows = generateJournalTemplateRows(transactions, bankAccountName.trim());
    
    if (rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid transactions found. Please ensure transactions have either debit or credit amounts.' 
        },
        { status: 400 }
      );
    }
    
    // Generate Excel file (returns Buffer for server-side)
    const excelBuffer = convertBankStatementToJournalTemplate(
      transactions as BankTransaction[],
      bankAccountName.trim()
    );
    
    if (!excelBuffer || !Buffer.isBuffer(excelBuffer)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate Excel file' 
        },
        { status: 500 }
      );
    }
    
    // Determine file name
    const finalFileName = fileName 
      ? `${fileName}.xlsx`
      : `bank-statement-journal-template_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${finalFileName}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('Journal template generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to generate journal template: ${error.message || 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}
