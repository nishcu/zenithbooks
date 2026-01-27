import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase/firestore';
import { Form16ComputationEngine } from '@/lib/form-16-computation';
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
  // Preferred: send employee snapshots (API route doesn't access Firestore)
  employees?: Array<Partial<EmployeeMaster> & { id: string; name: string; pan: string }>;
  // Legacy: employeeIds (not supported here due to Firestore rules on server)
  employeeIds?: string[];
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
    const { employees, employeeIds, financialYear, employerName, employerTan, employerPan, signatoryName, signatoryDesignation, signatoryPlace } = body;

    // IMPORTANT: No Firestore access here (server-side without auth).
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      // If legacy IDs were sent, guide the client to send employee snapshots instead.
      if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
        return NextResponse.json(
          { success: false, errors: ['Client must send employees[] (snapshots). employeeIds-only is not supported in this API route.'] },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, errors: ['At least one employee is required'] },
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

    // Process each employee snapshot
    for (const emp of employees) {
      const employeeId = emp.id;
      try {
        if (!emp?.name || !emp?.pan) {
          errors.push({
            employeeId,
            errors: ['Missing required fields (name or PAN)']
          });
          failed++;
          continue;
        }

        // Get default values for computation
        const defaultValues = Form16ComputationEngine.getDefaultValues(financialYear);

        const doj = (emp as any).doj ? new Date((emp as any).doj) : new Date(`${financialYear.split('-')[0]}-04-01`);
        const safeDoj = isNaN(doj.getTime()) ? new Date(`${financialYear.split('-')[0]}-04-01`) : doj;

        const employee: EmployeeMaster = {
          id: employeeId,
          empId: (emp as any).empId || employeeId,
          name: emp.name as any,
          pan: emp.pan as any,
          mobile: (emp as any).mobile || undefined,
          aadhaar: (emp as any).aadhaar || undefined,
          address: (emp as any).address || "",
          designation: (emp as any).designation || "Employee",
          doj: safeDoj,
          employmentType: (emp as any).employmentType || "permanent",
          residentialStatus: (emp as any).residentialStatus || "resident",
          taxRegime: (emp as any).taxRegime || "NEW",
          employerId: userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

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
          travelConcession: 0,
          gratuityExempt: 0,
          commutedPensionExempt: 0,
          leaveEncashmentExempt: 0,
          hraExempt: 0,
          ltaExempt: 0,
          childrenEduAllowance: 0,
          hostelAllowance: 0,
          transportAllowance: 0,
          medicalAllowance: 0,
          uniformAllowance: 0,
          helperAllowance: 0,
          otherExemptions: {},
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

        const form16Document: Form16Document = {
          id: `tmp_${employeeId}_${Date.now()}`,
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

        documents.push(form16Document);
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

    const response: BulkForm16Response = {
      success: true,
      data: {
        documents,
        summary: {
          total: employees.length,
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
