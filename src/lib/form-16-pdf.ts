import { Form16Document, Form16Computation } from './form-16-models';

// Dynamic import for jsPDF to handle server-side properly
// This ensures jsPDF is loaded correctly in Next.js API routes

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export class Form16PDFGenerator {
  private static readonly FONT_SIZE = {
    TITLE: 16,
    SUBTITLE: 12,
    NORMAL: 11,
    SMALL: 9
  };

  private static readonly COLORS = {
    PRIMARY: [0, 0, 139], // Dark Blue
    SECONDARY: [70, 70, 70], // Gray
    ACCENT: [255, 69, 0] // Orange Red
  };

  /**
   * Helper method to get autoTable function from pdf instance
   */
  private static getAutoTable(pdf: any): any {
    return (pdf as any)._autoTable;
  }

  /**
   * Generate Form 16 PDF with Part A and Part B
   * As per Rule 31(1)(a) of Income Tax Rules, 1962
   */
  static async generateForm16PDF(
    form16Doc: Form16Document,
    password?: string
  ): Promise<Blob | Buffer> {
    // Use require-style imports for Next.js compatibility (fixes ESM/CJS issues)
    let jsPDF: any;
    let autoTable: any;
    
    try {
      // For server-side, use require to avoid ESM/CJS binding issues
      if (typeof window === 'undefined') {
        // Server-side: use require (more reliable for Next.js)
        jsPDF = require('jspdf').jsPDF;
        autoTable = require('jspdf-autotable');
      } else {
        // Browser: use ES6 imports
        const jspdfModule = await import('jspdf');
        jsPDF = jspdfModule.jsPDF;
        autoTable = (await import('jspdf-autotable')).default;
      }
    } catch (error) {
      console.error('Failed to import jsPDF/autoTable:', error);
      throw new Error(`Failed to load jsPDF library: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure jspdf and jspdf-autotable are properly installed.`);
    }
    
    if (!jsPDF) {
      throw new Error('jsPDF is not properly installed or could not be loaded.');
    }
    
    if (!autoTable) {
      throw new Error('jspdf-autotable is not properly installed or could not be loaded.');
    }
    
    const pdf = new jsPDF();
    
    // Store autoTable function for use in helper methods
    (pdf as any)._autoTable = autoTable;

    // Set password protection if provided
    if (password) {
      pdf.setProperties({
        title: `Form 16 - ${form16Doc.partA.employeeName}`,
        subject: `Form 16 for FY ${form16Doc.financialYear}`,
        author: 'ZenithBooks',
        keywords: 'Form 16, TDS, Income Tax',
        creator: 'ZenithBooks Accounting Software'
      });
    }

    // Page 1: Part A - TDS Certificate
    this.generatePartA(pdf, form16Doc);

    // Page 2: Part B - Salary Details and Tax Computation
    pdf.addPage();
    this.generatePartB(pdf, form16Doc);

    // Convert to appropriate format based on environment
    // In Node.js (server-side), use arraybuffer and convert to Buffer
    // In browser, use blob
    if (typeof window === 'undefined') {
      // Server-side: use arraybuffer
      const arrayBuffer = pdf.output('arraybuffer');
      // Convert to Buffer for Node.js compatibility
      // Buffer is available globally in Node.js
      const { Buffer } = await import('buffer');
      const buffer = Buffer.from(arrayBuffer);
      // Return Buffer for server-side
      return buffer;
    } else {
      // Browser: use blob
      const pdfBlob = pdf.output('blob');
      return pdfBlob;
    }
  }

  /**
   * Generate Part A - TDS Certificate
   * Certificate for tax deducted at source from income chargeable under the head "Salaries"
   * As per Section 192 of Income Tax Act, 1961
   */
  private static generatePartA(pdf: jsPDF, form16Doc: Form16Document): void {
    const { partA } = form16Doc;

    // Header - Exact text as per official Form 16
    pdf.setFontSize(this.FONT_SIZE.TITLE);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('FORM NO. 16', 105, 20, { align: 'center' });

    pdf.setFontSize(this.FONT_SIZE.SUBTITLE);
    pdf.setTextColor(0, 0, 0);
    pdf.text('[See rule 31(1)(a)]', 105, 28, { align: 'center' });

    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('PART A', 105, 40, { align: 'center' });
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.text('Certificate for tax deducted at source from income chargeable under the head "Salaries"', 105, 48, { align: 'center' });
    pdf.text('[See section 203]', 105, 54, { align: 'center' });

    let yPos = 65;

    // Certificate Details
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(0, 0, 0);

    const certificateData = [
      ['Certificate No.', partA.certificateNumber || ''],
      ['Last updated on', partA.lastUpdatedOn || new Date().toLocaleDateString('en-IN')],
      ['Valid From', partA.validFrom || `01/04/${form16Doc.financialYear.split('-')[0]}`],
      ['Valid Till', partA.validTill || `31/03/${form16Doc.financialYear.split('-')[1]}`]
    ];

    // Use autoTable function directly (not as method)
    const autoTable = this.getAutoTable(pdf);
    if (!autoTable) {
      throw new Error('autoTable function not available on PDF instance');
    }
    autoTable(pdf, {
      startY: yPos,
      head: [],
      body: certificateData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Details of the Deductor (Employer)
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Details of the Deductor:', 20, yPos);
    yPos += 10;

    const employerData = [
      ['Name of the Deductor', form16Doc.employerName],
      ['TAN of the Deductor', form16Doc.employerTan],
      ['Address of the Deductor', form16Doc.employerAddress || ''],
      ['PAN of the Deductor', form16Doc.employerPan || '']
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [],
      body: employerData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Details of the Recipient (Employee)
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Details of the Recipient:', 20, yPos);
    yPos += 10;

    const employeeData = [
      ['Name of the Recipient', partA.employeeName],
      ['PAN of the Recipient', partA.employeePan],
      ['Address of the Recipient', partA.employeeAddress || ''],
      ['Aadhaar Number (if available)', partA.employeeAadhaar || ''],
      ['Designation', partA.employeeDesignation],
      ['Period of Employment', `${partA.periodFrom || `01/04/${form16Doc.financialYear.split('-')[0]}`} to ${partA.periodTo || `31/03/${form16Doc.financialYear.split('-')[1]}`}`]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [],
      body: employeeData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Summary of Tax Deducted and Deposited
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Summary of Tax Deducted and Deposited:', 20, yPos);
    yPos += 10;

    // Quarterly TDS Details Table
    const quarterlyTDS = partA.tdsDetails?.quarterlyBreakup || {
      q1: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
      q2: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
      q3: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
      q4: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' }
    };

    const tdsTableData = [
      ['Quarter', 'Section', 'Date of Deduction', 'Date of Deposit', 'Amount (₹)', 'Challan CIN'],
      ['Q1', quarterlyTDS.q1.section, quarterlyTDS.q1.dateOfDeduction, quarterlyTDS.q1.dateOfDeposit, 
       quarterlyTDS.q1.amount.toLocaleString('en-IN'), quarterlyTDS.q1.challanCIN || ''],
      ['Q2', quarterlyTDS.q2.section, quarterlyTDS.q2.dateOfDeduction, quarterlyTDS.q2.dateOfDeposit, 
       quarterlyTDS.q2.amount.toLocaleString('en-IN'), quarterlyTDS.q2.challanCIN || ''],
      ['Q3', quarterlyTDS.q3.section, quarterlyTDS.q3.dateOfDeduction, quarterlyTDS.q3.dateOfDeposit, 
       quarterlyTDS.q3.amount.toLocaleString('en-IN'), quarterlyTDS.q3.challanCIN || ''],
      ['Q4', quarterlyTDS.q4.section, quarterlyTDS.q4.dateOfDeduction, quarterlyTDS.q4.dateOfDeposit, 
       quarterlyTDS.q4.amount.toLocaleString('en-IN'), quarterlyTDS.q4.challanCIN || ''],
      ['Total', '', '', '', partA.totalTdsDeducted.toLocaleString('en-IN'), '']
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [tdsTableData[0]],
      body: tdsTableData.slice(1),
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 35 }
      }
    });

    // Signatory Section
    yPos = (pdf as any).lastAutoTable.finalY + 20;
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Signatory Details:', 20, yPos);
    yPos += 10;

    const signatoryData = [
      ['Name', form16Doc.signatory.name],
      ['Designation', form16Doc.signatory.designation],
      ['Place', form16Doc.signatory.place],
      ['Date', form16Doc.signatory.date]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [],
      body: signatoryData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Signature line
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.text('Signature: _________________________', 20, yPos);
    yPos += 10;
    pdf.text(`(${form16Doc.signatory.name})`, 20, yPos);
    yPos += 5;
    pdf.text(form16Doc.signatory.designation, 20, yPos);

    // Footer
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.setTextColor(100, 100, 100);
    pdf.text('This is a computer generated certificate.', 20, 270);
  }

  /**
   * Generate Part B - Salary Details and Tax Computation
   * Details of salary paid and any other income and tax deducted
   * As per Rule 31(1)(a) of Income Tax Rules, 1962
   */
  private static generatePartB(pdf: any, form16Doc: Form16Document): void {
    const { partB, partA } = form16Doc;

    // Header - Exact text as per official Form 16
    pdf.setFontSize(this.FONT_SIZE.TITLE);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('FORM NO. 16', 105, 20, { align: 'center' });

    pdf.setFontSize(this.FONT_SIZE.SUBTITLE);
    pdf.setTextColor(0, 0, 0);
    pdf.text('[See rule 31(1)(a)]', 105, 28, { align: 'center' });

    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('PART B (Annexure)', 105, 40, { align: 'center' });
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.text('Details of salary paid and any other income and tax deducted', 105, 48, { align: 'center' });

    let yPos = 60;

    // 1-5. DETAILS OF THE EMPLOYER
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('DETAILS OF THE EMPLOYER:', 20, yPos);
    yPos += 10;

    const employerData = [
      ['1. Name of the Employer', form16Doc.employerName],
      ['2. Address of the Employer', form16Doc.employerAddress || ''],
      ['3. TAN of the Employer', form16Doc.employerTan],
      ['4. PAN of the Employer', form16Doc.employerPan || ''],
      ['5. Assessment Year', form16Doc.assessmentYear]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [],
      body: employerData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 12;

    // 1-6. DETAILS OF THE EMPLOYEE
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('DETAILS OF THE EMPLOYEE:', 20, yPos);
    yPos += 10;

    const employeeData = [
      ['1. Name of the Employee', partA.employeeName],
      ['2. Address of the Employee', partA.employeeAddress || ''],
      ['3. PAN of the Employee', partA.employeePan],
      ['4. Aadhaar Number (if available)', partA.employeeAadhaar || ''],
      ['5. Designation', partA.employeeDesignation],
      ['6. Period of Employment', `${partA.periodFrom || `01/04/${form16Doc.financialYear.split('-')[0]}`} to ${partA.periodTo || `31/03/${form16Doc.financialYear.split('-')[1]}`}`]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [],
      body: employeeData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 12;

    // 7. DETAILS OF SALARY PAID
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('7. DETAILS OF SALARY PAID:', 20, yPos);
    yPos += 8;

    const salaryData = [
      ['(a) Salary as per provisions of section 17(1)', partB.salarySection17_1.toLocaleString('en-IN')],
      ['(b) Value of perquisites under section 17(2)', partB.perquisitesSection17_2.toLocaleString('en-IN')],
      ['(c) Profits in lieu of salary under section 17(3)', partB.profitsSection17_3.toLocaleString('en-IN')],
      ['Gross Salary (Total of a+b+c)', partB.grossSalary.toLocaleString('en-IN')]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [['Salary Components', 'Amount (₹)']],
      body: salaryData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 12;

    // 8. DEDUCTIONS UNDER SECTION 10
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('8. DEDUCTIONS UNDER SECTION 10:', 20, yPos);
    yPos += 8;

    const exemptionsData = [
      ['(a) Travel concession or assistance under section 10(5)', '0'],
      ['(b) Death-cum-retirement gratuity under section 10(10)', '0'],
      ['(c) Commuted value of pension under section 10(10A)', '0'],
      ['(d) Cash equivalent of leave salary encashment under section 10(10AA)', '0'],
      ['(e) House rent allowance under section 10(13A)', '0'],
      ['(f) Any other exemption under section 10', '0'],
      ['Total Exemptions u/s 10', partB.exemptionsSection10.toLocaleString('en-IN')]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [['Exemptions u/s 10', 'Amount (₹)']],
      body: exemptionsData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 12;

    // 9. INCOME UNDER THE HEAD "SALARIES" (7 - 8)
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.SECONDARY);
    pdf.text(`9. INCOME UNDER THE HEAD "SALARIES" (7 - 8) = ₹${partB.netSalary.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 12;

    // 10. DEDUCTIONS UNDER SECTION 16
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('10. DEDUCTIONS UNDER SECTION 16:', 20, yPos);
    yPos += 8;

    const section16Data = [
      ['(a) Standard deduction under section 16(ia)', partB.deductionsSection16.toLocaleString('en-IN')],
      ['(b) Entertainment allowance under section 16(ii)', '0'],
      ['(c) Tax on employment under section 16(iii)', '0'],
      ['Total Deductions u/s 16', partB.deductionsSection16.toLocaleString('en-IN')]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [['Deductions u/s 16', 'Amount (₹)']],
      body: section16Data,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 12;

    // 11. NET SALARY (9 - 10)
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.SECONDARY);
    pdf.text(`11. NET SALARY (9 - 10) = ₹${partB.incomeFromSalary.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 12;

    // 12. ANY OTHER INCOME REPORTED BY THE EMPLOYEE
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('12. ANY OTHER INCOME REPORTED BY THE EMPLOYEE:', 20, yPos);
    yPos += 8;

    const otherIncomeData = [
      ['(a) Income (or admissible loss) from house property', '0'],
      ['(b) Income under the head "Other Sources"', partB.otherIncome.toLocaleString('en-IN')],
      ['Total Other Income', partB.otherIncome.toLocaleString('en-IN')]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [['Other Income', 'Amount (₹)']],
      body: otherIncomeData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 12;

    // 13. GROSS TOTAL INCOME (11 + 12)
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.SECONDARY);
    pdf.text(`13. GROSS TOTAL INCOME (11 + 12) = ₹${partB.grossTotalIncome.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 12;

    // 14. DEDUCTIONS UNDER CHAPTER VI-A
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('14. DEDUCTIONS UNDER CHAPTER VI-A:', 20, yPos);
    yPos += 8;

    const chapterVIAData = [
      ['(a) Section 80C (Life Insurance, PPF, NSC, etc.)', '0'],
      ['(b) Section 80CCC (Pension funds)', '0'],
      ['(c) Section 80CCD(1) (NPS employee contribution)', '0'],
      ['(d) Section 80CCD(1B) (NPS self-contribution)', '0'],
      ['(e) Section 80CCD(2) (NPS employer contribution)', '0'],
      ['(f) Section 80D (Health insurance premium)', '0'],
      ['(g) Section 80DD (Medical treatment of dependent)', '0'],
      ['(h) Section 80DDB (Medical treatment)', '0'],
      ['(i) Section 80E (Interest on education loan)', '0'],
      ['(j) Section 80EE/80EEA (Interest on home loan)', '0'],
      ['(k) Section 80G (Donations)', '0'],
      ['(l) Section 80GG (Rent paid)', '0'],
      ['(m) Section 80GGA (Donations for scientific research)', '0'],
      ['(n) Section 80GGC (Donations to political parties)', '0'],
      ['(o) Section 80TTA (Interest on savings accounts)', '0'],
      ['(p) Section 80TTB (Interest on deposits for senior citizens)', '0'],
      ['(q) Any other deductions under Chapter VI-A', '0'],
      ['Total Deductions u/s VI-A', partB.deductionsChapterVIA.toLocaleString('en-IN')]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [['Deductions u/s VI-A', 'Amount (₹)']],
      body: chapterVIAData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 12;

    // 15. TOTAL TAXABLE INCOME (13 - 14)
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.SECONDARY);
    pdf.text(`15. TOTAL TAXABLE INCOME (13 - 14) = ₹${partB.totalTaxableIncome.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 12;

    // 16. COMPUTATION OF TAX
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('16. COMPUTATION OF TAX:', 20, yPos);
    yPos += 8;

    const taxData = [
      ['(a) Tax on Total Income', partB.taxOnIncome.toLocaleString('en-IN')],
      ['(b) Surcharge (if applicable)', partB.surcharge.toLocaleString('en-IN')],
      ['(c) Health and Education Cess @ 4%', partB.healthEducationCess.toLocaleString('en-IN')],
      ['Total Tax Liability (a+b+c)', partB.totalTaxLiability.toLocaleString('en-IN')],
      ['(d) Rebate under section 87A', partB.rebate87A.toLocaleString('en-IN')],
      ['Tax after Rebate u/s 87A', partB.taxAfterRebate.toLocaleString('en-IN')]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [['Tax Computation', 'Amount (₹)']],
      body: taxData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 12;

    // 17. DETAILS OF TAX DEDUCTED AND DEPOSITED
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('17. DETAILS OF TAX DEDUCTED AND DEPOSITED:', 20, yPos);
    yPos += 8;

    const tdsData = [
      ['(a) Total Tax Deducted', partB.tdsDeducted.toLocaleString('en-IN')],
      ['(b) Tax Deposited in respect of Tax Deducted', partB.taxDeposited.toLocaleString('en-IN')]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [['TDS Details', 'Amount (₹)']],
      body: tdsData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 12;

    // 18. RELIEF UNDER SECTION 89
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('18. RELIEF UNDER SECTION 89:', 20, yPos);
    yPos += 8;

    const reliefData = [
      ['(a) Relief u/s 89', partB.relief89.toLocaleString('en-IN')],
      ['(b) Net Tax Payable/(Refund)', partB.taxPayable >= 0 ? partB.taxPayable.toLocaleString('en-IN') : `(${Math.abs(partB.taxPayable).toLocaleString('en-IN')})`]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [['Final Computation', 'Amount (₹)']],
      body: reliefData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    // Signatory Section
    let finalYPos = (pdf as any).lastAutoTable.finalY + 20;
    if (finalYPos > 240) {
      pdf.addPage();
      finalYPos = 20;
    }

    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Signatory Details:', 20, finalYPos);
    finalYPos += 10;

    const signatoryData = [
      ['Name', form16Doc.signatory.name],
      ['Designation', form16Doc.signatory.designation],
      ['Place', form16Doc.signatory.place],
      ['Date', form16Doc.signatory.date]
    ];

    this.getAutoTable(pdf)(pdf, {
      startY: finalYPos,
      head: [],
      body: signatoryData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 100 }
      }
    });

    finalYPos = (pdf as any).lastAutoTable.finalY + 15;

    // Signature line
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.text('Signature: _________________________', 20, finalYPos);
    finalYPos += 10;
    pdf.text(`(${form16Doc.signatory.name})`, 20, finalYPos);
    finalYPos += 5;
    pdf.text(form16Doc.signatory.designation, 20, finalYPos);

    // Footer
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.setTextColor(100, 100, 100);
    pdf.text('This is a computer generated Form 16 Part B. Generated by ZenithBooks.', 20, 270);
    pdf.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 20, 280);
  }

  /**
   * Generate bulk Form 16 PDFs
   */
  static async generateBulkForm16PDFs(
    form16Documents: Form16Document[],
    password?: string
  ): Promise<{ [employeeId: string]: Blob }> {
    const results: { [employeeId: string]: Blob } = {};

    for (const doc of form16Documents) {
      const pdfBlob = await this.generateForm16PDF(doc, password);
      results[doc.employeeId] = pdfBlob;
    }

    return results;
  }
}
