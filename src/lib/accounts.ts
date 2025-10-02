
export const allAccounts = [
  // ASSETS
  // Fixed Assets (1000-1199)
  { code: "1010", name: "Land & Buildings", type: "Fixed Asset" },
  { code: "1020", name: "Plant & Machinery", type: "Fixed Asset" },
  { code: "1030", name: "Office Equipment", type: "Fixed Asset" },
  { code: "1040", name: "Computers & Laptops", type: "Fixed Asset" },
  { code: "1050", name: "Furniture & Fixtures", type: "Fixed Asset" },
  { code: "1060", name: "Vehicles", type: "Fixed Asset" },
  { code: "1090", name: "Accumulated Depreciation", type: "Fixed Asset" }, // Contra Asset

  // Investments (1200-1299)
  { code: "1210", name: "Investment in Mutual Funds", type: "Investment" },
  { code: "1220", name: "Investment in Shares", type: "Investment" },
  
  // Current Assets (1300-1999)
  { code: "1310", name: "Inventory", type: "Current Asset" },
  { code: "1320", name: "Accounts Receivable / Sundry Debtors", type: "Current Asset" },
  
  // Loans & Advances (Asset)
  { code: "1410", name: "Loans to Employees", type: "Current Asset" },
  { code: "1420", name: "Advances to Suppliers", type: "Current Asset" },
  { code: "1450", name: "Prepaid Expenses", type: "Current Asset" },
  { code: "1460", name: "TDS Receivable", type: "Current Asset" },
  { code: "1470", name: "TCS Receivable", type: "Current Asset" },
  
  // Cash & Bank
  { code: "1510", name: "Cash on Hand", type: "Cash" },
  { code: "1520", name: "HDFC Bank", type: "Bank" },
  { code: "1521", name: "ICICI Bank", type: "Bank" },
  { code: "1522", name: "SBI Bank", type: "Bank" },

  // LIABILITIES & EQUITY
  // Equity (2000-2199)
  { code: "2010", name: "Owner's Equity / Share Capital", type: "Equity" },
  { code: "2020", name: "Reserves & Surplus", type: "Equity" },
  { code: "2030", name: "Retained Earnings", type: "Equity" },
  { code: "2040", name: "Drawings", type: "Equity" },

  // Loans (Liability) (2200-2399)
  { code: "2210", name: "Secured Term Loan", type: "Long Term Liability" },
  { code: "2220", name: "Unsecured Loan from Directors", type: "Long Term Liability" },
  { code: "2230", name: "Bank Overdraft / Cash Credit", type: "Current Liability" },
  
  // Current Liabilities (2400-2999)
  { code: "2410", name: "Accounts Payable / Sundry Creditors", type: "Current Liability" },
  { code: "2420", name: "Duties & Taxes Payable", type: "Current Liability" },
  { code: "2421", name: "GST Payable", type: "Current Liability" },
  { code: "2110", name: "GST Payable", type: "Current Liability" }, // Duplicate for legacy, should be 2421
  { code: "2422", name: "TDS Payable", type: "Current Liability" },
  { code: "2130", name: "TDS Payable", type: "Current Liability" }, // Duplicate for legacy, should be 2422
  { code: "2423", name: "TCS Payable", type: "Current Liability" },
  { code: "2120", name: "TCS Payable", type: "Current Liability" }, // Duplicate for legacy, should be 2423
  { code: "2430", name: "Expenses Payable", type: "Current Liability" },
  { code: "2440", name: "Advances from Customers", type: "Current Liability" },

  // REVENUE
  // Sales (4000-4499)
  { code: "4010", name: "Sales Revenue", type: "Revenue" },
  { code: "4020", name: "Service Revenue", type: "Revenue" },
  { code: "4030", name: "Sales Returns", type: "Revenue" }, // Contra Revenue

  // Other Income (4500-4999)
  { code: "4510", name: "Interest Income", type: "Other Income" },
  { code: "4520", name: "Dividend Income", type: "Other Income" },
  { code: "4530", name: "Commission Received", type: "Other Income" },

  // EXPENSES
  // Direct Expenses / COGS (5000-5499)
  { code: "5010", name: "Purchases - COGS", type: "Cost of Goods Sold" },
  { code: "5020", name: "Salaries and Wages - COGS", type: "Cost of Goods Sold" },
  { code: "5030", name: "Carriage Inwards", type: "Cost of Goods Sold" },
  { code: "5040", name: "Power & Fuel", type: "Cost of Goods Sold" },
  { code: "5050", name: "Purchases", type: "Cost of Goods Sold" }, // General Purchases

  // Indirect Expenses (6000-6999)
  { code: "6010", name: "Salaries and Wages - Indirect", type: "Expense" },
  { code: "6020", name: "Rent Expense", type: "Expense" },
  { code: "6030", name: "Office Maintenance", type: "Expense" },
  { code: "6040", name: "Printing & Stationery", type: "Expense" },
  { code: "6050", name: "Telephone & Internet", type: "Expense" },
  { code: "6060", name: "Legal & Professional Fees", type: "Expense" },
  { code: "6070", name: "Bank Charges", type: "Expense" },
  { code: "6080", name: "Advertising & Marketing", type: "Expense" },
  { code: "6090", name: "Travel & Conveyance", type: "Expense" },
  { code: "6100", name: "Depreciation Expense", type: "Expense" },
  { code: "6110", name: "Insurance Expense", type: "Expense" },
  { code: "6120", name: "Miscellaneous Expenses", type: "Expense" },
  { code: "6130", name: "Repairs & Maintenance", type: "Expense" },
  { code: "6140", name: "Electricity & Water", type: "Expense" },
  { code: "6150", name: "Staff Welfare", type: "Expense" },
  { code: "6160", name: "Recruitment Expenses", type: "Expense" },
  { code: "6170", name: "Subscription & Periodicals", type: "Expense" },
  { code: "6180", name: "Donations & Charity", type: "Expense" },
  { code: "6190", name: "Rates & Taxes", type: "Expense" },
  { code: "6200", name: "Postage & Courier", type: "Expense" },
  { code: "6210", name: "Vehicle Maintenance", type: "Expense" },
  { code: "6220", name: "IT & Software Expenses", type: "Expense" },
  { code: "6230", name: "Training & Development", type: "Expense" },
  { code: "6240", name: "Audit Fees", type: "Expense" },
  { code: "6250", name: "Commission to Sales Agents", type: "Expense" },
  { code: "6260", name: "Freight & Cartage Outward", type: "Expense" },
  { code: "6270", name: "Bad Debts", type: "Expense" },
  { code: "6280", name: "Loss on Sale of Assets", type: "Expense" },
  { code: "6290", name: "Office Refreshments", type: "Expense" },
  { code: "6300", name: "Security Expenses", type: "Expense" },
  { code: "6310", name: "Website Expenses", type: "Expense" },
  { code: "6320", name: "Business Promotion", type: "Expense" }
];

export const costCentres = [
  { id: "cc-sales", name: "Sales Department" },
  { id: "cc-marketing", name: "Marketing Department" },
  { id: "cc-admin", name: "Administration" },
  { id: "cc-proj-alpha", name: "Project Alpha" },
];
