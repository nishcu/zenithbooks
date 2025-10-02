
// This file contains the business logic for generating the CMA report.

export interface FinancialData {
  [key: string]: number[];
}

export interface LoanAssumptions {
  type: "term-loan" | "od";
  amount: number;
  interestRate: number; // as percentage
  repaymentYears: number;
}

export interface GrowthAssumptions {
  revenueGrowth: number[];
  expenseChange: number[];
}

export interface FixedAsset {
    id: number;
    name: string;
    cost: number;
    depreciationRate: number; // as percentage
    additionYear: number; // 0 for existing, 1 for proj year 1, etc.
}

const formatValue = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.00';
    return (value / 100000).toFixed(2); // Convert to Lakhs
}

const formatRatio = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.00';
    return value.toFixed(2);
}

// Mock Data for 2 historical years
export const getInitialFinancials = (): FinancialData => ({
  // P&L Items
  netSales: [50000000, 60000000],
  otherOpIncome: [500000, 600000],
  rawMaterials: [25000000, 30000000],
  directWages: [5000000, 6000000],
  powerFuel: [1000000, 1200000],
  depreciation: [1500000, 1800000],
  adminSalary: [3000000, 3600000],
  rent: [1200000, 1200000],
  sellingExpenses: [2000000, 2400000],
  otherExpenses: [800000, 960000],
  interest: [1000000, 900000],
  tax: [1500000, 1800000],
  // Balance Sheet Items
  shareCapital: [10000000, 10000000],
  reservesSurplus: [5000000, 7000000],
  termLoan: [8000000, 6500000],
  unsecuredLoan: [2000000, 2000000],
  sundryCreditors: [4000000, 4800000],
  otherLiabilities: [1000000, 1200000],
  grossFixedAssets: [20000000, 22000000],
  accDepreciation: [3000000, 4800000],
  investments: [500000, 500000],
  inventory: [3000000, 3600000],
  sundryDebtors: [8000000, 9600000],
  cashBank: [1500000, 2600000],
  otherCurrentAssets: [500000, 600000],
});

export const generateCma = (
  initialData: FinancialData,
  numProjectedYears: number,
  assumptions: GrowthAssumptions,
  loan: LoanAssumptions,
  fixedAssets: FixedAsset[]
) => {
  const numTotalYears = 2 + numProjectedYears;
  const financials: FinancialData = JSON.parse(JSON.stringify(initialData));

  // --- Projection Logic ---

  // 1. Project P&L
  for (let i = 2; i < numTotalYears; i++) {
    const prevYear = i - 1;
    const revGrowth = assumptions.revenueGrowth[i - 2] / 100;
    const expChange = assumptions.expenseChange[i - 2] / 100;

    financials.netSales[i] = financials.netSales[prevYear] * (1 + revGrowth);
    financials.otherOpIncome[i] = financials.otherOpIncome[prevYear] * (1 + revGrowth);
    financials.rawMaterials[i] = financials.rawMaterials[prevYear] * (1 + expChange);
    financials.directWages[i] = financials.directWages[prevYear] * (1 + expChange);
    financials.powerFuel[i] = financials.powerFuel[prevYear] * (1 + expChange);
    financials.adminSalary[i] = financials.adminSalary[prevYear] * (1 + expChange);
    financials.rent[i] = financials.rent[prevYear] * (1 + expChange);
    financials.sellingExpenses[i] = financials.sellingExpenses[prevYear] * (1 + expChange);
    financials.otherExpenses[i] = financials.otherExpenses[prevYear] * (1 + expChange);

    // Depreciation needs to be calculated from fixed assets schedule
    let totalDepreciation = 0;
    let newAssetCost = 0;
    fixedAssets.forEach(asset => {
        // Calculate depreciation on existing balance of asset
        let currentCost = asset.cost;
        let openingWdv = currentCost;
        
        // Depreciate for past years
        for(let j=0; j < i - 1; j++) {
            if(asset.additionYear <= j) {
                openingWdv = openingWdv * (1 - asset.depreciationRate/100);
            }
        }
        
        if(asset.additionYear <= i) {
            totalDepreciation += openingWdv * (asset.depreciationRate / 100);
        }
        
        if(asset.additionYear === i) {
            newAssetCost += asset.cost;
        }
    });
    financials.depreciation[i] = totalDepreciation;
    
    const grossOpIncome = financials.netSales[i] + financials.otherOpIncome[i];
    const costOfSales = financials.rawMaterials[i] + financials.directWages[i] + financials.powerFuel[i];
    const pbdit = grossOpIncome - costOfSales - financials.adminSalary[i] - financials.rent[i] - financials.sellingExpenses[i] - financials.otherExpenses[i];
    const pbit = pbdit - financials.depreciation[i];

    // Interest calculation
    const openingTermLoan = financials.termLoan[prevYear] || 0;
    const annualRepayment = loan.type === 'term-loan' ? loan.amount / loan.repaymentYears : 0;
    const newLoanInterest = (i === 2) ? (loan.amount * loan.interestRate / 100) : ((loan.amount - annualRepayment * (i-2)) * loan.interestRate / 100);
    const oldLoanInterest = (openingTermLoan > 0) ? (openingTermLoan * 0.1) : 0; // Assume 10% on old loan
    financials.interest[i] = oldLoanInterest + newLoanInterest;

    const pbt = pbit - financials.interest[i];
    financials.tax[i] = pbt > 0 ? pbt * 0.3 : 0; // 30% tax rate
    const pat = pbt - financials.tax[i];

    // 2. Project Balance Sheet
    financials.shareCapital[i] = financials.shareCapital[prevYear];
    financials.reservesSurplus[i] = financials.reservesSurplus[prevYear] + pat;
    financials.unsecuredLoan[i] = financials.unsecuredLoan[prevYear];
    
    // Loan projections
    if (i === 2) {
        financials.termLoan[i] = financials.termLoan[prevYear] + loan.amount - (financials.termLoan[prevYear] > 0 ? 1500000 : 0);
    } else {
        const principalRepayment = (loan.type === 'term-loan') ? loan.amount / loan.repaymentYears : 0;
        financials.termLoan[i] = financials.termLoan[prevYear] - principalRepayment;
    }

    financials.sundryCreditors[i] = (financials.rawMaterials[i] / 12) * 2; // Assume 2 months credit
    financials.otherLiabilities[i] = financials.otherLiabilities[prevYear] * (1 + expChange);

    financials.grossFixedAssets[i] = financials.grossFixedAssets[prevYear] + newAssetCost;
    financials.accDepreciation[i] = financials.accDepreciation[prevYear] + financials.depreciation[i];

    financials.investments[i] = financials.investments[prevYear];
    financials.inventory[i] = (financials.rawMaterials[i] / 12) * 1.5; // Assume 1.5 months inventory
    financials.sundryDebtors[i] = (financials.netSales[i] / 12) * 2; // Assume 2 months credit
    financials.otherCurrentAssets[i] = financials.otherCurrentAssets[prevYear] * (1 + expChange);

    // Cash is balancing figure
    const totalLiabilities = financials.shareCapital[i] + financials.reservesSurplus[i] + financials.termLoan[i] + financials.unsecuredLoan[i] + financials.sundryCreditors[i] + financials.otherLiabilities[i];
    const netFixedAssets = financials.grossFixedAssets[i] - financials.accDepreciation[i];
    const otherAssetsTotal = netFixedAssets + financials.investments[i] + financials.inventory[i] + financials.sundryDebtors[i] + financials.otherCurrentAssets[i];
    financials.cashBank[i] = totalLiabilities - otherAssetsTotal;
  }

  // --- Formatting for Display ---
  const years = ["Audited FY-2", "Audited FY-1", ...Array.from({ length: numProjectedYears }, (_, i) => `Projected FY-${i + 1}`)];
  const headers = ["Particulars", ...years];

  // Operating Statement
  const operatingStatementBody = [
    ["Net Sales", ...financials.netSales.map(formatValue)],
    ["Other Operating Income", ...financials.otherOpIncome.map(formatValue)],
    ["Total Operating Income", ...financials.netSales.map((ns, i) => formatValue(ns + financials.otherOpIncome[i]))],
    ["Raw Materials Consumed", ...financials.rawMaterials.map(formatValue)],
    ["Direct Wages", ...financials.directWages.map(formatValue)],
    ["Power & Fuel", ...financials.powerFuel.map(formatValue)],
    ["Total Cost of Sales", ...financials.rawMaterials.map((rm, i) => formatValue(rm + financials.directWages[i] + financials.powerFuel[i]))],
    ["Gross Profit", ...financials.netSales.map((ns, i) => formatValue((ns + financials.otherOpIncome[i]) - (financials.rawMaterials[i] + financials.directWages[i] + financials.powerFuel[i])))],
    ["Administrative Salary", ...financials.adminSalary.map(formatValue)],
    ["Rent", ...financials.rent.map(formatValue)],
    ["Selling Expenses", ...financials.sellingExpenses.map(formatValue)],
    ["Other Expenses", ...financials.otherExpenses.map(formatValue)],
    ["PBDIT", ...financials.netSales.map((ns, i) => formatValue((ns + financials.otherOpIncome[i]) - (financials.rawMaterials[i] + financials.directWages[i] + financials.powerFuel[i]) - financials.adminSalary[i] - financials.rent[i] - financials.sellingExpenses[i] - financials.otherExpenses[i]))],
    ["Depreciation", ...financials.depreciation.map(formatValue)],
    ["PBIT", ...financials.netSales.map((ns, i) => formatValue((ns + financials.otherOpIncome[i]) - (financials.rawMaterials[i] + financials.directWages[i] + financials.powerFuel[i]) - financials.adminSalary[i] - financials.rent[i] - financials.sellingExpenses[i] - financials.otherExpenses[i] - financials.depreciation[i]))],
    ["Interest", ...financials.interest.map(formatValue)],
    ["PBT", ...financials.netSales.map((ns, i) => formatValue((ns + financials.otherOpIncome[i]) - (financials.rawMaterials[i] + financials.directWages[i] + financials.powerFuel[i]) - financials.adminSalary[i] - financials.rent[i] - financials.sellingExpenses[i] - financials.otherExpenses[i] - financials.depreciation[i] - financials.interest[i]))],
    ["Tax", ...financials.tax.map(formatValue)],
    ["PAT", ...financials.netSales.map((ns, i) => formatValue((ns + financials.otherOpIncome[i]) - (financials.rawMaterials[i] + financials.directWages[i] + financials.powerFuel[i]) - financials.adminSalary[i] - financials.rent[i] - financials.sellingExpenses[i] - financials.otherExpenses[i] - financials.depreciation[i] - financials.interest[i] - financials.tax[i]))],
  ];

  // Balance Sheet
  const netWorth = financials.shareCapital.map((sc, i) => sc + financials.reservesSurplus[i]);
  const totalDebt = financials.termLoan.map((tl, i) => tl + financials.unsecuredLoan[i]);
  const totalOutsideLiabilities = totalDebt.map((td, i) => td + financials.sundryCreditors[i] + financials.otherLiabilities[i]);
  const totalLiabilities = netWorth.map((nw, i) => nw + totalOutsideLiabilities[i]);
  const netFixedAssets = financials.grossFixedAssets.map((gfa, i) => gfa - financials.accDepreciation[i]);
  const currentAssets = financials.inventory.map((inv, i) => inv + financials.sundryDebtors[i] + financials.cashBank[i] + financials.otherCurrentAssets[i]);
  const currentLiabilities = financials.sundryCreditors.map((sc, i) => sc + financials.otherLiabilities[i]);
  const workingCapitalGap = currentAssets.map((ca, i) => ca - currentLiabilities[i]);
  const totalAssets = netFixedAssets.map((nfa, i) => nfa + financials.investments[i] + currentAssets[i]);

  const balanceSheetBody = [
    ["LIABILITIES", ...Array(numTotalYears).fill("")],
    ["Share Capital", ...financials.shareCapital.map(formatValue)],
    ["Reserves & Surplus", ...financials.reservesSurplus.map(formatValue)],
    ["Net Worth", ...netWorth.map(formatValue)],
    ["Term Loan", ...financials.termLoan.map(formatValue)],
    ["Unsecured Loan", ...financials.unsecuredLoan.map(formatValue)],
    ["Total Debt", ...totalDebt.map(formatValue)],
    ["Sundry Creditors", ...financials.sundryCreditors.map(formatValue)],
    ["Other Liabilities", ...financials.otherLiabilities.map(formatValue)],
    ["Total Outside Liabilities", ...totalOutsideLiabilities.map(formatValue)],
    ["Total Liabilities & Equity", ...totalLiabilities.map(formatValue)],
    ["ASSETS", ...Array(numTotalYears).fill("")],
    ["Gross Fixed Assets", ...financials.grossFixedAssets.map(formatValue)],
    ["Accumulated Depreciation", ...financials.accDepreciation.map(formatValue)],
    ["Net Fixed Assets", ...netFixedAssets.map(formatValue)],
    ["Investments", ...financials.investments.map(formatValue)],
    ["Inventory", ...financials.inventory.map(formatValue)],
    ["Sundry Debtors", ...financials.sundryDebtors.map(formatValue)],
    ["Cash & Bank", ...financials.cashBank.map(formatValue)],
    ["Other Current Assets", ...financials.otherCurrentAssets.map(formatValue)],
    ["Total Current Assets", ...currentAssets.map(formatValue)],
    ["Total Assets", ...totalAssets.map(formatValue)],
  ];

  // Ratio Analysis
  const ratioAnalysisBody = [
    ["Current Ratio", ...currentAssets.map((ca, i) => formatRatio(ca / currentLiabilities[i]))],
    ["Quick Ratio", ...currentAssets.map((ca, i) => formatRatio((ca - financials.inventory[i]) / currentLiabilities[i]))],
    ["Debt-Equity Ratio", ...totalDebt.map((td, i) => formatRatio(td / netWorth[i]))],
    ["TOL/TNW", ...totalOutsideLiabilities.map((tol, i) => formatRatio(tol / netWorth[i]))],
    ["Net Sales / Total Assets", ...financials.netSales.map((ns, i) => formatRatio(ns / totalAssets[i]))],
    ["PBT / Net Sales (%)", ...financials.netSales.map((ns, i) => formatRatio((operatingStatementBody[16][i+1] as number * 100000) / ns * 100))],
    ["PAT / Net Sales (%)", ...financials.netSales.map((ns, i) => formatRatio((operatingStatementBody[18][i+1] as number * 100000) / ns * 100))],
    ["ROCE (%)", ...netWorth.map((nw, i) => formatRatio(((operatingStatementBody[14][i+1] as number * 100000) / (nw + totalDebt[i])) * 100))],
    ["DSCR", ...financials.netSales.map((ns, i) => {
        const pat = operatingStatementBody[18][i+1] as number * 100000;
        const interest = financials.interest[i];
        const dep = financials.depreciation[i];
        const principalRepayment = loan.type === 'term-loan' && i > 1 ? (loan.amount / loan.repaymentYears) : 0;
        const denominator = interest + principalRepayment;
        return denominator > 0 ? formatRatio((pat + interest + dep) / denominator) : 'N/A';
    })],
  ];
  
  // Cash Flow
  const cfo = Array(numTotalYears).fill(0);
  const cfi = Array(numTotalYears).fill(0);
  const cff = Array(numTotalYears).fill(0);
  const openingCash = [0, ...financials.cashBank.slice(0, -1)];
  for(let i=1; i<numTotalYears; i++) {
      const pat = (operatingStatementBody[18][i+1] as number * 100000) - (operatingStatementBody[18][i] as number * 100000)
      const dep = financials.depreciation[i];
      const changeInDebtors = financials.sundryDebtors[i] - financials.sundryDebtors[i-1];
      const changeInInventory = financials.inventory[i] - financials.inventory[i-1];
      const changeInCreditors = financials.sundryCreditors[i] - financials.sundryCreditors[i-1];
      cfo[i] = pat + dep - changeInDebtors - changeInInventory + changeInCreditors;

      const changeInGFA = financials.grossFixedAssets[i] - financials.grossFixedAssets[i-1];
      cfi[i] = -changeInGFA;

      const changeInTermLoan = financials.termLoan[i] - financials.termLoan[i-1];
      cff[i] = changeInTermLoan;
  }
  const netCashFlow = cfo.map((c, i) => c + cfi[i] + cff[i]);
  const closingCash = openingCash.map((oc, i) => oc + netCashFlow[i]);

  const cashFlowBody = [
      ["A. Cash Flow from Operations", ...cfo.map(formatValue)],
      ["B. Cash Flow from Investing", ...cfi.map(formatValue)],
      ["C. Cash Flow from Financing", ...cff.map(formatValue)],
      ["Net Change in Cash", ...netCashFlow.map(formatValue)],
      ["Opening Cash & Bank", ...openingCash.map(formatValue)],
      ["Closing Cash & Bank", ...closingCash.map(formatValue)],
  ];
  
  // Fund Flow
  const sources = Array(numTotalYears-1).fill(0);
  const uses = Array(numTotalYears-1).fill(0);
  for(let i=1; i<numTotalYears; i++) {
      sources[i-1] += (financials.reservesSurplus[i] - financials.reservesSurplus[i-1]); // PAT
      sources[i-1] += financials.depreciation[i];
      const termLoanChange = financials.termLoan[i] - financials.termLoan[i-1];
      if(termLoanChange > 0) sources[i-1] += termLoanChange; else uses[i-1] -= termLoanChange;
      
      const gfaChange = financials.grossFixedAssets[i] - financials.grossFixedAssets[i-1];
      uses[i-1] += gfaChange;
      uses[i-1] += workingCapitalGap[i] - workingCapitalGap[i-1];
  }
  const fundFlowBody = [
      ["SOURCES", ...Array(numTotalYears-1).fill("")],
      ["Profit After Tax", ...sources.map(formatValue)],
      ["Depreciation", ...financials.depreciation.slice(1).map(formatValue)],
      ["Increase in Term Loan", ...Array(numTotalYears-1).fill(0).map((_, i) => formatValue(Math.max(0, financials.termLoan[i+1] - financials.termLoan[i])))],
      ["TOTAL SOURCES", ...sources.map(formatValue)],
      ["USES", ...Array(numTotalYears-1).fill("")],
      ["Purchase of Fixed Assets", ...Array(numTotalYears-1).fill(0).map((_, i) => formatValue(financials.grossFixedAssets[i+1] - financials.grossFixedAssets[i]))],
      ["Increase in Working Capital", ...Array(numTotalYears-1).fill(0).map((_, i) => formatValue(workingCapitalGap[i+1] - workingCapitalGap[i]))],
      ["Repayment of Term Loan", ...Array(numTotalYears-1).fill(0).map((_, i) => formatValue(Math.max(0, financials.termLoan[i] - financials.termLoan[i+1])))],
      ["TOTAL USES", ...uses.map(formatValue)]
  ];

  // MPBF
  const mpbfMethod1 = workingCapitalGap.map(w => w * 0.75);
  const mpbfMethod2 = currentAssets.map((ca, i) => (ca * 0.75) - currentLiabilities[i]);
  const assessedBankFinance = mpbfMethod1.map((m1, i) => Math.min(m1, mpbfMethod2[i]));
  const mpbfBody = [
      ["Total Current Assets (TCA)", ...currentAssets.map(formatValue)],
      ["Other Current Liabilities (OCL)", ...currentLiabilities.map(formatValue)],
      ["Working Capital Gap (WCG = TCA - OCL)", ...workingCapitalGap.map(formatValue)],
      ["Method I: 75% of WCG", ...mpbfMethod1.map(formatValue)],
      ["Method II: 75% of TCA - OCL", ...mpbfMethod2.map(formatValue)],
      ["Assessed Bank Finance (Lower of I & II)", ...assessedBankFinance.map(formatValue)],
  ];

  // Loan Repayment
  const repaymentScheduleBody: (string | number)[][] = [];
  if (loan.type === 'term-loan' && loan.repaymentYears > 0) {
    const r = loan.interestRate / 100 / 12;
    const n = loan.repaymentYears * 12;
    const emi = n > 0 ? (loan.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0;
    let balance = loan.amount;
    for (let j = 1; j <= n; j++) {
        const interest = balance * r;
        const principal = emi - interest;
        balance -= principal;
        repaymentScheduleBody.push([j, formatValue(emi), formatValue(principal), formatValue(interest), formatValue(balance)]);
    }
  }


  return {
    operatingStatement: { headers, body: operatingStatementBody },
    balanceSheet: { headers, body: balanceSheetBody },
    cashFlow: { headers, body: cashFlowBody },
    ratioAnalysis: { headers, body: ratioAnalysisBody },
    fundFlow: { headers: ["Particulars", ...years.slice(1)], body: fundFlowBody },
    mpbf: { headers, body: mpbfBody },
    repaymentSchedule: { headers: ["Month", "EMI", "Principal", "Interest", "Outstanding Balance"], body: repaymentScheduleBody },
  };
};
