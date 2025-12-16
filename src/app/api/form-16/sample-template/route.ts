import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create sample data
    const sampleData = [
      {
        name: 'John Doe',
        pan: 'ABCDE1234F',
        aadhaar: '123456789012',
        address: '123 Main Street, Mumbai, Maharashtra - 400001',
        designation: 'Software Engineer',
        doj: '2023-04-01',
        employmentType: 'permanent',
        residentialStatus: 'resident',
        taxRegime: 'NEW',
        basic: 50000,
        hra: 15000,
        da: 5000,
        specialAllowance: 10000,
        lta: 20000,
        bonus: 50000,
        incentives: 0,
        arrears: 0,
        perquisites: 0,
        employerPf: 5000,
        hraExempt: 15000,
        ltaExempt: 20000,
        childrenEduAllowance: 0,
        hostelAllowance: 0,
        section80C: 50000,
        section80CCD1B: 25000,
        section80D: 25000,
        section80TTA: 10000,
        section80G: 0,
        savingsInterest: 5000,
        fdInterest: 15000,
        otherIncome: 0,
        totalTdsDeducted: 85000,
        relief89: 0
      },
      {
        name: 'Jane Smith',
        pan: 'FGHIJ5678K',
        aadhaar: '234567890123',
        address: '456 Oak Avenue, Delhi, Delhi - 110001',
        designation: 'Product Manager',
        doj: '2023-01-15',
        employmentType: 'permanent',
        residentialStatus: 'resident',
        taxRegime: 'NEW',
        basic: 75000,
        hra: 22500,
        da: 7500,
        specialAllowance: 15000,
        lta: 30000,
        bonus: 75000,
        incentives: 5000,
        arrears: 0,
        perquisites: 0,
        employerPf: 7500,
        hraExempt: 22500,
        ltaExempt: 30000,
        childrenEduAllowance: 0,
        hostelAllowance: 0,
        section80C: 75000,
        section80CCD1B: 50000,
        section80D: 50000,
        section80TTA: 10000,
        section80G: 0,
        savingsInterest: 10000,
        fdInterest: 25000,
        otherIncome: 0,
        totalTdsDeducted: 125000,
        relief89: 0
      }
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Add column headers with descriptions
    const headers = [
      ['Column', 'Field Name', 'Description', 'Required', 'Example'],
      ['A', 'name', 'Employee full name', 'Yes', 'John Doe'],
      ['B', 'pan', 'PAN number in format ABCDE1234F', 'Yes', 'ABCDE1234F'],
      ['C', 'aadhaar', 'Aadhaar number (12 digits)', 'No', '123456789012'],
      ['D', 'address', 'Employee residential address', 'No', '123 Main Street, Mumbai'],
      ['E', 'designation', 'Job designation', 'Yes', 'Software Engineer'],
      ['F', 'doj', 'Date of joining (YYYY-MM-DD)', 'Yes', '2023-04-01'],
      ['G', 'employmentType', 'permanent/contract/probation', 'No', 'permanent'],
      ['H', 'residentialStatus', 'resident/non-resident/rnor', 'No', 'resident'],
      ['I', 'taxRegime', 'NEW or OLD tax regime', 'No', 'NEW'],
      ['J', 'basic', 'Monthly basic salary', 'Yes', '50000'],
      ['K', 'hra', 'Monthly HRA', 'No', '15000'],
      ['L', 'da', 'Monthly Dearness Allowance', 'No', '5000'],
      ['M', 'specialAllowance', 'Monthly special allowance', 'No', '10000'],
      ['N', 'lta', 'Monthly LTA', 'No', '20000'],
      ['O', 'bonus', 'Annual bonus', 'No', '50000'],
      ['P', 'incentives', 'Annual incentives', 'No', '0'],
      ['Q', 'arrears', 'Annual arrears', 'No', '0'],
      ['R', 'perquisites', 'Annual perquisites value', 'No', '0'],
      ['S', 'employerPf', 'Monthly employer PF contribution', 'No', '5000'],
      ['T', 'hraExempt', 'Annual HRA exemption', 'No', '15000'],
      ['U', 'ltaExempt', 'Annual LTA exemption', 'No', '20000'],
      ['V', 'childrenEduAllowance', 'Annual children education allowance', 'No', '0'],
      ['W', 'hostelAllowance', 'Annual hostel allowance', 'No', '0'],
      ['X', 'section80C', 'Annual Section 80C deduction', 'No', '50000'],
      ['Y', 'section80CCD1B', 'Annual Section 80CCD(1B) deduction', 'No', '25000'],
      ['Z', 'section80D', 'Annual Section 80D deduction', 'No', '25000'],
      ['AA', 'section80TTA', 'Annual Section 80TTA deduction', 'No', '10000'],
      ['AB', 'section80G', 'Annual Section 80G deduction', 'No', '0'],
      ['AC', 'savingsInterest', 'Annual savings account interest', 'No', '5000'],
      ['AD', 'fdInterest', 'Annual fixed deposit interest', 'No', '15000'],
      ['AE', 'otherIncome', 'Annual other income', 'No', '0'],
      ['AF', 'totalTdsDeducted', 'Annual TDS deducted', 'No', '85000'],
      ['AG', 'relief89', 'Annual relief under section 89', 'No', '0']
    ];

    // Create instructions worksheet
    const instructionsSheet = XLSX.utils.aoa_to_sheet([
      ['Form 16 Bulk Upload Template Instructions'],
      [''],
      ['1. Download this template and fill in your employee data'],
      ['2. Do not modify the column headers'],
      ['3. Required fields marked as "Yes" must be filled'],
      ['4. Dates should be in YYYY-MM-DD format'],
      ['5. PAN should be in ABCDE1234F format'],
      ['6. All amounts should be in rupees (numbers only)'],
      ['7. Tax regime should be either "NEW" or "OLD"'],
      ['8. Employment type: permanent/contract/probation'],
      ['9. Residential status: resident/non-resident/rnor'],
      [''],
      ['Important Notes:'],
      ['- Monthly amounts will be automatically converted to annual for calculations'],
      ['- If employee already exists (same PAN), data will be updated'],
      ['- All deductions have statutory limits (80C max ₹1.5L, 80CCD(1B) max ₹50K)'],
      ['- Standard deduction of ₹50,000 is automatically applied'],
      [''],
      ['Sample Data Sheet:'],
      ['See the next sheet for sample data format']
    ]);

    // Create field descriptions worksheet
    const fieldsSheet = XLSX.utils.aoa_to_sheet(headers);

    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    XLSX.utils.book_append_sheet(workbook, fieldsSheet, 'Field Descriptions');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Data');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="form16_bulk_upload_template.xlsx"'
      }
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
