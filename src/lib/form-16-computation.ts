import {
  EmployeeMaster,
  SalaryStructure,
  ExemptionsSection10,
  Section16Deductions,
  ChapterVIA_Deductions,
  OtherIncome,
  TDSDetails,
  Form16Computation,
  TaxRegimeConfig
} from './form-16-models';

/**
 * Form 16 Part B Computation Engine
 * Implements the step-by-step tax calculation as per Indian Income Tax rules
 */
export class Form16ComputationEngine {

  private static taxRegimeConfig: TaxRegimeConfig = {
    financialYear: '2024-25',
    oldRegime: {
      slabs: [
        { min: 0, max: 250000, rate: 0 },
        { min: 250000, max: 500000, rate: 0.05 },
        { min: 500000, max: 1000000, rate: 0.20 },
        { min: 1000000, max: null, rate: 0.30 }
      ],
      cess: 0.04, // 4%
      surcharge: [
        { min: 0, max: 5000000, rate: 0 },
        { min: 5000000, max: 10000000, rate: 0.10 },
        { min: 10000000, max: null, rate: 0.15 }
      ]
    },
    newRegime: {
      slabs: [
        { min: 0, max: 300000, rate: 0 },
        { min: 300000, max: 700000, rate: 0.05 },
        { min: 700000, max: 1000000, rate: 0.10 },
        { min: 1000000, max: 1200000, rate: 0.15 },
        { min: 1200000, max: 1500000, rate: 0.20 },
        { min: 1500000, max: null, rate: 0.30 }
      ],
      cess: 0.04, // 4%
      surcharge: [
        { min: 0, max: 3000000, rate: 0 },
        { min: 3000000, max: 5000000, rate: 0.05 },
        { min: 5000000, max: 10000000, rate: 0.10 },
        { min: 10000000, max: null, rate: 0.15 }
      ]
    },
    rebate87A: {
      maxAmount: 12500,
      incomeLimit: 500000
    }
  };

  /**
   * Main computation function - calculates Form 16 Part B
   */
  static calculateForm16PartB(
    employee: EmployeeMaster,
    salaryStructure: SalaryStructure,
    exemptions: ExemptionsSection10,
    section16: Section16Deductions,
    chapterVIA: ChapterVIA_Deductions,
    otherIncome: OtherIncome,
    tdsDetails: TDSDetails
  ): Form16Computation {

    // Step 1: Gross Salary (Sum of all salary components)
    const grossSalary = this.calculateGrossSalary(salaryStructure);

    // Step 2: Exemptions under Section 10
    const exemptionsSection10 = this.calculateSection10Exemptions(exemptions, employee.taxRegime);

    // Step 3: Net Salary (Gross - Exemptions)
    const netSalary = grossSalary - exemptionsSection10;

    // Step 4: Deductions under Section 16
    const deductionsSection16 = this.calculateSection16Deductions(section16);

    // Step 5: Income from Salary
    const incomeFromSalary = netSalary - deductionsSection16;

    // Step 6: Other Income
    const otherIncomeTotal = this.calculateOtherIncome(otherIncome);

    // Step 7: Gross Total Income
    const grossTotalIncome = incomeFromSalary + otherIncomeTotal;

    // Step 8: Deductions under Chapter VI-A
    const deductionsChapterVIA = this.calculateChapterVIADeductions(chapterVIA, employee.taxRegime);

    // Step 9: Total Taxable Income
    const totalTaxableIncome = grossTotalIncome - deductionsChapterVIA;

    // Step 10-12: Tax Calculation
    const { taxOnIncome, rebate87A, taxAfterRebate, healthEducationCess, totalTaxLiability } =
      this.calculateTax(totalTaxableIncome, employee.taxRegime);

    // Step 13: Relief under Section 89
    const relief89 = tdsDetails.relief89 || 0;

    // Step 14: TDS Deducted
    const tdsDeducted = tdsDetails.totalTdsDeducted;

    // Step 15: Tax Payable/Refund
    const taxPayable = totalTaxLiability - tdsDeducted - relief89;

    // Calculate both regimes for comparison
    const oldRegimeTax = employee.taxRegime === 'OLD' ? totalTaxLiability :
      this.calculateTaxOnly(totalTaxableIncome, 'OLD');

    const newRegimeTax = employee.taxRegime === 'NEW' ? totalTaxLiability :
      this.calculateTaxOnly(totalTaxableIncome, 'NEW');

    return {
      employeeId: employee.id,
      financialYear: salaryStructure.financialYear,
      grossSalary,
      exemptionsSection10,
      netSalary,
      deductionsSection16,
      incomeFromSalary,
      otherIncome: otherIncomeTotal,
      grossTotalIncome,
      deductionsChapterVIA,
      totalTaxableIncome,
      taxOnIncome,
      rebate87A,
      taxAfterRebate,
      healthEducationCess,
      totalTaxLiability,
      relief89,
      tdsDeducted,
      taxPayable,
      taxRegime: employee.taxRegime,
      oldRegimeTax,
      newRegimeTax,
      computedAt: new Date() as any
    };
  }

  /**
   * Calculate Gross Salary from salary structure
   */
  private static calculateGrossSalary(salary: SalaryStructure): number {
    const monthly = salary.monthly;
    return (
      monthly.basic +
      monthly.hra +
      monthly.da +
      monthly.specialAllowance +
      monthly.lta +
      monthly.bonus +
      monthly.incentives +
      monthly.arrears +
      monthly.perquisites +
      monthly.employerPf
    );
  }

  /**
   * Calculate Section 10 Exemptions
   * NEW regime disallows most exemptions
   */
  private static calculateSection10Exemptions(
    exemptions: ExemptionsSection10,
    taxRegime: 'OLD' | 'NEW'
  ): number {
    if (taxRegime === 'NEW') {
      // NEW regime only allows standard deduction and professional tax
      return 0; // Exemptions handled separately in Section 16
    }

    return (
      exemptions.hraExempt +
      exemptions.ltaExempt +
      exemptions.childrenEduAllowance +
      exemptions.hostelAllowance +
      (exemptions.otherExemptions ? Object.values(exemptions.otherExemptions).reduce((a, b) => a + b, 0) : 0)
    );
  }

  /**
   * Calculate Section 16 Deductions
   */
  private static calculateSection16Deductions(section16: Section16Deductions): number {
    return (
      section16.standardDeduction +
      section16.professionalTax +
      section16.entertainmentAllowance +
      (section16.otherDeductions ? Object.values(section16.otherDeductions).reduce((a, b) => a + b, 0) : 0)
    );
  }

  /**
   * Calculate Other Income
   */
  private static calculateOtherIncome(otherIncome: OtherIncome): number {
    return (
      otherIncome.savingsInterest +
      otherIncome.fdInterest +
      otherIncome.otherIncome +
      (otherIncome.otherIncomeDetails ? Object.values(otherIncome.otherIncomeDetails).reduce((a, b) => a + b, 0) : 0)
    );
  }

  /**
   * Calculate Chapter VI-A Deductions
   * NEW regime disallows most deductions
   */
  private static calculateChapterVIADeductions(
    chapterVIA: ChapterVIA_Deductions,
    taxRegime: 'OLD' | 'NEW'
  ): number {
    if (taxRegime === 'NEW') {
      // NEW regime only allows Section 80CCD(1B) and Section 80CCD(2)
      return chapterVIA.section80CCD1B;
    }

    return (
      chapterVIA.section80C +
      chapterVIA.section80CCD1B +
      chapterVIA.section80D +
      chapterVIA.section80TTA +
      chapterVIA.section80G +
      (chapterVIA.otherDeductions ? Object.values(chapterVIA.otherDeductions).reduce((a, b) => a + b, 0) : 0)
    );
  }

  /**
   * Calculate tax liability with rebate and cess
   */
  private static calculateTax(income: number, regime: 'OLD' | 'NEW') {
    const taxOnIncome = this.calculateTaxOnly(income, regime);
    const rebate87A = this.calculateRebate87A(income, taxOnIncome);
    const taxAfterRebate = Math.max(0, taxOnIncome - rebate87A);
    const healthEducationCess = taxAfterRebate * this.taxRegimeConfig.cess;
    const totalTaxLiability = taxAfterRebate + healthEducationCess;

    return {
      taxOnIncome,
      rebate87A,
      taxAfterRebate,
      healthEducationCess,
      totalTaxLiability
    };
  }

  /**
   * Calculate tax based on slabs only
   */
  private static calculateTaxOnly(income: number, regime: 'OLD' | 'NEW'): number {
    const regimeConfig = regime === 'OLD' ? this.taxRegimeConfig.oldRegime : this.taxRegimeConfig.newRegime;
    let tax = 0;
    let remainingIncome = income;

    for (const slab of regimeConfig.slabs) {
      if (remainingIncome <= 0) break;

      const slabMin = slab.min;
      const slabMax = slab.max || Infinity;
      const taxableInSlab = Math.min(remainingIncome, slabMax - slabMin);

      if (taxableInSlab > 0) {
        tax += taxableInSlab * slab.rate;
        remainingIncome -= taxableInSlab;
      }
    }

    // Add surcharge
    let surcharge = 0;
    for (const surchargeSlab of regimeConfig.surcharge) {
      if (income > surchargeSlab.min) {
        if (surchargeSlab.max === null || income <= surchargeSlab.max) {
          surcharge = tax * surchargeSlab.rate;
          break;
        }
      }
    }

    return Math.round(tax + surcharge);
  }

  /**
   * Calculate Rebate under Section 87A
   */
  private static calculateRebate87A(income: number, taxOnIncome: number): number {
    if (income <= this.taxRegimeConfig.rebate87A.incomeLimit) {
      return Math.min(taxOnIncome, this.taxRegimeConfig.rebate87A.maxAmount);
    }
    return 0;
  }

  /**
   * Validate computation data
   */
  static validateComputationData(
    employee: EmployeeMaster,
    salaryStructure: SalaryStructure,
    exemptions: ExemptionsSection10,
    section16: Section16Deductions,
    chapterVIA: ChapterVIA_Deductions,
    otherIncome: OtherIncome,
    tdsDetails: TDSDetails
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // PAN validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(employee.pan)) {
      errors.push('Invalid PAN format');
    }

    // Financial year consistency
    const fy = salaryStructure.financialYear;
    if (exemptions.financialYear !== fy) errors.push('Exemptions financial year mismatch');
    if (section16.financialYear !== fy) errors.push('Section 16 deductions financial year mismatch');
    if (chapterVIA.financialYear !== fy) errors.push('Chapter VI-A deductions financial year mismatch');
    if (otherIncome.financialYear !== fy) errors.push('Other income financial year mismatch');
    if (tdsDetails.financialYear !== fy) errors.push('TDS details financial year mismatch');

    // Deduction limits
    if (chapterVIA.section80C > 150000) errors.push('Section 80C exceeds maximum limit of ₹1,50,000');
    if (chapterVIA.section80CCD1B > 50000) errors.push('Section 80CCD(1B) exceeds maximum limit of ₹50,000');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default values for a new computation
   */
  static getDefaultValues(financialYear: string) {
    return {
      exemptions: {
        hraExempt: 0,
        ltaExempt: 0,
        childrenEduAllowance: 0,
        hostelAllowance: 0
      } as Partial<ExemptionsSection10>,
      section16: {
        standardDeduction: this.getStandardDeduction(financialYear),
        professionalTax: 0,
        entertainmentAllowance: 0
      } as Partial<Section16Deductions>,
      chapterVIA: {
        section80C: 0,
        section80CCD1B: 0,
        section80D: 0,
        section80TTA: 0,
        section80G: 0
      } as Partial<ChapterVIA_Deductions>,
      otherIncome: {
        savingsInterest: 0,
        fdInterest: 0,
        otherIncome: 0
      } as Partial<OtherIncome>,
      tdsDetails: {
        totalTdsDeducted: 0,
        relief89: 0
      } as Partial<TDSDetails>
    };
  }

  /**
   * Get standard deduction based on financial year
   */
  private static getStandardDeduction(financialYear: string): number {
    // Standard deduction increased to ₹50,000 from FY 2018-19
    return 50000;
  }
}
