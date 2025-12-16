import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Form16PDFGenerator } from '@/lib/form-16-pdf';
import { Form16Document } from '@/lib/form-16-models';
import JSZip from 'jszip';

interface BulkDownloadRequest {
  employeeIds: string[];
  financialYear: string;
  employerName: string;
  employerTan: string;
  employerPan?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatoryPlace?: string;
}

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get user ID from header
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized - User ID required'] },
        { status: 401 }
      );
    }

    // Parse request body
    const body: BulkDownloadRequest = await request.json();
    const { employeeIds, financialYear, employerName, employerTan, employerPan, signatoryName, signatoryDesignation, signatoryPlace } = body;

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

    // Get employer data
    const employerDoc = await getDoc(doc(db, 'users', userId));
    const employerData = employerDoc.data();

    // Calculate dates
    const fyStartDate = new Date(`${financialYear.split('-')[0]}-04-01`);
    const fyEndDate = new Date(`${financialYear.split('-')[1]}-03-31`);
    
    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    const fyStart = formatDate(fyStartDate);
    const fyEnd = formatDate(fyEndDate);
    const today = formatDate(new Date());

    // Signatory details
    const finalSignatoryName = signatoryName || employerData?.name || employerData?.companyName || 'Authorized Signatory';
    const finalSignatoryDesignation = signatoryDesignation || 'Authorized Signatory';
    const finalSignatoryPlace = signatoryPlace || employerData?.address?.split(',')[0] || '';

    const zip = new JSZip();
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each employee
    for (const employeeId of employeeIds) {
      try {
        // Fetch employee data
        const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
        
        if (!employeeDoc.exists()) {
          errors.push(`Employee ${employeeId}: Not found`);
          failed++;
          continue;
        }

        const employee = { id: employeeDoc.id, ...employeeDoc.data() } as any;

        // Verify access
        if (employee.employerId !== userId) {
          errors.push(`Employee ${employeeId}: Access denied`);
          failed++;
          continue;
        }

        // Check if Form 16 document already exists
        const form16Query = query(
          collection(db, 'form16Documents'),
          where('employeeId', '==', employeeId),
          where('financialYear', '==', financialYear)
        );
        const existingDocs = await getDocs(form16Query);

        let form16Doc: Form16Document;

        if (!existingDocs.empty) {
          // Use existing document
          const existingDoc = existingDocs.docs[0];
          form16Doc = { id: existingDoc.id, ...existingDoc.data() } as Form16Document;
        } else {
          // Create new document (simplified - you may want to use the full generation logic)
          // For now, we'll generate a basic document
          const dojDate = employee.doj instanceof Date ? employee.doj : new Date(employee.doj);
          const periodFrom = dojDate > fyStartDate ? dojDate : fyStartDate;
          const periodTo = new Date() < fyEndDate ? new Date() : fyEndDate;
          const periodFromStr = formatDate(periodFrom);
          const periodToStr = formatDate(periodTo);

          // This is a simplified version - in production, you should use the full generation logic
          // from the generate route
          form16Doc = {
            id: '',
            employeeId,
            financialYear,
            assessmentYear: `${parseInt(financialYear.split('-')[1]) + 1}-${parseInt(financialYear.split('-')[1]) + 2}`,
            employerName: employerName,
            employerTan: employerTan,
            employerPan: employerPan || '',
            employerAddress: employerData?.address || '',
            partA: {
              certificateNumber: `CERT-${employeeId}-${financialYear}`,
              lastUpdatedOn: today,
              validFrom: fyStart,
              validTill: fyEnd,
              employeeName: employee.name,
              employeePan: employee.pan,
              employeeAddress: employee.address || '',
              employeeDesignation: employee.designation || 'Employee',
              employeeAadhaar: employee.aadhaar,
              periodFrom: periodFromStr,
              periodTo: periodToStr,
              totalTdsDeducted: 0,
              tdsDetails: {
                employeeId,
                financialYear,
                totalTdsDeducted: 0,
                relief89: 0,
                quarterlyBreakup: {
                  q1: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
                  q2: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
                  q3: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
                  q4: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' }
                },
                createdAt: new Date() as any,
                updatedAt: new Date() as any
              }
            },
            partB: {
              employeeId,
              financialYear,
              salarySection17_1: 0,
              perquisitesSection17_2: 0,
              profitsSection17_3: 0,
              grossSalary: 0,
              exemptionsSection10: 0,
              netSalary: 0,
              deductionsSection16: 0,
              incomeFromSalary: 0,
              otherIncome: 0,
              grossTotalIncome: 0,
              deductionsChapterVIA: 0,
              totalTaxableIncome: 0,
              taxOnIncome: 0,
              surcharge: 0,
              healthEducationCess: 0,
              totalTaxLiability: 0,
              rebate87A: 0,
              taxAfterRebate: 0,
              tdsDeducted: 0,
              taxDeposited: 0,
              relief89: 0,
              taxPayable: 0,
              taxRegime: employee.taxRegime || 'NEW',
              computedAt: new Date() as any
            },
            signatory: {
              name: finalSignatoryName,
              designation: finalSignatoryDesignation,
              place: finalSignatoryPlace,
              date: today
            },
            generatedBy: userId,
            generatedAt: new Date() as any,
            version: 1,
            status: 'generated',
            accessLogs: []
          };
        }

        // Generate PDF
        const pdfBlob = await Form16PDFGenerator.generateForm16PDF(form16Doc);
        
        // Add to ZIP with employee name in filename
        const fileName = `Form16_${employee.name.replace(/[^a-zA-Z0-9]/g, '_')}_${employee.pan}_${financialYear}.pdf`;
        zip.file(fileName, await pdfBlob.arrayBuffer());
        
        processed++;
      } catch (error: any) {
        console.error(`Error processing employee ${employeeId}:`, error);
        errors.push(`Employee ${employeeId}: ${error.message || 'Processing error'}`);
        failed++;
      }
    }

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipBuffer = await zipBlob.arrayBuffer();

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Form16_Bulk_${financialYear}_${employeeIds.length}_employees.zip"`,
        'Content-Length': zipBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}

