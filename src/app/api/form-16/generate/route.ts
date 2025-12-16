import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
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

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Parse request body
    const body: Form16Request = await request.json();
    const { employeeId, financialYear, overrideData } = body;

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
      const defaultSalary = Form16ComputationEngine.getDefaultValues(financialYear);
      salaryData = {
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
        updatedAt: Timestamp.now(),
        ...overrideData?.salaryStructure
      };
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

    const form16Document: Omit<Form16Document, 'id'> = {
      employeeId,
      financialYear,
      employerName: employerData?.companyName || employerData?.name || 'Employer Name',
      employerTan: employerData?.tan || '',
      employerPan: employerData?.pan || '',
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
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
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
