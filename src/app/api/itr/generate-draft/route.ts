/**
 * ITR Draft Generation API
 * Generates ITR draft by processing Form 16, AIS, and 26AS documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getITRApplication, getApplicationDocuments, createITRDraft, updateITRApplicationStatus, getITRDraft } from '@/lib/itr/firestore';
import { extractForm16DataWithOpenAI } from '@/lib/itr/ocr-extractor';
import { loadAndParseAIS } from '@/lib/itr/ais-parser';
import { parseForm26ASWithOpenAI } from '@/lib/itr/form26as-parser';
import { generateITRDraft } from '@/lib/itr/draft-generator';
import type { ITRStatus } from '@/lib/itr/types';

// Runtime config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No user ID provided' },
        { status: 401 }
      );
    }

    const { applicationId } = await request.json();
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Get application
    const application = await getITRApplication(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify assignment
    if (application.assignedTo !== userId) {
      return NextResponse.json(
        { error: 'Access denied. This application is not assigned to you.' },
        { status: 403 }
      );
    }

    // Get all documents
    const documents = await getApplicationDocuments(applicationId);

    // Find required documents
    const form16Doc = documents.find(doc => doc.type === 'FORM_16');
    const aisPDFDoc = documents.find(doc => doc.type === 'AIS_PDF');
    const aisJSONDoc = documents.find(doc => doc.type === 'AIS_JSON');
    const form26ASDoc = documents.find(doc => doc.type === 'FORM_26AS');

    // Form 16 is required only for ITR-1 and ITR-2
    const isForm16Required = application.formType === 'ITR-1' || application.formType === 'ITR-2';
    
    if (isForm16Required && !form16Doc) {
      return NextResponse.json(
        { error: 'Form 16 document not found. Please upload Form 16 first. Form 16 is required for ITR-1 and ITR-2.' },
        { status: 400 }
      );
    }

    // Update status to DRAFT_IN_PROGRESS
    await updateITRApplicationStatus(application.id, 'DRAFT_IN_PROGRESS' as ITRStatus);

    // Extract data from Form 16 (if available)
    let form16Data;
    if (form16Doc) {
      try {
        form16Data = await extractForm16DataWithOpenAI(form16Doc.fileUrl);
        console.log('Form 16 extraction successful:', form16Data);
      } catch (error: any) {
        console.error('Form 16 OCR error:', error);
        // Continue with partial data
        form16Data = {
          extractedAt: new Date(),
        };
      }
    } else {
      // Form 16 not provided (allowed for ITR-3 and ITR-4)
      form16Data = undefined;
      console.log('Form 16 not provided - proceeding without Form 16 data (allowed for ITR-3/ITR-4)');
    }

    // Parse AIS JSON if available
    let aisData;
    if (aisJSONDoc) {
      try {
        aisData = await loadAndParseAIS(aisJSONDoc.fileUrl);
        console.log('AIS parsing successful:', aisData);
      } catch (error: any) {
        console.error('AIS parsing error:', error);
        // Continue without AIS data
      }
    }

    // Parse Form 26AS if available
    let form26ASData;
    if (form26ASDoc) {
      try {
        form26ASData = await parseForm26ASWithOpenAI(form26ASDoc.fileUrl);
        console.log('Form 26AS parsing successful:', form26ASData);
      } catch (error: any) {
        console.error('Form 26AS parsing error:', error);
        // Continue without 26AS data
      }
    }

    // Generate draft
    const { draft, mismatches, scrutinyRisk } = generateITRDraft({
      applicationId: application.id,
      financialYear: application.financialYear,
      form16Data: form16Data ? {
        name: form16Data.name,
        pan: form16Data.pan,
        grossSalary: form16Data.grossSalary,
        tdsAmount: form16Data.tdsAmount,
        allowances: form16Data.allowances,
        deductions: form16Data.deductions,
      } : undefined,
      aisData,
      form26ASData,
    });

    // Save draft to Firestore
    const draftId = await createITRDraft({
      ...draft,
      mismatches,
    });

    // Update application with OCR data and draft info
    const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const appRef = doc(db, 'itrApplications', application.id);
    await updateDoc(appRef, {
      name: form16Data?.name || application.name,
      pan: form16Data?.pan || application.pan,
      employerTAN: form16Data?.employerTAN || application.employerTAN,
      ocrData: {
        name: form16Data?.name,
        pan: form16Data?.pan,
        employerTAN: form16Data?.employerTAN,
        grossSalary: form16Data?.grossSalary,
        tdsAmount: form16Data?.tdsAmount,
        extractedAt: new Date(),
      },
      'metadata.scrutinyRisk': scrutinyRisk,
      'draft.id': draftId,
      draftReadyAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update status to DRAFT_READY
    await updateITRApplicationStatus(application.id, 'DRAFT_READY' as ITRStatus);

    // Send notification for user (Phase 6)
    try {
      const { sendITRNotification } = await import('@/lib/itr/notifications');
      await sendITRNotification({
        userId: application.userId,
        applicationId: application.id,
        type: 'DRAFT_READY',
        financialYear: application.financialYear,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      draftId,
      draft: {
        ...draft,
        id: draftId,
      },
      mismatches,
      scrutinyRisk,
      message: 'ITR draft generated successfully',
    });
  } catch (error: any) {
    console.error('Draft generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate ITR draft' },
      { status: 500 }
    );
  }
}

