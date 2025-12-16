import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import {
  Form16ComputationEngine,
  Form16PDFGenerator
} from '@/lib/form-16-computation';
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
    const body: Form16Request & { signatoryName?: string; signatoryDesignation?: string; signatoryPlace?: string } = await request.json();
    const { employeeId, financialYear, overrideData, signatoryName, signatoryDesignation, signatoryPlace } = body;

    if (!employeeId || !financialYear) {
      return NextResponse.json(
        { success: false, errors: ['Employee ID and Financial Year are required'] },
        { status: 400 }
      );
    }

    // Fetch employee data
    const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
    if (!employeeDoc.exists()) {
      return NextResponse.json(
        { success: false, errors: ['Employee not found'] },
        { status: 404 }
      );
    }

    const employee = { id: employeeDoc.id, ...employeeDoc.data() } as EmployeeMaster;

    // Verify user has access to this employee
    if (employee.employerId !== userId) {
      return NextResponse.json(
        { success: false, errors: ['Access denied'] },
        { status: 403 }
      );
    }

    // Fetch or create default salary structure
    let salaryStructure = await getDoc(doc(db, 'salaryStructures', `${employeeId}_${financialYear}`));
    let salaryData: SalaryStructure;

    if (salaryStructure.exists()) {
      salaryData = { id: salaryStructure.id, ...salaryStructure.data() } as SalaryStructure;
    } else {
      // Create default salary structure
      // Handle override data - frontend sends flat structure, we need monthly/annual
      const overrideSalary = overrideData?.salaryStructure || {};
      
      // Check if override is already in monthly/annual format or flat format
      const isFlatFormat = overrideSalary.basic !== undefined && !overrideSalary.monthly;
      
      if (isFlatFormat) {
        // Convert flat format to monthly/annual
        // Frontend sends annual values, so use them directly for annual
        // Calculate monthly by dividing by 12 (or use annual/12 for monthly)
        const annualValue = (val: number) => val || 0;
        const monthlyValue = (val: number) => (val || 0) / 12;
        
        salaryData = {
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
        };
      } else {
        // Already in monthly/annual format
        salaryData = {
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
      }
    }

    // Fetch or create default exemptions
    let exemptionsDoc = await getDoc(doc(db, 'exemptions', `${employeeId}_${financialYear}`));
    let exemptionsData: ExemptionsSection10;

    if (exemptionsDoc.exists()) {
      exemptionsData = { id: exemptionsDoc.id, ...exemptionsDoc.data() } as ExemptionsSection10;
    } else {
      const defaultValues = Form16ComputationEngine.getDefaultValues(financialYear);
      exemptionsData = {
        employeeId,
        financialYear,
        hraExempt: 0,
        ltaExempt: 0,
        childrenEduAllowance: 0,
        hostelAllowance: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...overrideData?.exemptions
      };
    }

    // Fetch or create default Section 16 deductions
    let section16Doc = await getDoc(doc(db, 'section16Deductions', `${employeeId}_${financialYear}`));
    let section16Data: Section16Deductions;

    if (section16Doc.exists()) {
      section16Data = { id: section16Doc.id, ...section16Doc.data() } as Section16Deductions;
    } else {
      const defaultValues = Form16ComputationEngine.getDefaultValues(financialYear);
      section16Data = {
        employeeId,
        financialYear,
        standardDeduction: 50000,
        professionalTax: 0,
        entertainmentAllowance: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...overrideData?.deductions80
      };
    }

    // Fetch or create default Chapter VI-A deductions
    let chapterVIADoc = await getDoc(doc(db, 'chapterVIA_Deductions', `${employeeId}_${financialYear}`));
    let chapterVIAData: ChapterVIA_Deductions;

    if (chapterVIADoc.exists()) {
      chapterVIAData = { id: chapterVIADoc.id, ...chapterVIADoc.data() } as ChapterVIA_Deductions;
    } else {
      const defaultValues = Form16ComputationEngine.getDefaultValues(financialYear);
      chapterVIAData = {
        employeeId,
        financialYear,
        section80C: 0,
        section80CCD1B: 0,
        section80D: 0,
        section80TTA: 0,
        section80G: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...overrideData?.deductions80
      };
    }

    // Fetch or create default other income
    let otherIncomeDoc = await getDoc(doc(db, 'otherIncome', `${employeeId}_${financialYear}`));
    let otherIncomeData: OtherIncome;

    if (otherIncomeDoc.exists()) {
      otherIncomeData = { id: otherIncomeDoc.id, ...otherIncomeDoc.data() } as OtherIncome;
    } else {
      const defaultValues = Form16ComputationEngine.getDefaultValues(financialYear);
      otherIncomeData = {
        employeeId,
        financialYear,
        savingsInterest: 0,
        fdInterest: 0,
        otherIncome: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...overrideData?.otherIncome
      };
    }

    // Fetch or create default TDS details
    let tdsDoc = await getDoc(doc(db, 'tdsDetails', `${employeeId}_${financialYear}`));
    let tdsData: TDSDetails;

    if (tdsDoc.exists()) {
      tdsData = { id: tdsDoc.id, ...tdsDoc.data() } as TDSDetails;
    } else {
      const defaultValues = Form16ComputationEngine.getDefaultValues(financialYear);
      tdsData = {
        employeeId,
        financialYear,
        totalTdsDeducted: 0,
        relief89: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...overrideData?.tdsDetails
      };
    }

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

    // Get employer details
    const employerDoc = await getDoc(doc(db, 'users', userId));
    const employerData = employerDoc.data();

    // Create Form 16 document
    const assessmentYear = `${parseInt(financialYear.split('-')[1]) + 1}-${parseInt(financialYear.split('-')[1]) + 2}`;

    // Calculate period dates based on DOJ and financial year
    const fyStartDate = new Date(`${financialYear.split('-')[0]}-04-01`);
    const fyEndDate = new Date(`${financialYear.split('-')[1]}-03-31`);
    
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

    // Get signatory details from request body or use defaults
    const finalSignatoryName = signatoryName || employerData?.name || employerData?.companyName || 'Authorized Signatory';
    const finalSignatoryDesignation = signatoryDesignation || 'Authorized Signatory';
    const finalSignatoryPlace = signatoryPlace || employerData?.address?.split(',')[0] || '';

    const form16Document: Omit<Form16Document, 'id'> = {
      employeeId,
      financialYear,
      assessmentYear,
      employerName: employerData?.companyName || employerData?.name || 'Employer Name',
      employerTan: employerData?.tan || '',
      employerPan: employerData?.pan || '',
      employerAddress: employerData?.address || '',
      partA: {
        certificateNumber: `CERT-${employeeId}-${financialYear}`,
        lastUpdatedOn: today,
        validFrom: fyStart,
        validTill: fyEnd,
        employeeName: employee.name,
        employeePan: employee.pan,
        employeeAddress: employee.address || '', // Employee address
        employeeDesignation: employee.designation,
        employeeAadhaar: employee.aadhaar,
        periodFrom: periodFromStr,
        periodTo: periodToStr,
        totalTdsDeducted: tdsData.totalTdsDeducted,
        tdsDetails: {
          ...tdsData,
          quarterlyBreakup: tdsData.quarterlyBreakup || {
            q1: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
            q2: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
            q3: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
            q4: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' }
          }
        }
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

    // Save to database
    const docRef = await addDoc(collection(db, 'form16Documents'), form16Document);
    const savedDocument: Form16Document = { id: docRef.id, ...form16Document };

    // Generate PDF
    const pdfBlob = await Form16PDFGenerator.generateForm16PDF(savedDocument);

    // Convert blob to base64 for response
    const pdfBase64 = await blobToBase64(pdfBlob);

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
