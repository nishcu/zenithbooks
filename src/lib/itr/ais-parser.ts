/**
 * AIS (Annual Information Statement) JSON Parser
 * Parses AIS JSON structure from Income Tax Portal
 */

interface AISData {
  pan: string;
  financialYear: string;
  incomes: {
    salary?: Array<{
      employerName: string;
      employerTAN: string;
      grossSalary: number;
      tds: number;
      financialYear: string;
    }>;
    interest?: Array<{
      bankName: string;
      accountNumber: string;
      interestAmount: number;
      tds: number;
    }>;
    dividend?: Array<{
      companyName: string;
      dividendAmount: number;
      tds: number;
    }>;
    otherIncome?: Array<{
      source: string;
      amount: number;
      tds?: number;
    }>;
  };
  tds: {
    totalTDS: number;
    details: Array<{
      deductorName: string;
      deductorTAN: string;
      amount: number;
      section: string;
    }>;
  };
  tcs: {
    totalTCS: number;
    details: Array<{
      collectorName: string;
      amount: number;
    }>;
  };
}

interface ParsedAIS {
  totalIncome: number;
  salaryIncome: number;
  interestIncome: number;
  dividendIncome: number;
  otherIncome: number;
  totalTDS: number;
  totalTCS: number;
  incomeDetails: {
    salary: Array<{
      employerName: string;
      employerTAN: string;
      grossSalary: number;
      tds: number;
    }>;
    interest: Array<{
      bankName: string;
      interestAmount: number;
      tds: number;
    }>;
    dividend: Array<{
      companyName: string;
      dividendAmount: number;
      tds: number;
    }>;
    other: Array<{
      source: string;
      amount: number;
      tds?: number;
    }>;
  };
  tdsDetails: Array<{
    deductorName: string;
    deductorTAN: string;
    amount: number;
    section: string;
  }>;
}

/**
 * Parse AIS JSON data
 */
export function parseAISJSON(aisJson: any): ParsedAIS {
  try {
    const data: AISData = aisJson;

    // Extract salary income
    const salaryIncome = data.incomes?.salary?.reduce((sum, item) => sum + (item.grossSalary || 0), 0) || 0;
    const salaryDetails = data.incomes?.salary?.map(item => ({
      employerName: item.employerName || 'Unknown',
      employerTAN: item.employerTAN || '',
      grossSalary: item.grossSalary || 0,
      tds: item.tds || 0,
    })) || [];

    // Extract interest income
    const interestIncome = data.incomes?.interest?.reduce((sum, item) => sum + (item.interestAmount || 0), 0) || 0;
    const interestDetails = data.incomes?.interest?.map(item => ({
      bankName: item.bankName || 'Unknown Bank',
      interestAmount: item.interestAmount || 0,
      tds: item.tds || 0,
    })) || [];

    // Extract dividend income
    const dividendIncome = data.incomes?.dividend?.reduce((sum, item) => sum + (item.dividendAmount || 0), 0) || 0;
    const dividendDetails = data.incomes?.dividend?.map(item => ({
      companyName: item.companyName || 'Unknown',
      dividendAmount: item.dividendAmount || 0,
      tds: item.tds || 0,
    })) || [];

    // Extract other income
    const otherIncome = data.incomes?.otherIncome?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const otherDetails = data.incomes?.otherIncome?.map(item => ({
      source: item.source || 'Other',
      amount: item.amount || 0,
      tds: item.tds,
    })) || [];

    // Calculate total income
    const totalIncome = salaryIncome + interestIncome + dividendIncome + otherIncome;

    // Extract TDS details
    const totalTDS = data.tds?.totalTDS || data.tds?.details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const tdsDetails = data.tds?.details?.map(item => ({
      deductorName: item.deductorName || 'Unknown',
      deductorTAN: item.deductorTAN || '',
      amount: item.amount || 0,
      section: item.section || '',
    })) || [];

    // Extract TCS
    const totalTCS = data.tcs?.totalTCS || data.tcs?.details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

    return {
      totalIncome,
      salaryIncome,
      interestIncome,
      dividendIncome,
      otherIncome,
      totalTDS,
      totalTCS,
      incomeDetails: {
        salary: salaryDetails,
        interest: interestDetails,
        dividend: dividendDetails,
        other: otherDetails,
      },
      tdsDetails,
    };
  } catch (error: any) {
    console.error('AIS parsing error:', error);
    throw new Error(`Failed to parse AIS JSON: ${error.message}`);
  }
}

/**
 * Load and parse AIS JSON from Firebase Storage URL
 */
export async function loadAndParseAIS(fileUrl: string): Promise<ParsedAIS> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch AIS file: ${response.statusText}`);
    }
    const jsonData = await response.json();
    return parseAISJSON(jsonData);
  } catch (error: any) {
    console.error('Error loading AIS file:', error);
    throw new Error(`Failed to load AIS file: ${error.message}`);
  }
}

