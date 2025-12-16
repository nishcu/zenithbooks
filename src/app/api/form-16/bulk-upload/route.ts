import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
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
  Form16Document
} from '@/lib/form-16-models';

interface BulkUploadEmployeeData {
  name: string;
  pan: string;
  aadhaar?: string;
  designation: string;
  doj: string;
  employmentType?: 'permanent' | 'contract' | 'probation';
  residentialStatus?: 'resident' | 'non-resident' | 'resident-but-not-ordinarily-resident';
  taxRegime?: 'OLD' | 'NEW';

  // Salary components
  basic: number;
  hra?: number;
  da?: number;
  specialAllowance?: number;
  lta?: number;
  bonus?: number;
  incentives?: number;
  arrears?: number;
  perquisites?: number;
  employerPf?: number;

  // Exemptions
  hraExempt?: number;
  ltaExempt?: number;
  childrenEduAllowance?: number;
  hostelAllowance?: number;

  // Section 80 deductions
  section80C?: number;
  section80CCD1B?: number;
  section80D?: number;
  section80TTA?: number;
  section80G?: number;

  // Other income
  savingsInterest?: number;
  fdInterest?: number;
  otherIncome?: number;

  // TDS
  totalTdsDeducted?: number;
  relief89?: number;
}

interface BulkUploadResponse {
  success: boolean;
  data?: {
    processed: number;
    successful: number;
    failed: number;
    documents: Form16Document[];
    errors: { row: number; employeeName: string; errors: string[] }[];
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const financialYear = formData.get('financialYear') as string;
    const employerName = formData.get('employerName') as string;
    const employerTan = formData.get('employerTan') as string;
    const employerPan = formData.get('employerPan') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, errors: ['No file uploaded'] },
        { status: 400 }
      );
    }

    if (!financialYear || !employerName || !employerTan) {
      return NextResponse.json(
        { success: false, errors: ['Financial year, employer name, and TAN are required'] },
        { status: 400 }
      );
    }

    // Parse file content
    const fileContent = await file.arrayBuffer();
    let employeeData: BulkUploadEmployeeData[] = [];

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Process Excel file
      const workbook = XLSX.read(fileContent, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      employeeData = jsonData as BulkUploadEmployeeData[];
    } else if (file.name.endsWith('.csv')) {
      // Process CSV file
      const csvText = new TextDecoder().decode(fileContent);
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });
      employeeData = parseResult.data as BulkUploadEmployeeData[];
    } else {
      return NextResponse.json(
        { success: false, errors: ['Unsupported file format. Please upload Excel (.xlsx/.xls) or CSV (.csv) file'] },
        { status: 400 }
      );
    }

    if (employeeData.length === 0) {
      return NextResponse.json(
        { success: false, errors: ['No valid data found in the uploaded file'] },
        { status: 400 }
      );
    }

    // Process each employee
    const documents: Form16Document[] = [];
    const errors: { row: number; employeeName: string; errors: string[] }[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < employeeData.length; i++) {
      const rowNumber = i + 2; // Excel rows start from 1, plus header
      const empData = employeeData[i];

      try {
        // Validate required fields
        if (!empData.name || !empData.pan) {
          errors.push({
            row: rowNumber,
            employeeName: empData.name || 'Unknown',
            errors: ['Name and PAN are required']
          });
          failed++;
          continue;
        }

        // Validate PAN format
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(empData.pan)) {
          errors.push({
            row: rowNumber,
            employeeName: empData.name,
            errors: ['Invalid PAN format. Must be ABCDE1234F']
          });
          failed++;
          continue;
        }

        // Check if employee already exists
        const existingEmployeeQuery = query(
          collection(db, 'employees'),
          where('pan', '==', empData.pan),
          where('employerId', '==', userId)
        );
        const existingSnapshot = await getDocs(existingEmployeeQuery);

        let employeeId: string;
        if (!existingSnapshot.empty) {
          // Use existing employee
          employeeId = existingSnapshot.docs[0].id;
        } else {
          // Create new employee
          const newEmployee: Omit<EmployeeMaster, 'id'> = {
            empId: `EMP-${Date.now()}-${i}`,
            name: empData.name,
            pan: empData.pan,
            aadhaar: empData.aadhaar,
            designation: empData.designation || 'Employee',
            doj: empData.doj ? new Date(empData.doj) : new Date(),
            employmentType: empData.employmentType || 'permanent',
            residentialStatus: empData.residentialStatus || 'resident',
            taxRegime: empData.taxRegime || 'NEW',
            employerId: userId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };

          const employeeRef = await addDoc(collection(db, 'employees'), newEmployee);
          employeeId = employeeRef.id;
        }

        // Create salary structure from uploaded data
        const salaryData: SalaryStructure = {
          employeeId,
          financialYear,
          monthly: {
            basic: empData.basic || 0,
            hra: empData.hra || 0,
            da: empData.da || 0,
            specialAllowance: empData.specialAllowance || 0,
            lta: empData.lta || 0,
            bonus: empData.bonus || 0,
            incentives: empData.incentives || 0,
            arrears: empData.arrears || 0,
            perquisites: empData.perquisites || 0,
            employerPf: empData.employerPf || 0
          },
          annual: {
            basic: (empData.basic || 0) * 12,
            hra: (empData.hra || 0) * 12,
            da: (empData.da || 0) * 12,
            specialAllowance: (empData.specialAllowance || 0) * 12,
            lta: (empData.lta || 0) * 12,
            bonus: empData.bonus || 0,
            incentives: empData.incentives || 0,
            arrears: empData.arrears || 0,
            perquisites: empData.perquisites || 0,
            employerPf: (empData.employerPf || 0) * 12
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Create exemptions data
        const exemptionsData: ExemptionsSection10 = {
          employeeId,
          financialYear,
          hraExempt: empData.hraExempt || 0,
          ltaExempt: empData.ltaExempt || 0,
          childrenEduAllowance: empData.childrenEduAllowance || 0,
          hostelAllowance: empData.hostelAllowance || 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Create Section 16 deductions
        const section16Data: Section16Deductions = {
          employeeId,
          financialYear,
          standardDeduction: 50000,
          professionalTax: 0,
          entertainmentAllowance: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Create Chapter VI-A deductions
        const chapterVIAData: ChapterVIA_Deductions = {
          employeeId,
          financialYear,
          section80C: empData.section80C || 0,
          section80CCD1B: empData.section80CCD1B || 0,
          section80D: empData.section80D || 0,
          section80TTA: empData.section80TTA || 0,
          section80G: empData.section80G || 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Create other income
        const otherIncomeData: OtherIncome = {
          employeeId,
          financialYear,
          savingsInterest: empData.savingsInterest || 0,
          fdInterest: empData.fdInterest || 0,
          otherIncome: empData.otherIncome || 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Create TDS details
        const tdsData: TDSDetails = {
          employeeId,
          financialYear,
          totalTdsDeducted: empData.totalTdsDeducted || 0,
          relief89: empData.relief89 || 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Create employee object for computation
        const employee: EmployeeMaster = {
          id: employeeId,
          empId: `EMP-${Date.now()}-${i}`,
          name: empData.name,
          pan: empData.pan,
          aadhaar: empData.aadhaar,
          designation: empData.designation || 'Employee',
          doj: empData.doj ? new Date(empData.doj) : new Date(),
          employmentType: empData.employmentType || 'permanent',
          residentialStatus: empData.residentialStatus || 'resident',
          taxRegime: empData.taxRegime || 'NEW',
          employerId: userId,
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
            row: rowNumber,
            employeeName: empData.name,
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
        console.error(`Error processing row ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          employeeName: empData.name || 'Unknown',
          errors: ['Internal processing error']
        });
        failed++;
      }
    }

    const response: BulkUploadResponse = {
      success: true,
      data: {
        processed: employeeData.length,
        successful,
        failed,
        documents,
        errors
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}
