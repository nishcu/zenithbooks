/**
 * Smart Journal Entry Engine - Constants
 * Chart of Accounts, Keywords, GST Rules
 */

import type { ChartOfAccount, GSTConfig } from "./types";

/**
 * Default Chart of Accounts
 * In production, this would come from database
 */
export const DEFAULT_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // Assets
  { code: "1001", name: "Cash", type: "Asset", keywords: ["cash", "money", "currency"] },
  { code: "1002", name: "Bank Account - HDFC", type: "Asset", keywords: ["bank", "hdfc", "account"] },
  { code: "1003", name: "Bank Account - SBI", type: "Asset", keywords: ["bank", "sbi", "account"] },
  { code: "1004", name: "UPI Payments", type: "Asset", keywords: ["upi", "phonepe", "gpay", "paytm"] },
  { code: "1005", name: "Prepaid Expenses", type: "Asset", keywords: ["prepaid", "advance expense", "advance payment"] },
  { code: "1006", name: "Prepaid Rent", type: "Asset", keywords: ["prepaid rent", "advance rent", "rent advance"] },
  { code: "1007", name: "Prepaid Insurance", type: "Asset", keywords: ["prepaid insurance", "advance insurance"] },
  { code: "1008", name: "Prepaid Salary", type: "Asset", keywords: ["prepaid salary", "advance salary", "salary advance"] },
  { code: "1009", name: "Other Prepaid Expenses", type: "Asset", keywords: ["prepaid", "advance"] },
  
  // Expenses
  { code: "5001", name: "Office Expenses", type: "Expense", keywords: ["office", "stationery", "supplies"] },
  { code: "5002", name: "Travel Expenses", type: "Expense", keywords: ["travel", "taxi", "uber", "fuel", "petrol", "diesel"] },
  { code: "5003", name: "Telephone Expenses", type: "Expense", keywords: ["phone", "telephone", "mobile", "internet"] },
  { code: "5004", name: "Electricity Expenses", type: "Expense", keywords: ["electricity", "power", "bill"] },
  { code: "5005", name: "Rent Expenses", type: "Expense", keywords: ["rent", "rental", "lease"] },
  { code: "5006", name: "Professional Fees", type: "Expense", keywords: ["professional", "fees", "consultant", "advocate", "lawyer"] },
  { code: "5007", name: "Purchase of Goods", type: "Expense", keywords: ["purchase", "bought", "bought", "goods", "material"] },
  { code: "5008", name: "Advertisement Expenses", type: "Expense", keywords: ["advertisement", "advertising", "marketing", "promotion"] },
  { code: "5009", name: "Repairs & Maintenance", type: "Expense", keywords: ["repair", "maintenance", "service"] },
  
  // Income
  { code: "4001", name: "Sales", type: "Income", keywords: ["sale", "sold", "revenue", "income"] },
  { code: "4002", name: "Service Income", type: "Income", keywords: ["service", "fees", "consulting"] },
  { code: "4003", name: "Interest Income", type: "Income", keywords: ["interest", "dividend"] },
  
  // Liabilities
  { code: "2001", name: "Sundry Creditors", type: "Liability", keywords: ["creditor", "supplier", "vendor", "payable"] },
  { code: "2002", name: "Sundry Debtors", type: "Liability", keywords: ["debtor", "customer", "client", "receivable"] },
  { code: "2003", name: "Outstanding Expenses", type: "Liability", keywords: ["outstanding", "accrued", "accrued expense", "payable expense"] },
  { code: "2004", name: "Outstanding Rent", type: "Liability", keywords: ["outstanding rent", "accrued rent", "rent payable"] },
  { code: "2005", name: "Outstanding Salary", type: "Liability", keywords: ["outstanding salary", "accrued salary", "salary payable"] },
  { code: "2006", name: "Other Outstanding Expenses", type: "Liability", keywords: ["outstanding", "accrued"] },
  
  // GST Accounts
  { code: "3001", name: "Input CGST", type: "Asset", keywords: ["input cgst"], gstAccount: true },
  { code: "3002", name: "Input SGST", type: "Asset", keywords: ["input sgst"], gstAccount: true },
  { code: "3003", name: "Input IGST", type: "Asset", keywords: ["input igst"], gstAccount: true },
  { code: "3004", name: "Output CGST", type: "Liability", keywords: ["output cgst"], gstAccount: true },
  { code: "3005", name: "Output SGST", type: "Liability", keywords: ["output sgst"], gstAccount: true },
  { code: "3006", name: "Output IGST", type: "Liability", keywords: ["output igst"], gstAccount: true },
  { code: "3007", name: "RCM CGST", type: "Asset", keywords: ["rcm cgst"], gstAccount: true },
  { code: "3008", name: "RCM SGST", type: "Asset", keywords: ["rcm sgst"], gstAccount: true },
  { code: "3009", name: "RCM IGST", type: "Asset", keywords: ["rcm igst"], gstAccount: true },
];

/**
 * GST Rates (as of 2024-25)
 */
export const GST_RATES = {
  NIL: 0,
  EXEMPT: 0,
  "0.25": 0.25,
  "3": 3,
  "5": 5,
  "12": 12,
  "18": 18,
  "28": 28,
} as const;

/**
 * Common GST keywords
 */
export const GST_KEYWORDS = {
  inclusive: ["inclusive", "incl", "including", "with gst", "gst included"],
  exclusive: ["exclusive", "excl", "excluding", "without gst", "gst extra"],
  rates: ["5%", "12%", "18%", "28%", "gst 5", "gst 12", "gst 18", "gst 28"],
  cgst_sgst: ["cgst", "sgst", "intra", "within state", "same state"],
  igst: ["igst", "inter", "interstate", "different state", "other state"],
  rcm: ["rcm", "reverse charge", "reverse charge mechanism", "advocate", "gta", "transport"],
} as const;

/**
 * RCM Services (Reverse Charge Mechanism)
 */
export const RCM_SERVICES = [
  "advocate",
  "lawyer",
  "legal",
  "gta", // Goods Transport Agency
  "transport",
  "freight",
  "director",
  "security",
  "sponsorship",
];

/**
 * Blocked Credits (ITC not available)
 */
export const BLOCKED_CREDITS = [
  "motor vehicle",
  "food",
  "beauty treatment",
  "health",
  "membership",
  "club",
  "travel",
  "employee",
];

/**
 * Default GST Configuration
 */
export const DEFAULT_GST_CONFIG: GSTConfig = {
  businessState: "MH", // Maharashtra
  compositionScheme: false,
  blockedCredits: BLOCKED_CREDITS,
  defaultGSTRates: {
    goods: 18,
    services: 18,
  },
  rcmServices: RCM_SERVICES,
};

/**
 * Indian States for GST
 */
export const INDIAN_STATES: Record<string, string> = {
  "MH": "Maharashtra",
  "DL": "Delhi",
  "KA": "Karnataka",
  "TN": "Tamil Nadu",
  "GJ": "Gujarat",
  "RJ": "Rajasthan",
  "UP": "Uttar Pradesh",
  "WB": "West Bengal",
  "AP": "Andhra Pradesh",
  "TS": "Telangana",
  "KL": "Kerala",
  "PB": "Punjab",
  "HR": "Haryana",
  "MP": "Madhya Pradesh",
  "OR": "Odisha",
  "BH": "Bihar",
  "AS": "Assam",
  "JK": "Jammu and Kashmir",
  "HP": "Himachal Pradesh",
  "UT": "Uttarakhand",
  "CH": "Chhattisgarh",
  "JH": "Jharkhand",
  "GA": "Goa",
  "MN": "Manipur",
  "ML": "Meghalaya",
  "MZ": "Mizoram",
  "NL": "Nagaland",
  "SK": "Sikkim",
  "TR": "Tripura",
  "AN": "Andaman and Nicobar",
  "LD": "Lakshadweep",
  "DN": "Dadra and Nagar Haveli",
  "DD": "Daman and Diu",
  "PY": "Puducherry",
};
