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
    const { taxOnIncome, surcharge, rebate87A, taxAfterRebate, healthEducationCess, totalTaxLiability } =
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

    // Calculate Section 17 breakdown for Part B
    const section17_1 = this.calculateSection17_1(salaryStructure);
    const section17_2 = this.calculateSection17_2(salaryStructure);
    const section17_3 = this.calculateSection17_3(salaryStructure);

    return {
      employeeId: employee.id,
      financialYear: salaryStructure.financialYear,
      salarySection17_1: section17_1,
      perquisitesSection17_2: section17_2,
      profitsSection17_3: section17_3,
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
      surcharge,
      healthEducationCess,
      totalTaxLiability,
      rebate87A,
      taxAfterRebate,
      tdsDeducted,
      taxDeposited: tdsDeducted, // Usually same as TDS deducted
      relief89,
      taxPayable,
      taxRegime: employee.taxRegime,
      oldRegimeTax,
      newRegimeTax,
      computedAt: new Date() as any
    };
  }

  /**
   * Calculate Gross Salary from salary structure
   * As per Section 17 of Income Tax Act, 1961
   */
  private static calculateGrossSalary(salary: SalaryStructure): number {
    // Section 17(1) - Salary as per provisions of section 17(1)
    const section17_1 = (
      (salary.section17_1?.basic || salary.monthly.basic || 0) +
      (salary.section17_1?.hra || salary.monthly.hra || 0) +
      (salary.section17_1?.da || salary.monthly.da || 0) +
      (salary.section17_1?.specialAllowance || salary.monthly.specialAllowance || 0) +
      (salary.section17_1?.lta || salary.monthly.lta || 0) +
      (salary.section17_1?.bonus || salary.monthly.bonus || 0) +
      (salary.section17_1?.incentives || salary.monthly.incentives || 0) +
      (salary.section17_1?.commission || 0) +
      (salary.section17_1?.overtime || 0) +
      (salary.section17_1?.otherAllowances || 0)
    );
    
    // Section 17(2) - Value of perquisites under section 17(2)
    const section17_2 = (
      (salary.section17_2?.perquisites || salary.monthly.perquisites || 0) +
      (salary.section17_2?.rentFreeAccommodation || 0) +
      (salary.section17_2?.carFacility || 0) +
      (salary.section17_2?.driverFacility || 0) +
      (salary.section17_2?.medicalReimbursement || 0) +
      (salary.section17_2?.clubFacility || 0) +
      (salary.section17_2?.otherPerquisites || 0)
    );
    
    // Section 17(3) - Profits in lieu of salary under section 17(3)
    const section17_3 = (
      (salary.section17_3?.gratuity || 0) +
      (salary.section17_3?.commutedPension || 0) +
      (salary.section17_3?.leaveEncashment || 0) +
      (salary.section17_3?.retrenchmentCompensation || 0) +
      (salary.section17_3?.otherProfits || 0)
    );
    
    // Employer Contributions
    const employerContributions = (
      (salary.employerContributions?.employerPf || salary.monthly.employerPf || 0) +
      (salary.employerContributions?.employerNps || 0) +
      (salary.employerContributions?.employerSuperannuation || 0)
    );
    
    // Arrears
    const arrears = salary.arrears || salary.monthly.arrears || 0;
    
    // Total Gross Salary = Section 17(1) + Section 17(2) + Section 17(3) + Employer Contributions + Arrears
    return section17_1 + section17_2 + section17_3 + employerContributions + arrears;
  }

  /**
   * Calculate Section 10 Exemptions
   * As per Section 10 of Income Tax Act, 1961
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
      (exemptions.travelConcession || 0) +           // Section 10(5)
      (exemptions.gratuityExempt || 0) +             // Section 10(10)
      (exemptions.commutedPensionExempt || 0) +      // Section 10(10A)
      (exemptions.leaveEncashmentExempt || 0) +      // Section 10(10AA)
      (exemptions.hraExempt || 0) +                  // Section 10(13A)
      (exemptions.childrenEduAllowance || 0) +       // Section 10(14)
      (exemptions.hostelAllowance || 0) +            // Section 10(14)
      (exemptions.transportAllowance || 0) +         // Section 10(14)
      (exemptions.medicalAllowance || 0) +           // Section 10(14)
      (exemptions.ltaExempt || 0) +                  // Leave Travel Allowance
      (exemptions.uniformAllowance || 0) +           // Uniform Allowance
      (exemptions.helperAllowance || 0) +            // Helper Allowance
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
   * As per Chapter VI-A of Income Tax Act, 1961
   * NEW regime disallows most deductions
   */
  private static calculateChapterVIADeductions(
    chapterVIA: ChapterVIA_Deductions,
    taxRegime: 'OLD' | 'NEW'
  ): number {
    if (taxRegime === 'NEW') {
      // NEW regime only allows Section 80CCD(1B) and Section 80CCD(2)
      return (chapterVIA.section80CCD1B || 0) + (chapterVIA.section80CCD2 || 0);
    }

    return (
      (chapterVIA.section80C || 0) +
      (chapterVIA.section80CCC || 0) +
      (chapterVIA.section80CCD1 || 0) +
      (chapterVIA.section80CCD1B || 0) +
      (chapterVIA.section80CCD2 || 0) +
      (chapterVIA.section80D || 0) +
      (chapterVIA.section80DD || 0) +
      (chapterVIA.section80DDB || 0) +
      (chapterVIA.section80E || 0) +
      (chapterVIA.section80EE || 0) +
      (chapterVIA.section80EEA || 0) +
      (chapterVIA.section80G || 0) +
      (chapterVIA.section80GG || 0) +
      (chapterVIA.section80GGA || 0) +
      (chapterVIA.section80GGC || 0) +
      (chapterVIA.section80TTA || 0) +
      (chapterVIA.section80TTB || 0) +
      (chapterVIA.otherDeductions ? Object.values(chapterVIA.otherDeductions).reduce((a, b) => a + b, 0) : 0)
    );
  }

  /**
   * Calculate Section 17(1) - Salary as per provisions of section 17(1)
   */
  private static calculateSection17_1(salary: SalaryStructure): number {
    return (
      (salary.section17_1?.basic || salary.monthly.basic || 0) +
      (salary.section17_1?.hra || salary.monthly.hra || 0) +
      (salary.section17_1?.da || salary.monthly.da || 0) +
      (salary.section17_1?.specialAllowance || salary.monthly.specialAllowance || 0) +
      (salary.section17_1?.lta || salary.monthly.lta || 0) +
      (salary.section17_1?.bonus || salary.monthly.bonus || 0) +
      (salary.section17_1?.incentives || salary.monthly.incentives || 0) +
      (salary.section17_1?.commission || 0) +
      (salary.section17_1?.overtime || 0) +
      (salary.section17_1?.otherAllowances || 0)
    );
  }

  /**
   * Calculate Section 17(2) - Value of perquisites under section 17(2)
   */
  private static calculateSection17_2(salary: SalaryStructure): number {
    return (
      (salary.section17_2?.perquisites || salary.monthly.perquisites || 0) +
      (salary.section17_2?.rentFreeAccommodation || 0) +
      (salary.section17_2?.carFacility || 0) +
      (salary.section17_2?.driverFacility || 0) +
      (salary.section17_2?.medicalReimbursement || 0) +
      (salary.section17_2?.clubFacility || 0) +
      (salary.section17_2?.otherPerquisites || 0)
    );
  }

  /**
   * Calculate Section 17(3) - Profits in lieu of salary under section 17(3)
   */
  private static calculateSection17_3(salary: SalaryStructure): number {
    return (
      (salary.section17_3?.gratuity || 0) +
      (salary.section17_3?.commutedPension || 0) +
      (salary.section17_3?.leaveEncashment || 0) +
      (salary.section17_3?.retrenchmentCompensation || 0) +
      (salary.section17_3?.otherProfits || 0)
    );
  }

  /**
   * Calculate surcharge based on income
   */
  private static calculateSurcharge(income: number, tax: number, regime: 'OLD' | 'NEW'): number {
    const regimeConfig = regime === 'OLD' ? this.taxRegimeConfig.oldRegime : this.taxRegimeConfig.newRegime;
    let surcharge = 0;
    
    for (const surchargeSlab of regimeConfig.surcharge) {
      if (income > surchargeSlab.min) {
        if (surchargeSlab.max === null || income <= surchargeSlab.max) {
          surcharge = tax * surchargeSlab.rate;
          break;
        }
      }
    }
    
    return Math.round(surcharge);
  }

  /**
   * Calculate tax liability with rebate and cess
   */
  private static calculateTax(income: number, regime: 'OLD' | 'NEW') {
    const taxOnIncome = this.calculateTaxOnly(income, regime);
    const surcharge = this.calculateSurcharge(income, taxOnIncome, regime);
    const taxAfterSurcharge = taxOnIncome + surcharge;
    const rebate87A = this.calculateRebate87A(income, taxAfterSurcharge);
    const taxAfterRebate = Math.max(0, taxAfterSurcharge - rebate87A);
    const healthEducationCess = taxAfterRebate * this.taxRegimeConfig.cess;
    const totalTaxLiability = taxAfterRebate + healthEducationCess;

    return {
      taxOnIncome,
      surcharge,
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

    // Surcharge is calculated separately in calculateTax method
    return Math.round(tax);
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
    const fyStart = `01/04/${financialYear.split('-')[0]}`;
    const fyEnd = `31/03/${financialYear.split('-')[1]}`;
    
    return {
      exemptions: {
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
        helperAllowance: 0
      } as Partial<ExemptionsSection10>,
      section16: {
        standardDeduction: this.getStandardDeduction(financialYear),
        professionalTax: 0,
        entertainmentAllowance: 0
      } as Partial<Section16Deductions>,
      chapterVIA: {
        section80C: 0,
        section80CCC: 0,
        section80CCD1: 0,
        section80CCD1B: 0,
        section80CCD2: 0,
        section80D: 0,
        section80DD: 0,
        section80DDB: 0,
        section80E: 0,
        section80EE: 0,
        section80EEA: 0,
        section80G: 0,
        section80GG: 0,
        section80GGA: 0,
        section80GGC: 0,
        section80TTA: 0,
        section80TTB: 0
      } as Partial<ChapterVIA_Deductions>,
      otherIncome: {
        savingsInterest: 0,
        fdInterest: 0,
        otherIncome: 0
      } as Partial<OtherIncome>,
      tdsDetails: {
        totalTdsDeducted: 0,
        relief89: 0,
        quarterlyBreakup: {
          q1: { amount: 0, section: '192', dateOfDeduction: fyStart, dateOfDeposit: fyStart, challanCIN: '' },
          q2: { amount: 0, section: '192', dateOfDeduction: fyStart, dateOfDeposit: fyStart, challanCIN: '' },
          q3: { amount: 0, section: '192', dateOfDeduction: fyStart, dateOfDeposit: fyStart, challanCIN: '' },
          q4: { amount: 0, section: '192', dateOfDeduction: fyStart, dateOfDeposit: fyStart, challanCIN: '' }
        }
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
