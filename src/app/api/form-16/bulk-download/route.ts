import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { Form16PDFGenerator } from '@/lib/form-16-pdf';
import { Form16ComputationEngine } from '@/lib/form-16-computation';
import { 
  Form16Document, 
  EmployeeMaster, 
  SalaryStructure, 
  ExemptionsSection10, 
  Section16Deductions, 
  ChapterVIA_Deductions, 
  OtherIncome, 
  TDSDetails 
} from '@/lib/form-16-models';
import JSZip from 'jszip';
import { Buffer } from 'buffer';

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
        // Fetch employee data - employeeId is the Firestore document ID
        const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
        
        if (!employeeDoc.exists()) {
          console.error(`Employee document not found: ${employeeId}`);
          errors.push(`Employee ${employeeId}: Not found`);
          failed++;
          continue;
        }

        const employeeData = employeeDoc.data();
        const employee = { id: employeeDoc.id, ...employeeData } as any;

        // Verify access
        if (!employeeData || employee.employerId !== userId) {
          console.error(`Employee access denied: ${employeeId}, employerId: ${employee.employerId}, userId: ${userId}`);
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
          // Use existing document, but ensure partA is properly initialized
          const existingDoc = existingDocs.docs[0];
          const existingData = existingDoc.data();
          
          // Ensure partA exists and is properly structured (handle old documents without partA)
          if (!existingData.partA || typeof existingData.partA !== 'object' || !existingData.partA.employeeName) {
            // If partA doesn't exist or is incomplete (old documents), create it with employee data
            const fyStart = `01/04/${financialYear.split('-')[0]}`;
            const fyEnd = `31/03/${financialYear.split('-')[1]}`;
            
            // Handle DOJ date for period calculation
            let dojDate: Date;
            if (employee.doj instanceof Date) {
              dojDate = employee.doj;
            } else if (employee.doj && typeof employee.doj === 'object' && 'toDate' in employee.doj) {
              dojDate = (employee.doj as any).toDate();
            } else if (employee.doj) {
              dojDate = new Date(employee.doj);
            } else {
              dojDate = new Date(`${financialYear.split('-')[0]}-04-01`);
            }
            
            if (isNaN(dojDate.getTime())) {
              dojDate = new Date(`${financialYear.split('-')[0]}-04-01`);
            }
            
            const fyStartDate = new Date(`${financialYear.split('-')[0]}-04-01`);
            const periodFrom = dojDate > fyStartDate ? dojDate : fyStartDate;
            const periodTo = new Date() < new Date(`${financialYear.split('-')[1]}-03-31`) ? new Date() : new Date(`${financialYear.split('-')[1]}-03-31`);
            
            const formatDate = (date: Date) => {
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${day}/${month}/${year}`;
            };
            
            existingData.partA = {
              certificateNumber: existingData.partA?.certificateNumber || '',
              lastUpdatedOn: existingData.partA?.lastUpdatedOn || '',
              validFrom: existingData.partA?.validFrom || '',
              validTill: existingData.partA?.validTill || '',
              employeeName: employee.name,
              employeePan: employee.pan,
              employeeAddress: employee.address || '',
              employeeDesignation: employee.designation || 'Employee',
              employeeAadhaar: employee.aadhaar || '',
              periodFrom: formatDate(periodFrom),
              periodTo: formatDate(periodTo),
              totalTdsDeducted: existingData.partB?.tdsDetails?.totalTdsDeducted || existingData.partB?.totalTdsDeducted || 0,
              tdsDetails: existingData.partB?.tdsDetails || existingData.tdsDetails || {
                quarterlyBreakup: {
                  q1: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
                  q2: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
                  q3: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
                  q4: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' }
                }
              }
            };
          }
          
          form16Doc = { id: existingDoc.id, ...existingData } as Form16Document;
        } else {
          // Generate Form 16 using full computation logic (like bulk-generate does)
          // Fetch or create data structures
          const salaryDoc = await getDoc(doc(db, 'salaryStructures', `${employeeId}_${financialYear}`));
          const salaryData: SalaryStructure = salaryDoc.exists() 
            ? { id: salaryDoc.id, ...salaryDoc.data() } as SalaryStructure
            : {
                employeeId,
                financialYear,
                monthly: { basic: 0, hra: 0, da: 0, specialAllowance: 0, lta: 0, bonus: 0, incentives: 0, arrears: 0, perquisites: 0, employerPf: 0 },
                annual: { basic: 0, hra: 0, da: 0, specialAllowance: 0, lta: 0, bonus: 0, incentives: 0, arrears: 0, perquisites: 0, employerPf: 0 },
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              };

          const exemptionsDoc = await getDoc(doc(db, 'exemptionsSection10', `${employeeId}_${financialYear}`));
          const exemptionsData: ExemptionsSection10 = exemptionsDoc.exists()
            ? { id: exemptionsDoc.id, ...exemptionsDoc.data() } as ExemptionsSection10
            : {
                employeeId,
                financialYear,
                hraExempt: 0,
                ltaExempt: 0,
                childrenEduAllowance: 0,
                hostelAllowance: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              };

          const section16Doc = await getDoc(doc(db, 'section16Deductions', `${employeeId}_${financialYear}`));
          const section16Data: Section16Deductions = section16Doc.exists()
            ? { id: section16Doc.id, ...section16Doc.data() } as Section16Deductions
            : {
                employeeId,
                financialYear,
                standardDeduction: 50000,
                professionalTax: 0,
                entertainmentAllowance: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              };

          const chapterVIADoc = await getDoc(doc(db, 'chapterVIA_Deductions', `${employeeId}_${financialYear}`));
          const chapterVIAData: ChapterVIA_Deductions = chapterVIADoc.exists()
            ? { id: chapterVIADoc.id, ...chapterVIADoc.data() } as ChapterVIA_Deductions
            : {
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

          const otherIncomeDoc = await getDoc(doc(db, 'otherIncome', `${employeeId}_${financialYear}`));
          const otherIncomeData: OtherIncome = otherIncomeDoc.exists()
            ? { id: otherIncomeDoc.id, ...otherIncomeDoc.data() } as OtherIncome
            : {
                employeeId,
                financialYear,
                savingsInterest: 0,
                fdInterest: 0,
                otherIncome: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              };

          const tdsDoc = await getDoc(doc(db, 'tdsDetails', `${employeeId}_${financialYear}`));
          const tdsData: TDSDetails = tdsDoc.exists()
            ? { id: tdsDoc.id, ...tdsDoc.data() } as TDSDetails
            : {
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
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              };

          // Compute Form 16
          const computation = Form16ComputationEngine.calculateForm16PartB(
            employee as EmployeeMaster,
            salaryData,
            exemptionsData,
            section16Data,
            chapterVIAData,
            otherIncomeData,
            tdsData
          );

          // Handle DOJ date
          let dojDate: Date;
          if (employee.doj instanceof Date) {
            dojDate = employee.doj;
          } else if (employee.doj && typeof employee.doj === 'object' && 'toDate' in employee.doj) {
            dojDate = (employee.doj as any).toDate();
          } else if (employee.doj) {
            dojDate = new Date(employee.doj);
          } else {
            dojDate = fyStartDate;
          }
          
          if (isNaN(dojDate.getTime())) {
            dojDate = fyStartDate;
          }
          
          const periodFrom = dojDate > fyStartDate ? dojDate : fyStartDate;
          const periodTo = new Date() < fyEndDate ? new Date() : fyEndDate;
          const periodFromStr = formatDate(periodFrom);
          const periodToStr = formatDate(periodTo);
          const safePeriodFrom = periodFromStr || fyStart;
          const safePeriodTo = periodToStr || fyEnd;

          // Create Form 16 document
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
              certificateNumber: '',
              lastUpdatedOn: '',
              validFrom: '',
              validTill: '',
              employeeName: employee.name,
              employeePan: employee.pan,
              employeeAddress: employee.address || '',
              employeeDesignation: employee.designation || 'Employee',
              employeeAadhaar: employee.aadhaar,
              periodFrom: safePeriodFrom,
              periodTo: safePeriodTo,
              totalTdsDeducted: tdsData.totalTdsDeducted,
              tdsDetails: tdsData
            },
            partB: computation,
            signatory: {
              name: finalSignatoryName,
              designation: finalSignatoryDesignation,
              place: finalSignatoryPlace,
              date: today
            },
            generatedBy: userId,
            generatedAt: Timestamp.now(),
            version: 1,
            status: 'generated',
            accessLogs: []
          };
        }

        // Generate PDF
        try {
          const pdfData = await Form16PDFGenerator.generateForm16PDF(form16Doc);
          
          // Add to ZIP with employee name in filename
          const fileName = `Form16_${employee.name.replace(/[^a-zA-Z0-9]/g, '_')}_${employee.pan}_${financialYear}.pdf`;
          
          // Handle both Buffer (server-side) and Blob (browser)
          let arrayBuffer: ArrayBuffer;
          if (Buffer.isBuffer(pdfData)) {
            arrayBuffer = pdfData.buffer.slice(pdfData.byteOffset, pdfData.byteOffset + pdfData.byteLength);
          } else {
            arrayBuffer = await (pdfData as Blob).arrayBuffer();
          }
          zip.file(fileName, arrayBuffer);
          
          processed++;
        } catch (pdfError) {
          console.error(`Error generating PDF for employee ${employeeId}:`, pdfError);
          errors.push(`Employee ${employeeId}: PDF generation failed - ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
          failed++;
          continue;
        }
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

