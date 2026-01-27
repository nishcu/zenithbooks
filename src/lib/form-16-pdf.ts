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
    // Compact typography so Part A + Part B fit in 2 pages.
    TITLE: 14,
    SUBTITLE: 10,
    NORMAL: 9,
    SMALL: 7
  };

  private static readonly COLORS = {
    PRIMARY: [0, 0, 139], // Dark Blue
    SECONDARY: [70, 70, 70], // Gray
    ACCENT: [255, 69, 0] // Orange Red
  };

  private static readonly TABLE_STYLES = {
    fontSize: 7,
    cellPadding: 1,
    lineWidth: 0.1,
    valign: 'middle'
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
        const jspdfModule = require('jspdf');
        jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default;
        
        // jspdf-autotable exports object with autoTable property
        const autoTableModule = require('jspdf-autotable');
        // Try autoTable property first, then default, then the module itself
        autoTable = autoTableModule.autoTable || autoTableModule.default || autoTableModule;
        
        // Verify it's a function
        if (typeof autoTable !== 'function') {
          console.error('autoTable module structure:', Object.keys(autoTableModule));
          throw new Error(`autoTable is not a function. Module exports: ${Object.keys(autoTableModule).join(', ')}`);
        }
      } else {
        // Browser: use ES6 imports
        const jspdfModule = await import('jspdf');
        jsPDF = jspdfModule.jsPDF || (jspdfModule.default as any)?.jsPDF || jspdfModule.default;
        const autoTableModule = await import('jspdf-autotable');
        autoTable = autoTableModule.default || autoTableModule;
      }
    } catch (error) {
      console.error('Failed to import jsPDF/autoTable:', error);
      throw new Error(`Failed to load jsPDF library: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure jspdf and jspdf-autotable are properly installed.`);
    }
    
    if (!jsPDF) {
      throw new Error('jsPDF is not properly installed or could not be loaded.');
    }
    
    if (typeof autoTable !== 'function') {
      console.error('autoTable type:', typeof autoTable, autoTable);
      throw new Error(`jspdf-autotable is not properly installed or loaded incorrectly. Expected function, got: ${typeof autoTable}`);
    }
    
    const pdf = new jsPDF();
    
    // Store autoTable function for use in helper methods
    (pdf as any)._autoTable = autoTable;

    // Ensure partA exists before using it
    if (!form16Doc.partA) {
      throw new Error('Form16Document is missing required partA data. Please regenerate the Form 16.');
    }

    // Set password protection if provided
    if (password) {
      pdf.setProperties({
        title: `Form 16 - ${form16Doc.partA?.employeeName || 'Employee'}`,
        subject: `Form 16 for FY ${form16Doc.financialYear}`,
        author: 'ZenithBooks',
        keywords: 'Form 16, TDS, Income Tax',
        creator: 'ZenithBooks Accounting Software'
      });
    }

      // Page 1: Part A - TDS Certificate (always generated, may have blank values)
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
      // CORRECT: Convert ArrayBuffer to Buffer explicitly
      const { Buffer } = require('buffer');
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
    // Defensive check: ensure partA exists and is an object
    if (!form16Doc || !form16Doc.partA || typeof form16Doc.partA !== 'object') {
      throw new Error(`Form16Document is missing required partA data. partA: ${JSON.stringify(form16Doc?.partA)}`);
    }
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

    let yPos = 62;

    // Certificate Details
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(0, 0, 0);

    const certificateData = [
      ['Certificate No.', partA?.certificateNumber || ''],
      ['Last updated on', partA?.lastUpdatedOn || ''],
      ['Valid From', partA?.validFrom || ''],
      ['Valid Till', partA?.validTill || '']
    ];

    // Call autoTable directly (already validated during initialization)
    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [],
      body: certificateData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL, cellPadding: 0.6 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 8;

    // Details of the Deductor (Employer)
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Details of the Deductor:', 20, yPos);
    yPos += 10;

    const employerData = [
      ['Name of the Deductor', form16Doc.employerName || 'N/A'],
      ['TAN of the Deductor', form16Doc.employerTan || 'N/A'],
      ['Address of the Deductor', form16Doc.employerAddress || ''],
      ['PAN of the Deductor', form16Doc.employerPan || '']
    ];

    // Call autoTable directly (already validated during initialization)
    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [],
      body: employerData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL, cellPadding: 0.6 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 8;

    // Details of the Recipient (Employee)
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Details of the Recipient:', 20, yPos);
    yPos += 10;

    const employeeData = [
      ['Name of the Recipient', partA?.employeeName || 'N/A'],
      ['PAN of the Recipient', partA?.employeePan || 'N/A'],
      ['Address of the Recipient', partA?.employeeAddress || ''],
      ['Aadhaar Number (if available)', partA?.employeeAadhaar || ''],
      ['Designation', partA?.employeeDesignation || 'Employee'],
      ['Period of Employment', (() => {
        const fyStart = `01/04/${form16Doc.financialYear.split('-')[0]}`;
        const fyEnd = `31/03/${form16Doc.financialYear.split('-')[1]}`;
        const periodFrom = partA?.periodFrom && partA.periodFrom !== 'NaNaNaNa' ? partA.periodFrom : fyStart;
        const periodTo = partA?.periodTo && partA.periodTo !== 'NaNaNaNa' ? partA.periodTo : fyEnd;
        return `${periodFrom} to ${periodTo}`;
      })()]
    ];

    // Call autoTable directly (already validated during initialization)
    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      head: [],
      body: employeeData,
      theme: 'plain',
      styles: { fontSize: this.FONT_SIZE.SMALL, cellPadding: 0.6 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 100 }
      }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 8;

    // Summary of Tax Deducted and Deposited
    pdf.setFontSize(this.FONT_SIZE.NORMAL);
    pdf.setTextColor(...this.COLORS.PRIMARY);
    pdf.text('Summary of Tax Deducted and Deposited:', 20, yPos);
    yPos += 10;

    // Quarterly TDS Details Table
    const quarterlyTDS = partA?.tdsDetails?.quarterlyBreakup || {
      q1: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
      q2: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
      q3: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' },
      q4: { amount: 0, section: '192', dateOfDeduction: '', dateOfDeposit: '', challanCIN: '' }
    };

    // Helper to format amounts - show blank if 0
    const formatAmount = (amount: number) => amount > 0 ? amount.toLocaleString('en-IN') : '';
    const formatValue = (val: string | number) => val ? String(val) : '';
    const hasAnyQuarterDetail = ['q1', 'q2', 'q3', 'q4'].some((k) => {
      const q: any = (quarterlyTDS as any)[k];
      return !!(q?.amount || q?.dateOfDeduction || q?.dateOfDeposit || q?.challanCIN || q?.section);
    });
    
    if (!hasAnyQuarterDetail && (partA?.totalTdsDeducted || 0) === 0) {
      // Compact summary when there is no Part A / quarterly data (avoids extra pages).
      this.getAutoTable(pdf)(pdf, {
        startY: yPos,
        head: [],
        body: [
          ['Total TDS deducted', '0'],
          ['Tax deposited', '0']
        ],
        theme: 'plain',
        styles: { fontSize: this.FONT_SIZE.SMALL, cellPadding: 0.6 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { cellWidth: 40, halign: 'right' }
        }
      });
    } else {
      const tdsTableData = [
        ['Quarter', 'Section', 'Deduction Date', 'Deposit Date', 'Amount (₹)', 'Challan CIN'],
        ['Q1', formatValue(quarterlyTDS.q1.section), formatValue(quarterlyTDS.q1.dateOfDeduction), formatValue(quarterlyTDS.q1.dateOfDeposit),
         formatAmount(quarterlyTDS.q1.amount), formatValue(quarterlyTDS.q1.challanCIN)],
        ['Q2', formatValue(quarterlyTDS.q2.section), formatValue(quarterlyTDS.q2.dateOfDeduction), formatValue(quarterlyTDS.q2.dateOfDeposit),
         formatAmount(quarterlyTDS.q2.amount), formatValue(quarterlyTDS.q2.challanCIN)],
        ['Q3', formatValue(quarterlyTDS.q3.section), formatValue(quarterlyTDS.q3.dateOfDeduction), formatValue(quarterlyTDS.q3.dateOfDeposit),
         formatAmount(quarterlyTDS.q3.amount), formatValue(quarterlyTDS.q3.challanCIN)],
        ['Q4', formatValue(quarterlyTDS.q4.section), formatValue(quarterlyTDS.q4.dateOfDeduction), formatValue(quarterlyTDS.q4.dateOfDeposit),
         formatAmount(quarterlyTDS.q4.amount), formatValue(quarterlyTDS.q4.challanCIN)],
        ['Total', '', '', '', formatAmount(partA?.totalTdsDeducted || 0), '']
      ];

      this.getAutoTable(pdf)(pdf, {
        startY: yPos,
        head: [tdsTableData[0]],
        body: tdsTableData.slice(1),
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 0.8, lineWidth: 0.1 },
        headStyles: { fillColor: this.COLORS.PRIMARY, textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 18 },
          2: { cellWidth: 28 },
          3: { cellWidth: 28 },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 36 }
        }
      });
    }

    // Signatory (compact, no extra page)
    yPos = (pdf as any).lastAutoTable.finalY + 10;
    const safeY = Math.min(265, Math.max(yPos, 230));
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Signatory: ${form16Doc.signatory?.name || 'N/A'} (${form16Doc.signatory?.designation || 'N/A'})`, 20, safeY);
    pdf.text(`Place: ${form16Doc.signatory?.place || ''}    Date: ${form16Doc.signatory?.date || ''}`, 20, safeY + 6);
    pdf.text('Signature: _________________________', 20, safeY + 12);

    // Footer
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.setTextColor(100, 100, 100);
    pdf.text('This is a computer generated certificate.', 20, 285);
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

    // Compact Annexure-II style table (single table to keep Part B on one page)
    const rs = 'Rs.';
    const fmt = (n: number | undefined) => {
      const v = Number(n || 0);
      return v ? v.toLocaleString('en-IN') : '';
    };
    const safe = (s: any) => (s ? String(s) : '');
    const fyParts = (form16Doc.financialYear || '').split('-');
    const fyStart = `01/04/${fyParts[0] || ''}`;
    const fyEnd = `31/03/${fyParts[1] || ''}`;
    const periodFrom = partA?.periodFrom && partA.periodFrom !== 'NaNaNaNa' ? partA.periodFrom : fyStart;
    const periodTo = partA?.periodTo && partA.periodTo !== 'NaNaNaNa' ? partA.periodTo : fyEnd;

    const chapterVIA = form16Doc.chapterVIADeductions;
    const otherChapVIA =
      (chapterVIA?.otherDeductions ? Object.values(chapterVIA.otherDeductions).reduce((a, b) => a + (b || 0), 0) : 0) +
      (chapterVIA?.section80GG || 0) +
      (chapterVIA?.section80GGA || 0) +
      (chapterVIA?.section80GGC || 0) +
      (chapterVIA?.section80TTA || 0) +
      (chapterVIA?.section80TTB || 0) +
      (chapterVIA?.section80E || 0) +
      (chapterVIA?.section80EE || 0) +
      (chapterVIA?.section80EEA || 0);

    const baseTaxBeforeRelief = Math.max(0, (partB.taxOnIncome || 0) + (partB.surcharge || 0) - (partB.rebate87A || 0));
    const marginalRelief = Math.max(0, baseTaxBeforeRelief - (partB.taxAfterRebate || 0));

    // Slab breakdown (for FY 2025-26 NEW regime); keep compact and only show slabs that apply.
    const getNewRegimeSlabs = () => {
      // FY 2025-26 onwards (Finance Act 2025)
      if ((fyParts[0] || '') >= '2025') {
        return [
          { min: 0, max: 400000, rate: 0 },
          { min: 400000, max: 800000, rate: 0.05 },
          { min: 800000, max: 1200000, rate: 0.10 },
          { min: 1200000, max: 1600000, rate: 0.15 },
          { min: 1600000, max: 2000000, rate: 0.20 },
          { min: 2000000, max: 2400000, rate: 0.25 },
          { min: 2400000, max: Infinity, rate: 0.30 }
        ];
      }
      // Older new regime slabs (Finance (No.2) Act 2024)
      return [
        { min: 0, max: 300000, rate: 0 },
        { min: 300000, max: 700000, rate: 0.05 },
        { min: 700000, max: 1000000, rate: 0.10 },
        { min: 1000000, max: 1200000, rate: 0.15 },
        { min: 1200000, max: 1500000, rate: 0.20 },
        { min: 1500000, max: Infinity, rate: 0.30 }
      ];
    };
    const slabRows: any[] = [];
    if (partB.taxRegime === 'NEW') {
      const slabs = getNewRegimeSlabs();
      for (const slab of slabs) {
        const taxable = Math.max(0, Math.min(partB.totalTaxableIncome || 0, slab.max) - slab.min);
        if (taxable <= 0) continue;
        const tax = Math.round(taxable * slab.rate);
        if (!tax) continue;
        const label = slab.max === Infinity
          ? `Tax @ ${(slab.rate * 100).toFixed(0)}% above ₹${slab.min.toLocaleString('en-IN')}`
          : `Tax @ ${(slab.rate * 100).toFixed(0)}% (₹${slab.min.toLocaleString('en-IN')}–₹${(slab.max as number).toLocaleString('en-IN')})`;
        slabRows.push([label, rs, tax.toLocaleString('en-IN')]);
      }
    }

    const rows: any[] = [];
    const section = (title: string) => {
      rows.push([
        { content: title, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }
      ]);
    };
    const row = (label: string, amount: string) => rows.push([label, rs, amount]);

    section(`ANNEXURE - II  |  INCOME TAX CALCULATION FOR FY ${form16Doc.financialYear}`);
    row('Employee Name', safe(partA?.employeeName));
    row('Employee PAN', safe(partA?.employeePan));
    row('Designation', safe(partA?.employeeDesignation));
    row('Period', `${safe(periodFrom)} to ${safe(periodTo)}`);
    row('Employer', safe(form16Doc.employerName));
    row('Employer TAN', safe(form16Doc.employerTan));

    section('Salary & Income');
    row('Gross Salary', fmt(partB.grossSalary));
    row('Less: Exemptions u/s 10', fmt(partB.exemptionsSection10));
    row('Income under Head Salaries', fmt(partB.netSalary));
    row('Less: Deductions u/s 16 (Std Deduction etc.)', fmt(partB.deductionsSection16));
    row('Income from Salary', fmt(partB.incomeFromSalary));
    row('Add: Income from Other Sources', fmt(partB.otherIncome));
    row('Gross Total Income', fmt(partB.grossTotalIncome));
    row('Less: Deductions (Chapter VI-A)', fmt(partB.deductionsChapterVIA));
    row('Total Taxable Income', fmt(partB.totalTaxableIncome));

    section(`Tax Computation (Regime: ${partB.taxRegime})`);
    for (const r of slabRows) rows.push(r);
    row('Tax on Total Income (slab-wise)', fmt(partB.taxOnIncome));
    row('Surcharge', fmt(partB.surcharge));
    row('Rebate u/s 87A', fmt(partB.rebate87A));
    if (marginalRelief > 0) row('Marginal Relief', marginalRelief.toLocaleString('en-IN'));
    row('Tax after Rebate/Relief', fmt(partB.taxAfterRebate));
    row('Health & Education Cess @ 4%', fmt(partB.healthEducationCess));
    row('Total Tax Liability', fmt(partB.totalTaxLiability));
    row('Less: TDS', fmt(partB.tdsDeducted));
    row('Less: Relief u/s 89', fmt(partB.relief89));
    row('Tax Payable / (Refund)', partB.taxPayable >= 0 ? fmt(partB.taxPayable) : `(${fmt(Math.abs(partB.taxPayable))})`);

    // Compact table
    let yPos = 56;
    this.getAutoTable(pdf)(pdf, {
      startY: yPos,
      body: rows,
      theme: 'grid',
      styles: { ...this.TABLE_STYLES, fontSize: 7 },
      tableWidth: 182,
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 132 },
        1: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' }
      },
      didParseCell: (data: any) => {
        if (data.cell?.raw?.styles?.fillColor) {
          data.cell.styles.fillColor = data.cell.raw.styles.fillColor;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Footer
    pdf.setFontSize(this.FONT_SIZE.SMALL);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Computer generated by ZenithBooks.', 14, 285);
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
