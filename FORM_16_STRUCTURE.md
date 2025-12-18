# Form 16 Structure Documentation

This document outlines the complete structure of Form 16 implementation in ZenithBooks.

## Overview

Form 16 is divided into two parts:
- **Part A**: TDS Certificate (Tax Deducted at Source Certificate)
- **Part B**: Annexure (Salary Details and Tax Computation)

---

## 1. Data Models Structure

### 1.1 Employee Master (`EmployeeMaster`)
```typescript
{
  id: string;
  empId: string;
  name: string;
  pan: string;
  aadhaar?: string;
  designation: string;
  doj: Date;
  employmentType: 'permanent' | 'contract' | 'probation';
  residentialStatus: 'resident' | 'non-resident' | 'resident-but-not-ordinarily-resident';
  taxRegime: 'OLD' | 'NEW';
  employerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.2 Salary Structure (`SalaryStructure`)
```typescript
{
  employeeId: string;
  financialYear: string; // '2023-24', '2024-25'
  monthly: {
    basic: number;
    hra: number;              // House Rent Allowance
    da: number;               // Dearness Allowance
    specialAllowance: number;
    lta: number;              // Leave Travel Allowance
    bonus: number;
    incentives: number;
    arrears: number;
    perquisites: number;
    employerPf: number;       // Employer's Contribution to PF
  };
  annual: {
    // Same structure as monthly (annual totals)
    basic: number;
    hra: number;
    da: number;
    specialAllowance: number;
    lta: number;
    bonus: number;
    incentives: number;
    arrears: number;
    perquisites: number;
    employerPf: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.3 Exemptions Section 10 (`ExemptionsSection10`)
```typescript
{
  employeeId: string;
  financialYear: string;
  hraExempt: number;                    // House Rent Allowance Exemption
  ltaExempt: number;                     // Leave Travel Allowance Exemption
  childrenEduAllowance: number;         // Children Education Allowance
  hostelAllowance: number;               // Hostel Allowance
  otherExemptions?: { [key: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.4 Section 16 Deductions (`Section16Deductions`)
```typescript
{
  employeeId: string;
  financialYear: string;
  standardDeduction: number;            // Always ₹50,000 for FY 2023-24 onwards
  professionalTax: number;
  entertainmentAllowance: number;
  otherDeductions?: { [key: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.5 Chapter VI-A Deductions (`ChapterVIA_Deductions`)
```typescript
{
  employeeId: string;
  financialYear: string;
  section80C: number;                   // Max ₹1,50,000 (Life Insurance, PPF, etc.)
  section80CCD1B: number;                // Max ₹50,000 (Additional NPS contribution)
  section80D: number;                   // Health Insurance
  section80TTA: number;                 // Savings Interest
  section80G: number;                   // Donations
  otherDeductions?: { [key: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.6 Other Income (`OtherIncome`)
```typescript
{
  employeeId: string;
  financialYear: string;
  savingsInterest: number;              // Interest from Savings Bank Account
  fdInterest: number;                   // Interest from Fixed Deposits
  otherIncome: number;                  // Other income sources
  otherIncomeDetails?: { [key: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.7 TDS Details (`TDSDetails`)
```typescript
{
  employeeId: string;
  financialYear: string;
  totalTdsDeducted: number;
  relief89: number;                     // Arrear relief under Section 89
  quarterlyBreakup?: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 2. Form 16 Computation Result (`Form16Computation`)

This is the calculated result that forms Part B of Form 16:

```typescript
{
  employeeId: string;
  financialYear: string;

  // Step-by-step computation
  grossSalary: number;                  // Sum of all salary components
  exemptionsSection10: number;          // Total exemptions under Section 10
  netSalary: number;                    // Gross Salary - Exemptions
  deductionsSection16: number;          // Standard deduction, professional tax, etc.
  incomeFromSalary: number;             // Net Salary - Section 16 Deductions
  otherIncome: number;                   // Interest, FD, etc.
  grossTotalIncome: number;              // Income from Salary + Other Income
  deductionsChapterVIA: number;          // Section 80C, 80D, etc.
  totalTaxableIncome: number;           // Gross Total Income - Chapter VI-A Deductions

  // Tax Calculation
  taxOnIncome: number;                  // Tax calculated based on slabs
  rebate87A: number;                    // Max ₹12,500 for income <= ₹5L
  taxAfterRebate: number;               // Tax - Rebate
  healthEducationCess: number;           // 4% of tax after rebate
  totalTaxLiability: number;            // Tax after rebate + Cess

  // Final
  relief89: number;                     // Relief under Section 89
  tdsDeducted: number;                   // Total TDS deducted
  taxPayable: number;                    // Positive = tax due, Negative = refund

  // Regime info
  taxRegime: 'OLD' | 'NEW';
  oldRegimeTax?: number;                 // For comparison
  newRegimeTax?: number;                 // For comparison

  computedAt: Timestamp;
}
```

---

## 3. Form 16 Document (`Form16Document`)

Complete Form 16 document structure:

```typescript
{
  id: string;
  employeeId: string;
  financialYear: string;
  employerName: string;
  employerTan: string;
  employerPan?: string;
  assessmentYear: string;

  // Part A (TDS Certificate)
  partA: {
    employeeName: string;
    employeePan: string;
    employeeDesignation: string;
    totalTdsDeducted: number;
    tdsDetails: TDSDetails;
  };

  // Part B (Annexure)
  partB: Form16Computation;

  // Metadata
  generatedBy: string;                   // User ID
  generatedAt: Timestamp;
  version: number;
  status: 'draft' | 'generated' | 'reviewed' | 'finalized';
  reviewedBy?: string;                   // CA User ID
  reviewedAt?: Timestamp;

  // Document URLs (for vault integration)
  pdfUrl?: string;
  encryptedPdfUrl?: string;
  shareCode?: string;
  accessLogs: Array<{
    accessedBy: string;
    accessedAt: Timestamp;
    action: 'viewed' | 'downloaded' | 'shared';
  }>;
}
```

---

## 4. Computation Flow

The Form 16 computation follows this step-by-step process:

### Step 1: Gross Salary
```
Gross Salary = Basic + HRA + DA + Special Allowance + LTA + Bonus + 
               Incentives + Arrears + Perquisites + Employer PF
```

### Step 2: Exemptions under Section 10
```
Exemptions = HRA Exempt + LTA Exempt + Children Education Allowance + 
             Hostel Allowance + Other Exemptions
```
**Note:** NEW regime disallows most exemptions (handled in Section 16)

### Step 3: Net Salary
```
Net Salary = Gross Salary - Exemptions Section 10
```

### Step 4: Deductions under Section 16
```
Section 16 Deductions = Standard Deduction (₹50,000) + Professional Tax + 
                        Entertainment Allowance + Other Deductions
```

### Step 5: Income from Salary
```
Income from Salary = Net Salary - Section 16 Deductions
```

### Step 6: Other Income
```
Other Income = Savings Interest + FD Interest + Other Income
```

### Step 7: Gross Total Income
```
Gross Total Income = Income from Salary + Other Income
```

### Step 8: Deductions under Chapter VI-A
```
Chapter VI-A Deductions = Section 80C + Section 80CCD(1B) + Section 80D + 
                          Section 80TTA + Section 80G + Other Deductions
```
**Note:** NEW regime only allows Section 80CCD(1B)

### Step 9: Total Taxable Income
```
Total Taxable Income = Gross Total Income - Chapter VI-A Deductions
```

### Step 10-12: Tax Calculation
```
Tax on Income = Calculated based on tax slabs (OLD/NEW regime)
Rebate 87A = Min(₹12,500, Tax) if income <= ₹5,00,000
Tax after Rebate = Tax - Rebate 87A
Health & Education Cess = 4% of Tax after Rebate
Total Tax Liability = Tax after Rebate + Cess
```

### Step 13: Relief under Section 89
```
Relief 89 = Arrear relief (if applicable)
```

### Step 14: TDS Deducted
```
TDS Deducted = Total TDS deducted during the year
```

### Step 15: Tax Payable/Refund
```
Tax Payable = Total Tax Liability - TDS Deducted - Relief 89
```
- **Positive value** = Tax due
- **Negative value** = Refund

---

## 5. Tax Regime Configuration

### Old Regime (FY 2024-25)
**Tax Slabs:**
- ₹0 - ₹2,50,000: 0%
- ₹2,50,001 - ₹5,00,000: 5%
- ₹5,00,001 - ₹10,00,000: 20%
- Above ₹10,00,000: 30%

**Surcharge:**
- Up to ₹50,00,000: 0%
- ₹50,00,001 - ₹1,00,00,000: 10%
- Above ₹1,00,00,000: 15%

**Cess:** 4% on tax + surcharge

### New Regime (FY 2024-25)
**Tax Slabs:**
- ₹0 - ₹3,00,000: 0%
- ₹3,00,001 - ₹7,00,000: 5%
- ₹7,00,001 - ₹10,00,000: 10%
- ₹10,00,001 - ₹12,00,000: 15%
- ₹12,00,001 - ₹15,00,000: 20%
- Above ₹15,00,000: 30%

**Surcharge:**
- Up to ₹30,00,000: 0%
- ₹30,00,001 - ₹50,00,000: 5%
- ₹50,00,001 - ₹1,00,00,000: 10%
- Above ₹1,00,00,000: 15%

**Cess:** 4% on tax + surcharge

### Rebate 87A
- **Maximum Amount:** ₹12,500
- **Income Limit:** ₹5,00,000
- Applies to both OLD and NEW regimes

---

## 6. PDF Structure

### Part A - TDS Certificate
1. **Header:** Form No. 16, Part A
2. **Certificate Details:**
   - Certificate No.
   - Last updated on
   - Valid From/To dates
3. **Deductor (Employer) Details:**
   - Name
   - TAN
   - Address
   - PAN
4. **Recipient (Employee) Details:**
   - Name
   - PAN
   - Address
   - Designation
5. **TDS Summary:**
   - Total Value of Purchase of Goods/Services
   - Total TDS Deducted
   - Total Collection
   - Total Refund

### Part B - Annexure
1. **Header:** Form No. 16, Part B (Annexure)
2. **Employer Details:**
   - Name, Address, TAN, PAN
   - Assessment Year
3. **Employee Details:**
   - Name, Address, PAN, Aadhaar
   - Designation
   - Period of Employment
4. **Salary Details (Section 7):**
   - Basic Salary, DA, HRA, LTA, Special Allowance
   - Bonus, Incentives, Arrears, Perquisites
   - Employer PF, Gratuity, Other Allowances
   - **Gross Salary (Total)**
5. **Exemptions Section 10 (Section 8):**
   - HRA, LTA, Children Education, Hostel Allowance
   - Transport, Medical, Other Exemptions
   - **Total Exemptions u/s 10**
6. **Income from Salaries (Section 9):**
   - Net Salary = Gross Salary - Exemptions
7. **Deductions Section 16 (Section 10):**
   - Standard Deduction u/s 16(ia)
   - Entertainment Allowance u/s 16(ii)
   - Professional Tax u/s 16(iii)
   - **Total Deductions u/s 16**
8. **Net Salary (Section 11):**
   - Income from Salaries - Section 16 Deductions
9. **Other Income (Section 12):**
   - Savings Interest, FD Interest, Other Income
   - **Total Other Income**
10. **Gross Total Income (Section 13):**
    - Net Salary + Other Income
11. **Chapter VI-A Deductions (Section 14):**
    - Section 80C, 80CCC, 80CCD(1), 80CCD(1B)
    - Section 80D, 80DD, 80DDB, 80E, 80EE/80EEA
    - Section 80G, 80TTA, 80TTB
    - **Total Deductions u/s VI-A**
12. **Total Taxable Income (Section 15):**
    - Gross Total Income - Chapter VI-A Deductions
13. **Tax Computation (Section 16):**
    - Tax on Total Income
    - Surcharge (if applicable)
    - Health & Education Cess @4%
    - **Total Tax Liability**
    - Rebate u/s 87A
    - **Tax after Rebate u/s 87A**
14. **TDS Details (Section 17):**
    - Total Tax Deducted
    - Tax Deposited
15. **Relief Section 89 (Section 18):**
    - Relief u/s 89
    - **Net Tax Payable/(Refund)**

---

## 7. API Endpoints

### Generate Form 16
- **Endpoint:** `POST /api/form-16/generate`
- **Request:** `Form16Request`
- **Response:** `Form16Response`

### Bulk Generate Form 16
- **Endpoint:** `POST /api/form-16/bulk-generate`
- **Request:** `BulkForm16Request`
- **Response:** `BulkForm16Response`

### Bulk Upload
- **Endpoint:** `POST /api/form-16/bulk-upload`
- **Request:** Excel/CSV file with employee data
- **Response:** Upload results

### Sample Template
- **Endpoint:** `GET /api/form-16/sample-template`
- **Response:** Excel template for bulk upload

---

## 8. Validation Rules

### PAN Validation
- **Pattern:** `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`
- Format: ABCDE1234F

### Deduction Limits
- **Section 80C:** Maximum ₹1,50,000
- **Section 80CCD(1B):** Maximum ₹50,000
- **Standard Deduction:** ₹50,000 (FY 2023-24 onwards)
- **Rebate 87A:** Maximum ₹12,500 (for income ≤ ₹5,00,000)

### Financial Year Consistency
All related documents (Salary Structure, Exemptions, Deductions, etc.) must have the same financial year.

---

## 9. Database Collections

The following Firestore collections are used:

1. **`employees`** - Employee Master Data
2. **`salaryStructures`** - Salary structure data
3. **`exemptions`** - Section 10 exemptions
4. **`section16Deductions`** - Section 16 deductions
5. **`chapterVIA_Deductions`** - Chapter VI-A deductions
6. **`otherIncome`** - Other income details
7. **`tdsDetails`** - TDS details
8. **`form16Documents`** - Generated Form 16 documents

---

## 10. Key Files

- **Models:** `src/lib/form-16-models.ts`
- **Computation Engine:** `src/lib/form-16-computation.ts`
- **PDF Generator:** `src/lib/form-16-pdf.ts`
- **API Routes:** `src/app/api/form-16/`
- **UI Component:** `src/app/(app)/income-tax/form-16/page.tsx`

---

## Notes

1. **Tax Regime:** The system supports both OLD and NEW tax regimes. NEW regime disallows most exemptions and deductions.

2. **Standard Deduction:** Fixed at ₹50,000 for financial years 2018-19 onwards.

3. **Rebate 87A:** Only applicable if total taxable income is ≤ ₹5,00,000.

4. **Relief 89:** Used for arrear relief calculations.

5. **PDF Generation:** Form 16 is generated as a 2-page PDF with Part A and Part B.

6. **Vault Integration:** Form 16 documents can be stored in the document vault with encryption and share codes.


