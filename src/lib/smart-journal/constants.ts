/**
 * Smart Journal Entry Engine - Constants
 * Chart of Accounts, Keywords, GST Rules
 */

import type { ChartOfAccount, GSTConfig } from "./types";

/**
 * Default Chart of Accounts with elaborated keyword base for Smart Entry.
 * Keywords cover: plain English, Rs/₹, common phrases, synonyms, abbreviations.
 * In production, this can be merged with database chart of accounts.
 */
export const DEFAULT_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // ---- ASSETS ----
  { code: "1001", name: "Cash", type: "Asset", keywords: ["cash", "money", "currency", "in cash", "by cash", "cash payment"] },
  { code: "1510", name: "Cash on Hand", type: "Cash", keywords: ["cash", "money", "currency", "in cash", "by cash", "cash payment"] },
  { code: "1002", name: "Bank Account - HDFC", type: "Asset", keywords: ["bank", "hdfc", "account", "hdfc bank", "neft", "rtgs", "imps", "cheque", "check"] },
  { code: "1003", name: "Bank Account - SBI", type: "Asset", keywords: ["bank", "sbi", "account", "sbi bank"] },
  { code: "1520", name: "HDFC Bank", type: "Asset", keywords: ["hdfc", "hdfc bank"] },
  { code: "1521", name: "ICICI Bank", type: "Asset", keywords: ["icici", "icici bank"] },
  { code: "1522", name: "SBI Bank", type: "Asset", keywords: ["sbi", "sbi bank"] },
  { code: "1004", name: "UPI Payments", type: "Asset", keywords: ["upi", "phonepe", "gpay", "paytm", "bhim", "upi payment", "through upi"] },
  { code: "1005", name: "Prepaid Expenses", type: "Asset", keywords: ["prepaid", "advance expense", "advance payment", "paid in advance", "advance for expense"] },
  { code: "1006", name: "Prepaid Rent", type: "Asset", keywords: ["prepaid rent", "advance rent", "rent advance", "rent paid in advance", "advance for rent"] },
  { code: "1007", name: "Prepaid Insurance", type: "Asset", keywords: ["prepaid insurance", "advance insurance", "insurance advance"] },
  { code: "1008", name: "Prepaid Salary", type: "Asset", keywords: ["prepaid salary", "advance salary", "salary advance", "salary paid in advance", "advance to employee"] },
  { code: "1009", name: "Other Prepaid Expenses", type: "Asset", keywords: ["prepaid", "advance"] },

  // ---- EXPENSES (elaborated keywords for accurate matching) ----
  { code: "5001", name: "Office Expenses", type: "Expense", keywords: ["office", "stationery", "stationary", "supplies", "pen", "pens", "paper", "notebook", "file", "folder", "staple", "ink", "printer", "copier", "office supplies", "general office", "office consumables", "office material", "printing", "xerox", "photocopy"] },
  { code: "6040", name: "Printing & Stationery", type: "Expense", keywords: ["printing", "stationery", "stationary", "print", "xerox", "photocopy", "letterhead", "visiting card", "business card"] },
  { code: "5002", name: "Travel Expenses", type: "Expense", keywords: ["travel", "travelling", "taxi", "cab", "uber", "ola", "fuel", "petrol", "diesel", "conveyance", "business trip", "travel allowance", "ta da", "ta/da", "lodging", "hotel", "outstation", "toll", "parking"] },
  { code: "6090", name: "Travel & Conveyance", type: "Expense", keywords: ["travel", "conveyance", "taxi", "cab", "fuel", "petrol", "diesel", "ta da", "travel allowance"] },
  { code: "5003", name: "Telephone Expenses", type: "Expense", keywords: ["phone", "telephone", "mobile", "mobile bill", "internet", "broadband", "wifi", "wifi bill", "data", "sim", "recharge", "bsnl", "airtel", "jio", "vodafone", "vi", "landline", "telecom"] },
  { code: "6050", name: "Telephone & Internet", type: "Expense", keywords: ["telephone", "phone", "internet", "broadband", "mobile", "wifi"] },
  { code: "5004", name: "Electricity Expenses", type: "Expense", keywords: ["electricity", "electric", "power", "power bill", "light bill", "current bill", "eb bill", "energy", "electricity bill", "light and fan"] },
  { code: "6140", name: "Electricity & Water", type: "Expense", keywords: ["electricity", "electric", "power", "water", "water bill", "light bill", "current bill"] },
  { code: "5005", name: "Rent Expenses", type: "Expense", keywords: ["rent", "rental", "lease", "premises", "building rent", "office rent", "shop rent", "rent for", "monthly rent", "house rent"] },
  { code: "6020", name: "Rent Expense", type: "Expense", keywords: ["rent", "rental", "lease", "premises"] },
  { code: "5006", name: "Professional Fees", type: "Expense", keywords: ["professional", "professional fees", "fees", "consultant", "consultancy", "advocate", "lawyer", "legal fees", "ca", "chartered accountant", "audit", "auditor", "audit fees", "legal", "advocate fees"] },
  { code: "6060", name: "Legal & Professional Fees", type: "Expense", keywords: ["legal", "professional", "advocate", "lawyer", "consultant", "audit", "auditor"] },
  { code: "6240", name: "Audit Fees", type: "Expense", keywords: ["audit", "auditor", "audit fees", "statutory audit", "tax audit"] },
  { code: "5007", name: "Purchase of Goods", type: "Expense", keywords: ["purchase", "purchased", "bought", "buying", "procure", "procurement", "bought goods", "purchased goods", "goods purchased", "material purchased", "raw material", "inventory purchase", "stock purchase", "purchase of material", "purchase of goods"] },
  { code: "5010", name: "Purchases - COGS", type: "Expense", keywords: ["purchases", "cogs", "cost of goods", "purchase for resale"] },
  { code: "5030", name: "Carriage Inwards", type: "Expense", keywords: ["carriage inward", "carriage inwards", "freight inward", "freight inwards", "cartage inward", "bringing goods", "transport for purchase", "transportation for purchase", "freight on purchase", "loading charges inward"] },
  { code: "5008", name: "Advertisement Expenses", type: "Expense", keywords: ["advertisement", "advertising", "ad", "ads", "marketing", "promotion", "promo", "hoarding", "banner", "social media", "facebook ad", "google ad", "branding"] },
  { code: "6080", name: "Advertising & Marketing", type: "Expense", keywords: ["advertising", "marketing", "advertisement", "promotion"] },
  { code: "5009", name: "Repairs & Maintenance", type: "Expense", keywords: ["repair", "repairs", "maintenance", "servicing", "service charge", "amc", "break down", "breakdown", "fixing", "mend"] },
  { code: "6130", name: "Repairs & Maintenance", type: "Expense", keywords: ["repair", "repairs", "maintenance", "amc"] },
  { code: "6010", name: "Salaries and Wages", type: "Expense", keywords: ["salary", "salaries", "wages", "staff pay", "employee pay", "pay to employee", "remuneration", "payroll", "monthly salary", "salary for month", "wages paid", "pay slip", "payslip", "employee salary", "worker wages", "labour charges", "labor charges", "pay to staff", "salary paid", "wages for", "bonus to employee", "salary expense"] },
  { code: "6260", name: "Freight Outwards", type: "Expense", keywords: ["freight", "freight outward", "freight outwards", "delivery", "delivering", "delivering goods", "delivery to customers", "delivery to customer", "transportation for delivery", "transport for delivery", "cartage outward", "delivery charges", "freight out", "shipping", "courier to customer", "logistics", "dispatch", "outward freight", "delivery expense", "paid for delivery", "transportation for delivering", "delivery of goods"] },
  { code: "6200", name: "Postage & Courier", type: "Expense", keywords: ["postage", "courier", "post", "speed post", "courier charges", "parcel", "mail", "registered post"] },
  { code: "6070", name: "Bank Charges", type: "Expense", keywords: ["bank charges", "bank fee", "bank fees", "ledger fee", "sms charges", "bank commission", "transaction charges", "imps charges", "neft charges", "rtgs charges", "cheque book charges"] },
  { code: "6110", name: "Insurance Expense", type: "Expense", keywords: ["insurance", "insurance premium", "premium", "policy", "insurance policy", "fire insurance", "vehicle insurance", "life insurance", "general insurance"] },
  { code: "6210", name: "Vehicle Maintenance", type: "Expense", keywords: ["vehicle maintenance", "car repair", "bike repair", "vehicle repair", "vehicle service", "tyre", "tire", "battery", "vehicle fuel", "car maintenance"] },
  { code: "6150", name: "Staff Welfare", type: "Expense", keywords: ["staff welfare", "employee welfare", "welfare", "canteen", "uniform", "safety", "esi", "pf", "provident fund", "gratuity", "leave encashment"] },
  { code: "6250", name: "Commission to Sales Agents", type: "Expense", keywords: ["commission", "sales commission", "agent commission", "brokerage", "broker", "agent fee", "commission to agent"] },
  { code: "6270", name: "Bad Debts", type: "Expense", keywords: ["bad debt", "bad debts", "debt written off", "write off", "irrecoverable", "doubtful debt"] },
  { code: "6290", name: "Office Refreshments", type: "Expense", keywords: ["refreshment", "refreshments", "tea", "coffee", "snacks", "office tea", "canteen", "food for office"] },
  { code: "6300", name: "Security Expenses", type: "Expense", keywords: ["security", "security guard", "security service", "watchman", "guard"] },
  { code: "6220", name: "IT & Software Expenses", type: "Expense", keywords: ["software", "it expense", "subscription", "saas", "cloud", "domain", "hosting", "antivirus", "microsoft", "license"] },
  { code: "6310", name: "Website Expenses", type: "Expense", keywords: ["website", "web hosting", "domain", "ssl"] },
  { code: "6230", name: "Training & Development", type: "Expense", keywords: ["training", "development", "workshop", "seminar", "skill development"] },
  { code: "6160", name: "Recruitment Expenses", type: "Expense", keywords: ["recruitment", "recruiting", "placement", "job portal", "interview", "hiring"] },
  { code: "6170", name: "Subscription & Periodicals", type: "Expense", keywords: ["subscription", "periodical", "magazine", "newspaper", "journal", "annual subscription"] },
  { code: "6180", name: "Donations & Charity", type: "Expense", keywords: ["donation", "donations", "charity", "donated", "contribution to charity"] },
  { code: "6190", name: "Rates & Taxes", type: "Expense", keywords: ["rates", "taxes", "property tax", "municipal tax", "local tax", "cess"] },
  { code: "6120", name: "Miscellaneous Expenses", type: "Expense", keywords: ["miscellaneous", "misc", "sundry expense", "other expense", "general expense"] },
  { code: "6100", name: "Depreciation Expense", type: "Expense", keywords: ["depreciation", "depreciated", "depreciation charge"] },
  { code: "6320", name: "Business Promotion", type: "Expense", keywords: ["business promotion", "promotion", "gift", "free sample", "business gift"] },

  // ---- INCOME ----
  { code: "4001", name: "Sales", type: "Income", keywords: ["sale", "sales", "sold", "sold goods", "revenue", "sales revenue", "income from sale", "sale of", "sold to", "sales of goods", "billing", "invoice"] },
  { code: "4010", name: "Sales Revenue", type: "Revenue", keywords: ["sales", "sale", "sold", "revenue"] },
  { code: "4002", name: "Service Income", type: "Income", keywords: ["service", "service income", "fees received", "consulting", "consulting income", "service charge", "service revenue", "fees from service"] },
  { code: "4020", name: "Service Revenue", type: "Revenue", keywords: ["service", "fees", "consulting"] },
  { code: "4003", name: "Interest Income", type: "Income", keywords: ["interest", "interest income", "interest received", "dividend", "dividend income", "interest on deposit", "fd interest", "savings interest"] },
  { code: "4510", name: "Interest Income", type: "Other Income", keywords: ["interest", "interest income", "dividend"] },
  { code: "4530", name: "Commission Received", type: "Income", keywords: ["commission received", "commission income", "brokerage received"] },
  { code: "4030", name: "Sales Returns", type: "Revenue", keywords: ["sales return", "sale return", "return of goods", "goods returned", "return by customer", "defective return", "customer return"] },
  { code: "4005", name: "Purchase Returns", type: "Revenue", keywords: ["purchase return", "return to supplier", "goods returned to", "return to vendor", "supplier return"] },

  // ---- LIABILITIES ----
  { code: "2001", name: "Sundry Creditors", type: "Liability", keywords: ["creditor", "creditors", "supplier", "vendor", "payable", "accounts payable", "due to supplier"] },
  { code: "2410", name: "Accounts Payable / Sundry Creditors", type: "Liability", keywords: ["creditor", "supplier", "vendor", "payable"] },
  { code: "2002", name: "Sundry Debtors", type: "Liability", keywords: ["debtor", "debtors", "customer", "client", "receivable", "accounts receivable", "due from customer"] },
  { code: "2003", name: "Outstanding Expenses", type: "Liability", keywords: ["outstanding", "outstanding expense", "accrued", "accrued expense", "payable expense", "expense payable", "due but not paid"] },
  { code: "2004", name: "Outstanding Rent", type: "Liability", keywords: ["outstanding rent", "accrued rent", "rent payable", "rent due", "rent outstanding"] },
  { code: "2005", name: "Outstanding Salary", type: "Liability", keywords: ["outstanding salary", "accrued salary", "salary payable", "salary due", "salary outstanding", "unpaid salary"] },
  { code: "2006", name: "Other Outstanding Expenses", type: "Liability", keywords: ["outstanding", "accrued"] },

  // ---- EQUITY (Drawings for personal) ----
  { code: "2040", name: "Drawings", type: "Equity", keywords: ["drawings", "drawing", "personal", "owner", "proprietor", "director", "private use", "for personal", "personal expense", "personal use"] },

  // ---- GST ACCOUNTS ----
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
