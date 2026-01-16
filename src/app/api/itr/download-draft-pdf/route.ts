/**
 * ITR Draft PDF Download API
 * Generates and downloads ITR draft as PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { getITRApplication, getITRDraft } from '@/lib/itr/firestore';

// Runtime config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No user ID provided' },
        { status: 401 }
      );
    }

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Get application and draft
    const [application, draft] = await Promise.all([
      getITRApplication(applicationId),
      getITRDraft(applicationId),
    ]);

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      );
    }

    // For now, return JSON. PDF generation can be added later
    // TODO: Generate proper PDF using jsPDF (similar to Form16PDFGenerator)
    const draftSummary = {
      applicationId: application.id,
      financialYear: application.financialYear,
      name: application.name,
      pan: application.pan,
      income: draft.income,
      deductions: draft.deductions,
      tax: draft.tax,
      mismatches: draft.mismatches,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(draftSummary, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ITR-Draft-${application.financialYear}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Draft download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download draft' },
      { status: 500 }
    );
  }
}

