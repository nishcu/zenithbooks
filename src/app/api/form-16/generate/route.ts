import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase/firestore';
import { Buffer } from 'buffer';
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
  Form16Document,
  Form16Request,
  Form16Response
} from '@/lib/form-16-models';

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
    const body: Form16Request & { 
      signatoryName?: string; 
      signatoryDesignation?: string; 
      signatoryPlace?: string; 
      taxRegime?: 'OLD' | 'NEW';
      employee?: Partial<EmployeeMaster> & {
        id?: string;
        name?: string;
        pan?: string;
        aadhaar?: string;
        address?: string;
        designation?: string;
        doj?: string | Date;
        employmentType?: EmployeeMaster["employmentType"];
        residentialStatus?: EmployeeMaster["residentialStatus"];
        taxRegime?: EmployeeMaster["taxRegime"];
        mobile?: string;
      };
      includePartA?: boolean;
      partAData?: {
        certificateNumber: string;
        lastUpdatedOn: string;
        validFrom: string;
        validTill: string;
        quarterlyTDS: {
          q1: { amount: number; section: string; dateOfDeduction: string; dateOfDeposit: string; challanCIN: string };
          q2: { amount: number; section: string; dateOfDeduction: string; dateOfDeposit: string; challanCIN: string };
          q3: { amount: number; section: string; dateOfDeduction: string; dateOfDeposit: string; challanCIN: string };
          q4: { amount: number; section: string; dateOfDeduction: string; dateOfDeposit: string; challanCIN: string };
        };
      };
    } = await request.json();
    const { 
      employeeId, 
      financialYear, 
      overrideData, 
      signatoryName, 
      signatoryDesignation, 
      signatoryPlace, 
      employerName, 
      employerTan, 
      employerPan, 
      employerAddress, 
      taxRegime: overrideTaxRegime,
      employee: employeeFromClient,
      includePartA = false,
      partAData
    } = body;

    if (!employeeId || !financialYear) {
      return NextResponse.json(
        { success: false, errors: ['Employee ID and Financial Year are required'] },
        { status: 400 }
      );
    }

    // Parse FY like "2025-26" or "2025-2026" into numeric years.
    const [fyStartRaw, fyEndRaw] = (financialYear || "").split("-");
    const fyStartYear = Number(fyStartRaw);
    let fyEndYear = Number(fyEndRaw);
    if (!Number.isFinite(fyStartYear) || !Number.isFinite(fyEndYear)) {
      return NextResponse.json(
        { success: false, errors: ['Invalid Financial Year format. Expected like "2025-26"'] },
        { status: 400 }
      );
    }
    // If end year is 2-digit (e.g. 26), resolve it to the correct century (e.g. 2026).
    if (fyEndRaw?.length === 2) {
      const century = Math.floor(fyStartYear / 100) * 100;
      fyEndYear = century + fyEndYear;
      // Handle FY spanning centuries (e.g. 1999-00)
      if (fyEndYear < fyStartYear) fyEndYear += 100;
    }

    // IMPORTANT:
    // This API route runs server-side without Firebase Auth context, so Firestore rules
    // will deny reads/writes (causing 500 permission-denied). Therefore, we avoid any
    // Firestore access here and rely on the caller to provide employee/employer inputs.
    if (!employeeFromClient?.name || !employeeFromClient?.pan) {
      return NextResponse.json(
        { success: false, errors: ['Employee details (name, PAN) must be provided'] },
        { status: 400 }
      );
    }

    const doj = employeeFromClient?.doj ? new Date(employeeFromClient.doj as any) : new Date(`${fyStartYear}-04-01`);
    const safeDoj = isNaN(doj.getTime()) ? new Date(`${fyStartYear}-04-01`) : doj;

    const employee: EmployeeMaster = {
      id: employeeId,
      empId: employeeFromClient.empId || employeeId,
      name: employeeFromClient.name,
      pan: employeeFromClient.pan,
      mobile: (employeeFromClient as any).mobile || undefined,
      aadhaar: employeeFromClient.aadhaar || undefined,
      address: employeeFromClient.address || "",
      designation: employeeFromClient.designation || "Employee",
      doj: safeDoj,
      employmentType: employeeFromClient.employmentType || "permanent",
      residentialStatus: employeeFromClient.residentialStatus || "resident",
      taxRegime: overrideTaxRegime || (employeeFromClient.taxRegime as any) || "NEW",
      employerId: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Build salary structure from override data (no Firestore reads)
    let salaryData: SalaryStructure;
    const overrideSalary: any = overrideData?.salaryStructure || {};
    const isFlatFormat = overrideSalary.basic !== undefined && !overrideSalary.monthly;
    const annualValue = (val: number) => val || 0;
    const monthlyValue = (val: number) => (val || 0) / 12;
    salaryData = isFlatFormat
      ? {
          employeeId,
          financialYear,
          monthly: {
            basic: monthlyValue(overrideSalary.basic as number),
            hra: monthlyValue(overrideSalary.hra as number),
            da: monthlyValue(overrideSalary.da as number),
            specialAllowance: monthlyValue(overrideSalary.specialAllowance as number),
            lta: monthlyValue(overrideSalary.lta as number),
            bonus: monthlyValue(overrideSalary.bonus as number),
            incentives: monthlyValue(overrideSalary.incentives as number),
            arrears: monthlyValue(overrideSalary.arrears as number),
            perquisites: monthlyValue(overrideSalary.perquisites as number),
            employerPf: monthlyValue(overrideSalary.employerPf as number)
          },
          annual: {
            basic: annualValue(overrideSalary.basic as number),
            hra: annualValue(overrideSalary.hra as number),
            da: annualValue(overrideSalary.da as number),
            specialAllowance: annualValue(overrideSalary.specialAllowance as number),
            lta: annualValue(overrideSalary.lta as number),
            bonus: annualValue(overrideSalary.bonus as number),
            incentives: annualValue(overrideSalary.incentives as number),
            arrears: annualValue(overrideSalary.arrears as number),
            perquisites: annualValue(overrideSalary.perquisites as number),
            employerPf: annualValue(overrideSalary.employerPf as number)
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }
      : {
          employeeId,
          financialYear,
          monthly: {
            basic: overrideSalary.monthly?.basic || 0,
            hra: overrideSalary.monthly?.hra || 0,
            da: overrideSalary.monthly?.da || 0,
            specialAllowance: overrideSalary.monthly?.specialAllowance || 0,
            lta: overrideSalary.monthly?.lta || 0,
            bonus: overrideSalary.monthly?.bonus || 0,
            incentives: overrideSalary.monthly?.incentives || 0,
            arrears: overrideSalary.monthly?.arrears || 0,
            perquisites: overrideSalary.monthly?.perquisites || 0,
            employerPf: overrideSalary.monthly?.employerPf || 0
          },
          annual: {
            basic: overrideSalary.annual?.basic || 0,
            hra: overrideSalary.annual?.hra || 0,
            da: overrideSalary.annual?.da || 0,
            specialAllowance: overrideSalary.annual?.specialAllowance || 0,
            lta: overrideSalary.annual?.lta || 0,
            bonus: overrideSalary.annual?.bonus || 0,
            incentives: overrideSalary.annual?.incentives || 0,
            arrears: overrideSalary.annual?.arrears || 0,
            perquisites: overrideSalary.annual?.perquisites || 0,
            employerPf: overrideSalary.annual?.employerPf || 0
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

    // Exemptions (Section 10)
    let exemptionsData: ExemptionsSection10;
    const defaultValues = Form16ComputationEngine.getDefaultValues(financialYear);
    exemptionsData = {
      employeeId,
      financialYear,
      travelConcession: 0,
      gratuityExempt: 0,
      commutedPensionExempt: 0,
      leaveEncashmentExempt: 0,
      hraExempt: 0,
      childrenEduAllowance: 0,
      hostelAllowance: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
      ltaExempt: 0,
      uniformAllowance: 0,
      helperAllowance: 0,
      otherExemptions: {},
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...(defaultValues.exemptions as any),
      ...overrideData?.exemptions
    } as any;

    // Section 16 deductions
    let section16Data: Section16Deductions;
    const standardDeduction = Form16ComputationEngine.getStandardDeduction(financialYear, employee.taxRegime);
    section16Data = {
      employeeId,
      financialYear,
      standardDeduction,
      professionalTax: 0,
      entertainmentAllowance: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Chapter VI-A deductions
    let chapterVIAData: ChapterVIA_Deductions;
    chapterVIAData = {
      employeeId,
      financialYear,
      ...(defaultValues.chapterVIA as any),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...overrideData?.deductions80
    } as any;

    // Other income
    let otherIncomeData: OtherIncome;
    otherIncomeData = {
      employeeId,
      financialYear,
      ...(defaultValues.otherIncome as any),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...overrideData?.otherIncome
    } as any;

    // TDS details
    let tdsData: TDSDetails;
    tdsData = {
      employeeId,
      financialYear,
      ...(defaultValues.tdsDetails as any),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...overrideData?.tdsDetails
    } as any;

    // Validate data
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
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // Calculate Form 16 Part B
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
    // AY is the year following the FY (e.g. FY 2025-26 => AY 2026-27)
    const assessmentYear = `${fyEndYear}-${String((fyEndYear + 1) % 100).padStart(2, '0')}`;

    // Calculate period dates based on DOJ and financial year
    const fyStartDate = new Date(`${fyStartYear}-04-01`);
    const fyEndDate = new Date(`${fyEndYear}-03-31`);
    
    // Handle DOJ - could be Date, Timestamp, or string
    let dojDate: Date;
    if (employee.doj instanceof Date) {
      dojDate = employee.doj;
    } else if (employee.doj && typeof employee.doj === 'object' && 'toDate' in employee.doj) {
      // Firestore Timestamp
      dojDate = (employee.doj as any).toDate();
    } else if (employee.doj) {
      dojDate = new Date(employee.doj);
    } else {
      // Default to FY start if DOJ not available
      dojDate = fyStartDate;
    }
    
    // Validate DOJ date
    if (isNaN(dojDate.getTime())) {
      dojDate = fyStartDate; // Fallback to FY start
    }
    
    // Period of employment: from DOJ or FY start (whichever is later) to FY end or current date (whichever is earlier)
    const periodFrom = dojDate > fyStartDate ? dojDate : fyStartDate;
    const periodTo = new Date() < fyEndDate ? new Date() : fyEndDate;
    
    const formatDate = (date: Date) => {
      if (isNaN(date.getTime())) {
        // Return empty string if invalid
        return '';
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    const fyStart = formatDate(fyStartDate);
    const fyEnd = formatDate(fyEndDate);
    const periodFromStr = formatDate(periodFrom);
    const periodToStr = formatDate(periodTo);
    const today = formatDate(new Date());
    
    // Ensure dates are valid, use FY dates as fallback
    const safePeriodFrom = periodFromStr || fyStart;
    const safePeriodTo = periodToStr || fyEnd;

    // Get signatory details from request body or use defaults
    const finalSignatoryName = signatoryName || 'Authorized Signatory';
    const finalSignatoryDesignation = signatoryDesignation || 'Authorized Signatory';
    const finalSignatoryPlace = signatoryPlace || '';

    // Helper function to convert date string (YYYY-MM-DD) to DD/MM/YYYY format
    const convertDateFormat = (dateStr: string): string => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return dateStr; // Return as-is if already in correct format or invalid
      }
    };

    // Build Part A data - use provided data if includePartA is true, otherwise use blank values
    let finalPartAData;
    if (includePartA && partAData) {
      // Use provided Part A data, converting dates to DD/MM/YYYY format
      const quarterlyBreakup = partAData.quarterlyTDS ? {
        q1: {
          amount: partAData.quarterlyTDS.q1.amount || 0,
          section: partAData.quarterlyTDS.q1.section || '192',
          dateOfDeduction: convertDateFormat(partAData.quarterlyTDS.q1.dateOfDeduction),
          dateOfDeposit: convertDateFormat(partAData.quarterlyTDS.q1.dateOfDeposit),
          challanCIN: partAData.quarterlyTDS.q1.challanCIN || ''
        },
        q2: {
          amount: partAData.quarterlyTDS.q2.amount || 0,
          section: partAData.quarterlyTDS.q2.section || '192',
          dateOfDeduction: convertDateFormat(partAData.quarterlyTDS.q2.dateOfDeduction),
          dateOfDeposit: convertDateFormat(partAData.quarterlyTDS.q2.dateOfDeposit),
          challanCIN: partAData.quarterlyTDS.q2.challanCIN || ''
        },
        q3: {
          amount: partAData.quarterlyTDS.q3.amount || 0,
          section: partAData.quarterlyTDS.q3.section || '192',
          dateOfDeduction: convertDateFormat(partAData.quarterlyTDS.q3.dateOfDeduction),
          dateOfDeposit: convertDateFormat(partAData.quarterlyTDS.q3.dateOfDeposit),
          challanCIN: partAData.quarterlyTDS.q3.challanCIN || ''
        },
        q4: {
          amount: partAData.quarterlyTDS.q4.amount || 0,
          section: partAData.quarterlyTDS.q4.section || '192',
          dateOfDeduction: convertDateFormat(partAData.quarterlyTDS.q4.dateOfDeduction),
          dateOfDeposit: convertDateFormat(partAData.quarterlyTDS.q4.dateOfDeposit),
          challanCIN: partAData.quarterlyTDS.q4.challanCIN || ''
        }
      } : {
        q1: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
        q2: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
        q3: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
        q4: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' }
      };

      // Calculate total TDS from quarterly breakdown
      const totalTdsFromPartA = quarterlyBreakup.q1.amount + quarterlyBreakup.q2.amount + 
                                 quarterlyBreakup.q3.amount + quarterlyBreakup.q4.amount;

      finalPartAData = {
        certificateNumber: partAData.certificateNumber || '',
        lastUpdatedOn: convertDateFormat(partAData.lastUpdatedOn) || today,
        validFrom: convertDateFormat(partAData.validFrom) || fyStart,
        validTill: convertDateFormat(partAData.validTill) || fyEnd,
        employeeName: employee.name,
        employeePan: employee.pan,
        employeeAddress: employee.address || '',
        employeeDesignation: employee.designation,
        employeeAadhaar: employee.aadhaar,
        periodFrom: safePeriodFrom,
        periodTo: safePeriodTo,
        totalTdsDeducted: totalTdsFromPartA || 0,
        tdsDetails: {
          ...tdsData,
          quarterlyBreakup
        }
      };
    } else {
      // Part A not included - use blank/empty values
      finalPartAData = {
        certificateNumber: '',
        lastUpdatedOn: '',
        validFrom: '',
        validTill: '',
        employeeName: employee.name,
        employeePan: employee.pan,
        employeeAddress: employee.address || '',
        employeeDesignation: employee.designation,
        employeeAadhaar: employee.aadhaar,
        periodFrom: '',
        periodTo: '',
        totalTdsDeducted: 0,
        tdsDetails: {
          ...tdsData,
          quarterlyBreakup: {
            q1: { amount: 0, section: '', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
            q2: { amount: 0, section: '', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
            q3: { amount: 0, section: '', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
            q4: { amount: 0, section: '', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' }
          }
        }
      };
    }

    const form16Document: Omit<Form16Document, 'id'> = {
      employeeId,
      financialYear,
      assessmentYear,
      employerName: employerName || 'Employer Name',
      employerTan: employerTan || '',
      employerPan: employerPan || '',
      employerAddress: employerAddress || '',
      partA: finalPartAData,
      partB: computation,
      chapterVIADeductions: chapterVIAData,
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

    // No Firestore write here (see note above). Return an in-memory document for PDF generation.
    const savedDocument: Form16Document = { id: `tmp_${employeeId}_${Date.now()}`, ...form16Document };

    // Generate PDF
    const pdfData = await Form16PDFGenerator.generateForm16PDF(savedDocument);

    // Convert to base64 for response
    // In server-side, pdfData is a Buffer, convert directly to base64
    let pdfBase64: string;
    if (Buffer.isBuffer(pdfData)) {
      pdfBase64 = pdfData.toString('base64');
    } else {
      // If it's a Blob (shouldn't happen in server, but handle it)
      pdfBase64 = await blobToBase64(pdfData as Blob);
    }

    const response: Form16Response = {
      success: true,
      data: {
        document: savedDocument,
        computation,
        pdfUrl: `data:application/pdf;base64,${pdfBase64}`
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Form 16 generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log detailed error for debugging
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    });
    
    return NextResponse.json(
      { 
        success: false, 
        errors: [`Internal server error: ${errorMessage}`],
        // Include error details in development
        ...(process.env.NODE_ENV === 'development' && { 
          details: errorStack,
          error: error instanceof Error ? error.toString() : String(error)
        })
      },
      { status: 500 }
    );
  }
}

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

