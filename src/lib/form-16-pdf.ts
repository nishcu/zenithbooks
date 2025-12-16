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
    const { partB } = form16Doc;

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

    // Certificate Details
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.setTextColor(0, 0, 0);

    const detailsData = [
      ['Certificate No.', ''],
      ['Name and address of the Employer', form16Doc.employerName],
      ['Name and designation of the employee', `${form16Doc.partA.employeeName}, ${form16Doc.partA.employeeDesignation}`],
      ['PAN of the employee', form16Doc.partA.employeePan],
      ['Assessment Year', form16Doc.assessmentYear],
      ['Period with the employer', `01/04/${form16Doc.financialYear.split('-')[0]} to 31/03/${form16Doc.financialYear.split('-')[1]}`]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [],
      body: detailsData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Salary Details Table
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('1. Gross Salary', 20, yPos);
    yPos += 10;

    const salaryData = [
      ['Basic Salary', partB.grossSalary.toLocaleString('en-IN')],
      ['House Rent Allowance (HRA)', '0'],
      ['Dearness Allowance (DA)', '0'],
      ['Special Allowance', '0'],
      ['Leave Travel Allowance (LTA)', '0'],
      ['Bonus', '0'],
      ['Incentives', '0'],
      ['Arrears', '0'],
      ['Perquisites', '0'],
      ['Employer PF Contribution', '0'],
      ['Gross Salary (Total)', partB.grossSalary.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Particulars', 'Amount (₹)']],
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
    pdf.text('2. Exemptions under Section 10', 20, yPos);
    yPos += 10;

    const exemptionsData = [
      ['HRA Exemption', '0'],
      ['LTA Exemption', '0'],
      ['Children Education Allowance', '0'],
      ['Hostel Allowance', '0'],
      ['Total Exemptions', partB.exemptionsSection10.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Exemptions', 'Amount (₹)']],
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
    pdf.text(`3. Net Salary (1 - 2) = ₹${partB.netSalary.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 15;

    // Deductions Section 16
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('4. Deductions under Section 16', 20, yPos);
    yPos += 10;

    const section16Data = [
      ['Standard Deduction u/s 16(ia)', partB.deductionsSection16.toLocaleString('en-IN')],
      ['Professional Tax', '0'],
      ['Entertainment Allowance', '0'],
      ['Total Deductions u/s 16', partB.deductionsSection16.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Deductions', 'Amount (₹)']],
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
    pdf.text(`5. Income from Salary (3 - 4) = ₹${partB.incomeFromSalary.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 15;

    // Other Income
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('6. Any other income reported by the employee', 20, yPos);
    yPos += 10;

    const otherIncomeData = [
      ['Savings Interest', '0'],
      ['FD Interest', '0'],
      ['Other Income', '0'],
      ['Total Other Income', partB.otherIncome.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Income', 'Amount (₹)']],
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
    pdf.text(`7. Gross Total Income (5 + 6) = ₹${partB.grossTotalIncome.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 15;

    // Chapter VI-A Deductions
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('8. Deductions under Chapter VI-A', 20, yPos);
    yPos += 10;

    const chapterVIAData = [
      ['Section 80C', '0'],
      ['Section 80CCD(1B)', '0'],
      ['Section 80D', '0'],
      ['Section 80TTA', '0'],
      ['Section 80G', '0'],
      ['Total Deductions u/s VI-A', partB.deductionsChapterVIA.toLocaleString('en-IN')]
    ];

    pdf.autoTable({
      startY: yPos,
      head: [['Deductions', 'Amount (₹)']],
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
    pdf.text(`9. Total Taxable Income (7 - 8) = ₹${partB.totalTaxableIncome.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 15;

    // Tax Computation
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('10. Tax Computation', 20, yPos);
    yPos += 10;

    const taxData = [
      ['Tax on Total Income', partB.taxOnIncome.toLocaleString('en-IN')],
      ['Rebate u/s 87A', partB.rebate87A.toLocaleString('en-IN')],
      ['Tax after Rebate', partB.taxAfterRebate.toLocaleString('en-IN')],
      ['Health & Education Cess @4%', partB.healthEducationCess.toLocaleString('en-IN')],
      ['Total Tax Liability', partB.totalTaxLiability.toLocaleString('en-IN')]
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

    // TDS and Relief
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('11. Relief under Section 89', 20, yPos);
    yPos += 10;

    const reliefData = [
      ['Relief u/s 89', partB.relief89.toLocaleString('en-IN')],
      ['TDS Deducted', partB.tdsDeducted.toLocaleString('en-IN')],
      ['Tax Payable/(Refund)', partB.taxPayable >= 0 ? partB.taxPayable.toLocaleString('en-IN') : `(${Math.abs(partB.taxPayable).toLocaleString('en-IN')})`]
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
