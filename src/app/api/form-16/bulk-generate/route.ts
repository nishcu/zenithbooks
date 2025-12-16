import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { Form16ComputationEngine } from '@/lib/form-16-computation';
import { Form16PDFGenerator } from '@/lib/form-16-pdf';
import {
  EmployeeMaster,
  SalaryStructure,
  ExemptionsSection10,
  Section16Deductions,
  ChapterVIA_Deductions,
  OtherIncome,
  TDSDetails,
  Form16Document
} from '@/lib/form-16-models';

interface BulkForm16Request {
  employeeIds: string[];
  financialYear: string;
  employerName: string;
  employerTan: string;
  employerPan?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatoryPlace?: string;
}

interface BulkForm16Response {
  success: boolean;
  data?: {
    documents: Form16Document[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      errors: { employeeId: string; errors: string[] }[];
    };
  };
  errors?: string[];
}

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get user ID from header (following existing API pattern)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized - User ID required'] },
        { status: 401 }
      );
    }

    // Parse request body
    const body: BulkForm16Request = await request.json();
    const { employeeIds, financialYear, employerName, employerTan, employerPan, signatoryName, signatoryDesignation, signatoryPlace } = body;

    // Get employer data for defaults
    const employerDoc = await getDoc(doc(db, 'users', userId));
    const employerData = employerDoc.data();

    // Signatory details
    const finalSignatoryName = signatoryName || employerData?.name || employerData?.companyName || 'Authorized Signatory';
    const finalSignatoryDesignation = signatoryDesignation || 'Authorized Signatory';
    const finalSignatoryPlace = signatoryPlace || employerData?.address?.split(',')[0] || '';

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { success: false, errors: ['At least one employee ID is required'] },
        { status: 400 }
      );
    }

    if (!financialYear || !employerName || !employerTan) {
      return NextResponse.json(
        { success: false, errors: ['Financial year, employer name, and TAN are required'] },
        { status: 400 }
      );
    }

    const documents: Form16Document[] = [];
    const errors: { employeeId: string; errors: string[] }[] = [];
    let successful = 0;
    let failed = 0;

    // Process each employee
    for (const employeeId of employeeIds) {
      try {
        // Fetch employee data
        const employeeQuery = query(
          collection(db, 'employees'),
          where('id', '==', employeeId),
          where('employerId', '==', userId)
        );
        const employeeSnapshot = await getDocs(employeeQuery);

        if (employeeSnapshot.empty) {
          errors.push({
            employeeId,
            errors: ['Employee not found or access denied']
          });
          failed++;
          continue;
        }

        const employeeDoc = employeeSnapshot.docs[0];
        const employee = { id: employeeDoc.id, ...employeeDoc.data() } as EmployeeMaster;

        // Get default values for computation
        const defaultValues = Form16ComputationEngine.getDefaultValues(financialYear);

        // Create default data structures
        const salaryData: SalaryStructure = {
          employeeId,
          financialYear,
          monthly: {
            basic: 0,
            hra: 0,
            da: 0,
            specialAllowance: 0,
            lta: 0,
            bonus: 0,
            incentives: 0,
            arrears: 0,
            perquisites: 0,
            employerPf: 0
          },
          annual: {
            basic: 0,
            hra: 0,
            da: 0,
            specialAllowance: 0,
            lta: 0,
            bonus: 0,
            incentives: 0,
            arrears: 0,
            perquisites: 0,
            employerPf: 0
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        const exemptionsData: ExemptionsSection10 = {
          employeeId,
          financialYear,
          hraExempt: 0,
          ltaExempt: 0,
          childrenEduAllowance: 0,
          hostelAllowance: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        const section16Data: Section16Deductions = {
          employeeId,
          financialYear,
          standardDeduction: 50000,
          professionalTax: 0,
          entertainmentAllowance: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        const chapterVIAData: ChapterVIA_Deductions = {
          employeeId,
          financialYear,
          section80C: 0,
          section80CCD1B: 0,
          section80D: 0,
          section80TTA: 0,
          section80G: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        const otherIncomeData: OtherIncome = {
          employeeId,
          financialYear,
          savingsInterest: 0,
          fdInterest: 0,
          otherIncome: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        const tdsData: TDSDetails = {
          employeeId,
          financialYear,
          totalTdsDeducted: 0,
          relief89: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Validate and compute
        const validation = Form16ComputationEngine.validateComputationData(
          employee,
          salaryData,
          exemptionsData,
          section16Data,
          chapterVIAData,
          otherIncomeData,
          tdsData
        );

        if (!validation.isValid) {
          errors.push({
            employeeId,
            errors: validation.errors
          });
          failed++;
          continue;
        }

        const computation = Form16ComputationEngine.calculateForm16PartB(
          employee,
          salaryData,
          exemptionsData,
          section16Data,
          chapterVIAData,
          otherIncomeData,
          tdsData
        );

        // Create Form 16 document
        const assessmentYear = `${parseInt(financialYear.split('-')[1]) + 1}-${parseInt(financialYear.split('-')[1]) + 2}`;

        const form16Document: Omit<Form16Document, 'id'> = {
          employeeId,
          financialYear,
          employerName,
          employerTan,
          employerPan: employerPan || '',
          assessmentYear,
          partA: {
            employeeName: employee.name,
            employeePan: employee.pan,
            employeeDesignation: employee.designation,
            totalTdsDeducted: tdsData.totalTdsDeducted,
            tdsDetails: tdsData
          },
          partB: computation,
          generatedBy: userId,
          generatedAt: Timestamp.now(),
          version: 1,
          status: 'generated',
          accessLogs: []
        };

        // Save to database
        const docRef = await addDoc(collection(db, 'form16Documents'), form16Document);
        const savedDocument: Form16Document = { id: docRef.id, ...form16Document };

        documents.push(savedDocument);
        successful++;

      } catch (error) {
        console.error(`Error processing employee ${employeeId}:`, error);
        errors.push({
          employeeId,
          errors: ['Internal processing error']
        });
        failed++;
      }
    }

    // Generate bulk PDFs (for potential download)
    const pdfs = await Form16PDFGenerator.generateBulkForm16PDFs(documents);

    const response: BulkForm16Response = {
      success: true,
      data: {
        documents,
        summary: {
          total: employeeIds.length,
          successful,
          failed,
          errors
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Bulk Form 16 generation error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}
