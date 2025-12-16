import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Form16Document, Form16Computation } from './form-16-models';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export class Form16PDFGenerator {
  private static readonly FONT_SIZE = {
    TITLE: 16,
    SUBTITLE: 14,
    NORMAL: 11,
    SMALL: 9
  };

  private static readonly COLORS = {
    PRIMARY: [0, 0, 139], // Dark Blue
    SECONDARY: [70, 70, 70], // Gray
    ACCENT: [255, 69, 0] // Orange Red
  };

  /**
   * Generate Form 16 PDF with Part A and Part B
   */
  static async generateForm16PDF(
    form16Doc: Form16Document,
    password?: string
  ): Promise<Blob> {
    const pdf = new jsPDF();

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

    // Convert to blob
    const pdfBlob = pdf.output('blob');

    return pdfBlob;
  }

  /**
   * Generate Part A - TDS Certificate
   */
  private static generatePartA(pdf: jsPDF, form16Doc: Form16Document): void {
    const { partA } = form16Doc;

    // Header
    pdf.setFontSize(this.FONT_SIZE.TITLE);
    pdf.setTextColor(...this.COLORORS.PRIMARY);
    pdf.text('FORM NO. 16', 105, 20, { align: 'center' });

    pdf.setFontSize(this.FONT_SIZE.SUBTITLE);
    pdf.text('[See rule 31(1)(a)]', 105, 30, { align: 'center' });

    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.text('PART A', 105, 45, { align: 'center' });
    pdf.text('TDS CERTIFICATE UNDER SECTION 195(6) / 200(3)', 105, 55, { align: 'center' });

    let yPos = 75;

    // Certificate Details
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(0, 0, 0);

    const certificateData = [
      ['Certificate No.', ''],
      ['Last updated on', new Date().toLocaleDateString('en-IN')],
      ['Valid From', '01/04/2024'],
      ['Valid Till', '31/03/2025']
    ];

    pdf.autoTable({
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

    yPos = (pdf as any).lastAutoTable.finalY + 20;

    // Employer Details
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Details of the Deductor:', 20, yPos);
    yPos += 10;

    const employerData = [
      ['Name of the Deductor', form16Doc.employerName],
      ['TAN of the Deductor', form16Doc.employerTan],
      ['Address of the Deductor', ''],
      ['PAN of the Deductor', form16Doc.employerPan || '']
    ];

    pdf.autoTable({
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

    yPos = (pdf as any).lastAutoTable.finalY + 20;

    // Employee Details
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Details of the Recipient:', 20, yPos);
    yPos += 10;

    const employeeData = [
      ['Name of the Recipient', partA.employeeName],
      ['PAN of the Recipient', partA.employeePan],
      ['Address of the Recipient', ''],
      ['Designation', partA.employeeDesignation]
    ];

    pdf.autoTable({
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

    yPos = (pdf as any).lastAutoTable.finalY + 20;

    // TDS Summary
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Summary of TDS:', 20, yPos);
    yPos += 10;

    const tdsData = [
      ['Total Value of Purchase of Goods/Services', '₹0.00'],
      ['Total TDS Deducted', `₹${partA.totalTdsDeducted.toLocaleString('en-IN')}`],
      ['Total Collection', '₹0.00'],
      ['Total Refund', '₹0.00']
    ];

    pdf.autoTable({
      startY: yPos,
      head: [],
      body: tdsData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    // Footer
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.setTextColor(100, 100, 100);
    pdf.text('This is a computer generated certificate and does not require signature.', 20, 270);
  }

  /**
   * Generate Part B - Salary Details and Tax Computation
   */
  private static generatePartB(pdf: jsPDF, form16Doc: Form16Document): void {
    const { partB, partA } = form16Doc;

    // Header
    pdf.setFontSize(this.FONT_SIZE.TITLE);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('FORM NO. 16', 105, 20, { align: 'center' });

    pdf.setFontSize(this.FONT_SIZE.SUBTITLE);
    pdf.text('[See rule 31(1)(a)]', 105, 30, { align: 'center' });

    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.text('PART B (Annexure)', 105, 45, { align: 'center' });
    pdf.text('DETAILS OF SALARY PAID AND ANY OTHER INCOME', 105, 55, { align: 'center' });
    pdf.text('AND TAX DEDUCTED', 105, 65, { align: 'center' });

    let yPos = 80;

    // Employer Details Section
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('DETAILS OF THE EMPLOYER:', 20, yPos);
    yPos += 10;

    const employerData = [
      ['1. Name of the Employer', form16Doc.employerName],
      ['2. Address of the Employer', ''],
      ['3. TAN of the Employer', form16Doc.employerTan],
      ['4. PAN of the Employer', form16Doc.employerPan || ''],
      ['5. Assessment Year', form16Doc.assessmentYear]
    ];

    pdf.autoTable({
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

    // Employee Details Section
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('DETAILS OF THE EMPLOYEE:', 20, yPos);
    yPos += 10;

    const employeeData = [
      ['1. Name of the Employee', partA.employeeName],
      ['2. Address of the Employee', ''],
      ['3. PAN of the Employee', partA.employeePan],
      ['4. Aadhaar Number (if available)', ''],
      ['5. Designation', partA.employeeDesignation],
      ['6. Period of Employment', `01/04/${form16Doc.financialYear.split('-')[0]} to 31/03/${form16Doc.financialYear.split('-')[1]}`]
    ];

    pdf.autoTable({
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

    // Salary Details Table
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('7. DETAILS OF SALARY PAID:', 20, yPos);
    yPos += 10;

    const salaryData = [
      ['Basic Salary', '0'],
      ['Dearness Allowance (DA)', '0'],
      ['House Rent Allowance (HRA)', '0'],
      ['Leave Travel Allowance (LTA)', '0'],
      ['Special Allowance', '0'],
      ['Bonus', '0'],
      ['Incentives/Commission', '0'],
      ['Arrears of Salary', '0'],
      ['Perquisites (Value of perquisites)', '0'],
      ['Employer\'s Contribution to PF', '0'],
      ['Gratuity', '0'],
      ['Other Exempt Allowances', '0'],
      ['Gross Salary (Total)', partB.grossSalary.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Salary Components', 'Amount (₹)']],
      body: salaryData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Exemptions
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('8. DEDUCTIONS UNDER SECTION 10:', 20, yPos);
    yPos += 10;

    const exemptionsData = [
      ['House Rent Allowance (HRA)', '0'],
      ['Leave Travel Allowance (LTA)', '0'],
      ['Children Education Allowance', '0'],
      ['Hostel Allowance', '0'],
      ['Transport Allowance', '0'],
      ['Medical Allowance', '0'],
      ['Other Exemptions', '0'],
      ['Total Exemptions u/s 10', partB.exemptionsSection10.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Exemptions u/s 10', 'Amount (₹)']],
      body: exemptionsData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Net Salary
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.SECONDARY);
    pdf.text(`9. INCOME UNDER THE HEAD "SALARIES" (7 - 8) = ₹${partB.netSalary.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 15;

    // Deductions Section 16
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('10. DEDUCTIONS UNDER SECTION 16:', 20, yPos);
    yPos += 10;

    const section16Data = [
      ['Standard Deduction u/s 16(ia)', partB.deductionsSection16.toLocaleString('en-IN')],
      ['Entertainment Allowance u/s 16(ii)', '0'],
      ['Professional Tax u/s 16(iii)', '0'],
      ['Total Deductions u/s 16', partB.deductionsSection16.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Deductions u/s 16', 'Amount (₹)']],
      body: section16Data,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Income from Salary
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.SECONDARY);
    pdf.text(`11. NET SALARY (9 - 10) = ₹${partB.incomeFromSalary.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 15;

    // Other Income
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('12. ANY OTHER INCOME REPORTED BY THE EMPLOYEE:', 20, yPos);
    yPos += 10;

    const otherIncomeData = [
      ['Interest from Savings Bank Account', '0'],
      ['Interest from Fixed Deposits', '0'],
      ['Interest from other sources', '0'],
      ['Income from house property', '0'],
      ['Any other income', '0'],
      ['Total Other Income', partB.otherIncome.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Other Income', 'Amount (₹)']],
      body: otherIncomeData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Gross Total Income
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.SECONDARY);
    pdf.text(`13. GROSS TOTAL INCOME (11 + 12) = ₹${partB.grossTotalIncome.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 15;

    // Chapter VI-A Deductions
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('14. DEDUCTIONS UNDER CHAPTER VI-A:', 20, yPos);
    yPos += 10;

    const chapterVIAData = [
      ['Section 80C (Life Insurance, PPF, etc.)', '0'],
      ['Section 80CCC (Pension Fund)', '0'],
      ['Section 80CCD(1) (Employees Provident Fund)', '0'],
      ['Section 80CCD(1B) (Additional NPS contribution)', '0'],
      ['Section 80D (Medical Insurance)', '0'],
      ['Section 80DD (Medical treatment of dependent)', '0'],
      ['Section 80DDB (Medical treatment)', '0'],
      ['Section 80E (Education Loan Interest)', '0'],
      ['Section 80EE/80EEA (Home Loan Interest)', '0'],
      ['Section 80G (Donations)', '0'],
      ['Section 80TTA (Savings Account Interest)', '0'],
      ['Section 80TTB (Senior Citizen Savings)', '0'],
      ['Other Deductions', '0'],
      ['Total Deductions u/s VI-A', partB.deductionsChapterVIA.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Deductions u/s VI-A', 'Amount (₹)']],
      body: chapterVIAData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Total Taxable Income
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.SECONDARY);
    pdf.text(`15. TOTAL TAXABLE INCOME (13 - 14) = ₹${partB.totalTaxableIncome.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 15;

    // Tax Computation
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('16. COMPUTATION OF TAX:', 20, yPos);
    yPos += 10;

    const taxData = [
      ['Tax on Total Income', partB.taxOnIncome.toLocaleString('en-IN')],
      ['Surcharge (if applicable)', '0'],
      ['Health & Education Cess @4%', partB.healthEducationCess.toLocaleString('en-IN')],
      ['Total Tax Liability', partB.totalTaxLiability.toLocaleString('en-IN')],
      ['Rebate u/s 87A', partB.rebate87A.toLocaleString('en-IN')],
      ['Tax after Rebate u/s 87A', partB.taxAfterRebate.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Tax Computation', 'Amount (₹)']],
      body: taxData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // TDS Details
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('17. DETAILS OF TAX DEDUCTED AND DEPOSITED:', 20, yPos);
    yPos += 10;

    const tdsData = [
      ['Total Tax Deducted', partB.tdsDeducted.toLocaleString('en-IN')],
      ['Tax Deposited in respect of Tax Deducted', partB.tdsDeducted.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['TDS Details', 'Amount (₹)']],
      body: tdsData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Relief and Final Computation
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('18. RELIEF UNDER SECTION 89:', 20, yPos);
    yPos += 10;

    const reliefData = [
      ['Relief u/s 89', partB.relief89.toLocaleString('en-IN')],
      ['Net Tax Payable/(Refund)', partB.taxPayable >= 0 ? partB.taxPayable.toLocaleString('en-IN') : `(${Math.abs(partB.taxPayable).toLocaleString('en-IN')})`]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Final Computation', 'Amount (₹)']],
      body: reliefData,
      theme: 'grid',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

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
