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
  { code: "1001", name: "Cash", type: "Asset", keywords: ["cash", "money", "currency", "in cash", "by cash", "cash payment", "cash paid", "paid in cash", "cash received", "received in cash", "cash in hand", "petty cash", "cash balance", "rs in cash", "₹ in cash", "cash rs", "cash ₹"] },
  { code: "1510", name: "Cash on Hand", type: "Cash", keywords: ["cash", "money", "currency", "in cash", "by cash", "cash payment", "cash on hand", "petty cash", "cash balance", "cash paid", "paid in cash"] },
  // ---- BANKS (all shortcuts + full names for Smart Entry matching) ----
  { code: "1002", name: "Bank Account - HDFC", type: "Asset", keywords: ["bank", "hdfc", "hdfc bank", "housing development finance", "hdfc netbanking", "hdfc neft", "hdfc rtgs", "hdfc imps", "hdfc cheque", "account"] },
  { code: "1520", name: "HDFC Bank", type: "Asset", keywords: ["hdfc", "hdfc bank", "housing development finance corporation", "housing development finance"] },
  { code: "1003", name: "Bank Account - SBI", type: "Asset", keywords: ["bank", "sbi", "sbi bank", "state bank", "state bank of india", "state bank india", "sbicard", "sbi card", "sbi netbanking", "sbi neft", "sbi rtgs", "sbi imps", "account"] },
  { code: "1522", name: "SBI Bank", type: "Asset", keywords: ["sbi", "sbi bank", "state bank of india", "state bank", "state bank india"] },
  { code: "1521", name: "ICICI Bank", type: "Asset", keywords: ["icici", "icici bank", "industrial credit and investment corporation", "icici netbanking", "icici neft", "icici rtgs", "icici imps"] },
  { code: "1523", name: "PNB Bank", type: "Asset", keywords: ["pnb", "punjab national bank", "punjab national", "pnb bank", "pnb neft", "pnb rtgs"] },
  { code: "1524", name: "Bank of Baroda", type: "Asset", keywords: ["bob", "bank of baroda", "baroda bank", "bob bank", "bob neft", "bob rtgs"] },
  { code: "1525", name: "Axis Bank", type: "Asset", keywords: ["axis", "axis bank", "uti bank", "axis neft", "axis rtgs", "axis imps"] },
  { code: "1526", name: "Kotak Mahindra Bank", type: "Asset", keywords: ["kotak", "kotak bank", "kotak mahindra", "kotak mahindra bank", "kotak neft", "kotak rtgs"] },
  { code: "1527", name: "Yes Bank", type: "Asset", keywords: ["yes bank", "yesbank", "yes bank neft", "yes bank rtgs"] },
  { code: "1528", name: "IndusInd Bank", type: "Asset", keywords: ["indusind", "indus ind", "indusind bank", "indus ind bank"] },
  { code: "1529", name: "IDBI Bank", type: "Asset", keywords: ["idbi", "idbi bank", "industrial development bank of india"] },
  { code: "1530", name: "Central Bank of India", type: "Asset", keywords: ["cbi", "central bank of india", "central bank", "cbi bank"] },
  { code: "1531", name: "Bank of India", type: "Asset", keywords: ["boi", "bank of india", "boi bank", "boi neft", "boi rtgs"] },
  { code: "1532", name: "Canara Bank", type: "Asset", keywords: ["canara", "canara bank", "canara neft", "canara rtgs"] },
  { code: "1533", name: "Union Bank of India", type: "Asset", keywords: ["union bank", "union bank of india", "union bank neft", "union bank rtgs"] },
  { code: "1534", name: "Federal Bank", type: "Asset", keywords: ["federal bank", "federal", "federal neft", "federal rtgs"] },
  { code: "1535", name: "Indian Bank", type: "Asset", keywords: ["indian bank", "indian bank neft", "indian bank rtgs"] },
  { code: "1536", name: "Indian Overseas Bank", type: "Asset", keywords: ["iob", "indian overseas bank", "indian overseas", "iob bank"] },
  { code: "1537", name: "UCO Bank", type: "Asset", keywords: ["uco", "uco bank", "uco neft", "uco rtgs"] },
  { code: "1538", name: "Bank of Maharashtra", type: "Asset", keywords: ["bom", "bank of maharashtra", "maharashtra bank", "bom bank"] },
  { code: "1539", name: "Punjab & Sind Bank", type: "Asset", keywords: ["punjab and sind", "punjab & sind bank", "psb", "punjab sind bank"] },
  { code: "1540", name: "IDFC First Bank", type: "Asset", keywords: ["idfc", "idfc first", "idfc first bank", "idfc bank"] },
  { code: "1541", name: "Bandhan Bank", type: "Asset", keywords: ["bandhan", "bandhan bank"] },
  { code: "1542", name: "South Indian Bank", type: "Asset", keywords: ["south indian bank", "sib", "south indian"] },
  { code: "1543", name: "Karur Vysya Bank", type: "Asset", keywords: ["kvb", "karur vysya", "karur vysya bank", "kvb bank"] },
  { code: "1544", name: "City Union Bank", type: "Asset", keywords: ["cub", "city union bank", "city union"] },
  { code: "1545", name: "DCB Bank", type: "Asset", keywords: ["dcb", "dcb bank", "development credit bank"] },
  { code: "1546", name: "RBL Bank", type: "Asset", keywords: ["rbl", "rbl bank", "ratnakar bank"] },
  { code: "1004", name: "UPI Payments", type: "Asset", keywords: ["upi", "phonepe", "gpay", "paytm", "bhim", "upi payment", "through upi", "via upi", "by upi", "upi transfer", "upi id", "upi ref", "phone pe", "google pay", "paytm payment", "bhim upi", "upi received", "paid through upi"] },
  { code: "1005", name: "Prepaid Expenses", type: "Asset", keywords: ["prepaid", "advance expense", "advance payment", "paid in advance", "advance for expense", "prepaid expense", "advance given", "advance paid", "prepaid amount", "advance against expense"] },
  { code: "1006", name: "Prepaid Rent", type: "Asset", keywords: ["prepaid rent", "advance rent", "rent advance", "rent paid in advance", "advance for rent", "rent in advance", "advance rent paid", "security deposit rent", "rent deposit"] },
  { code: "1007", name: "Prepaid Insurance", type: "Asset", keywords: ["prepaid insurance", "advance insurance", "insurance advance", "insurance paid in advance", "advance premium", "premium paid in advance"] },
  { code: "1008", name: "Prepaid Salary", type: "Asset", keywords: ["prepaid salary", "advance salary", "salary advance", "salary paid in advance", "advance to employee", "salary advance paid", "advance against salary", "employee advance"] },
  { code: "1009", name: "Other Prepaid Expenses", type: "Asset", keywords: ["prepaid", "advance", "advance paid", "prepaid amount", "advance for", "paid in advance"] },

  // ---- FIXED ASSETS (capital purchases – debit Asset, not Expense) ----
  { code: "1060", name: "Vehicles", type: "Fixed Asset", keywords: ["vehicle", "vehicles", "car", "cars", "bike", "bikes", "motorcycle", "scooter", "automobile", "purchased vehicle", "vehicle purchase", "bought vehicle", "bought car", "purchased car", "car purchase", "van", "truck", "motor car", "four wheeler", "two wheeler", "car for business", "vehicle for business", "new car", "new vehicle", "motorcycle purchase", "scooter purchase", "truck purchase", "van purchase", "commercial vehicle", "transport vehicle", "two wheeler purchase", "four wheeler purchase"] },
  { code: "1030", name: "Office Equipment", type: "Fixed Asset", keywords: ["office equipment", "equipment", "purchased equipment", "bought equipment", "ac", "air conditioner", "air conditioning", "generator", "inverter", "ups", "photocopier", "projector", "cctv", "biometric", "office machine", "machinery", "plant and machinery"] },
  { code: "1040", name: "Computers & Laptops", type: "Fixed Asset", keywords: ["computer", "computers", "laptop", "laptops", "pc", "purchased computer", "purchased laptop", "bought laptop", "desktop", "desktop computer", "notebook", "macbook", "server", "workstation", "computer for office", "laptop for office", "new laptop", "new computer"] },
  { code: "1050", name: "Furniture & Fixtures", type: "Fixed Asset", keywords: ["furniture", "fixtures", "purchased furniture", "bought furniture", "office furniture", "chairs", "tables", "almirah", "cupboard", "cabinet", "rack", "shelving", "office chair", "office table", "workstation furniture", "furniture and fixtures", "purchase of furniture"] },

  // ---- EXPENSES (GUNSHOT: all possible keywords for correct matching) ----
  { code: "5001", name: "Office Expenses", type: "Expense", keywords: ["office", "stationery", "stationary", "supplies", "pen", "pens", "paper", "notebook", "file", "folder", "staple", "ink", "printer", "copier", "office supplies", "general office", "office consumables", "office material", "printing", "xerox", "xeror", "xero", "photocopy", "photocopying", "clip", "clips", "pins", "glue", "tape", "envelope", "envelopes", "register", "registers", "office expense", "general expense office", "purchased stationery", "stationery for office"] },
  { code: "6040", name: "Printing & Stationery", type: "Expense", keywords: ["printing", "stationery", "stationary", "print", "xerox", "xeror", "xero", "photocopy", "photocopying", "letterhead", "visiting card", "business card", "visiting cards", "business cards", "print charges", "printing charges", "colour print", "bw print", "binding", "lamination", "printout", "print outs"] },
  { code: "5002", name: "Travel Expenses", type: "Expense", keywords: ["travel", "travelling", "traveling", "taxi", "cab", "uber", "ola", "fuel", "petrol", "diesel", "conveyance", "business trip", "travel allowance", "ta da", "ta/da", "ta & da", "lodging", "hotel", "outstation", "toll", "parking", "bus fare", "train fare", "flight", "air ticket", "railway", "lodging charges", "hotel charges", "travel expense", "conveyance allowance", "daily allowance", "da"] },
  { code: "6090", name: "Travel & Conveyance", type: "Expense", keywords: ["travel", "conveyance", "taxi", "cab", "fuel", "petrol", "diesel", "ta da", "travel allowance", "conveyance allowance", "transport allowance"] },
  { code: "5003", name: "Telephone Expenses", type: "Expense", keywords: ["phone", "telephone", "mobile", "mobile bill", "internet", "broadband", "wifi", "wifi bill", "data", "sim", "recharge", "bsnl", "airtel", "jio", "vodafone", "vi", "landline", "telecom", "phone bill", "internet bill", "broadband bill", "postpaid", "prepaid", "mobile recharge", "data pack", "router", "modem"] },
  { code: "6050", name: "Telephone & Internet", type: "Expense", keywords: ["telephone", "phone", "internet", "broadband", "mobile", "wifi", "telecom", "phone bill", "internet bill"] },
  { code: "5004", name: "Electricity Expenses", type: "Expense", keywords: ["electricity", "electric", "power", "power bill", "light bill", "current bill", "eb bill", "energy", "electricity bill", "light and fan", "electric bill", "power charges", "electricity charges", "meter", "meter reading", "discom", "tneb", "mseb", "electricity paid"] },
  { code: "6140", name: "Electricity & Water", type: "Expense", keywords: ["electricity", "electric", "power", "water", "water bill", "light bill", "current bill", "electricity and water", "power and water", "utility bill", "water charges"] },
  { code: "5005", name: "Rent Expenses", type: "Expense", keywords: ["rent", "rental", "lease", "premises", "building rent", "office rent", "shop rent", "rent for", "monthly rent", "house rent", "rent paid", "rent of", "lease rent", "premises rent", "godown rent", "warehouse rent", "factory rent"] },
  { code: "6020", name: "Rent Expense", type: "Expense", keywords: ["rent", "rental", "lease", "premises", "rent expense", "rent paid"] },
  { code: "5006", name: "Professional Fees", type: "Expense", keywords: ["professional", "professional fees", "fees", "consultant", "consultancy", "advocate", "lawyer", "legal fees", "ca", "chartered accountant", "audit", "auditor", "audit fees", "legal", "advocate fees", "consultation", "professional charges", "legal charges", "lawyer fees", "ca fees", "consultant fees", "expert fees"] },
  { code: "6060", name: "Legal & Professional Fees", type: "Expense", keywords: ["legal", "professional", "advocate", "lawyer", "consultant", "audit", "auditor", "legal fees", "professional fees"] },
  { code: "6240", name: "Audit Fees", type: "Expense", keywords: ["audit", "auditor", "audit fees", "statutory audit", "tax audit", "audit charges", "auditor fees", "external audit", "internal audit", "audit fee paid"] },
  { code: "5007", name: "Purchase of Goods", type: "Expense", keywords: ["purchase", "purchased", "bought", "buying", "procure", "procurement", "bought goods", "purchased goods", "goods purchased", "material purchased", "raw material", "inventory purchase", "stock purchase", "purchase of material", "purchase of goods", "purchase for resale", "trading goods", "merchandise", "stock", "inventory", "purchase from supplier", "bought from"] },
  { code: "5010", name: "Purchases - COGS", type: "Expense", keywords: ["purchases", "cogs", "cost of goods", "purchase for resale", "cost of goods sold", "direct purchase", "purchase direct"] },
  { code: "5030", name: "Carriage Inwards", type: "Expense", keywords: ["carriage inward", "carriage inwards", "freight inward", "freight inwards", "cartage inward", "bringing goods", "transport for purchase", "transportation for purchase", "freight on purchase", "loading charges inward", "freight in", "cartage in", "octroi", "transport charges inward", "inward freight", "inward cartage"] },
  { code: "5008", name: "Advertisement Expenses", type: "Expense", keywords: ["advertisement", "advertising", "ad", "ads", "marketing", "promotion", "promo", "hoarding", "banner", "social media", "facebook ad", "google ad", "branding", "campaign", "digital marketing", "seo", "sem", "ad campaign", "marketing expense", "promotional expense", "brand promotion"] },
  { code: "6080", name: "Advertising & Marketing", type: "Expense", keywords: ["advertising", "marketing", "advertisement", "promotion", "ad campaign", "marketing campaign"] },
  { code: "5009", name: "Repairs & Maintenance", type: "Expense", keywords: ["repair", "repairs", "maintenance", "servicing", "service charge", "amc", "break down", "breakdown", "fixing", "mend", "annual maintenance", "repair and maintenance", "maintenance charges", "service charges", "repair work", "maintenance contract"] },
  { code: "6130", name: "Repairs & Maintenance", type: "Expense", keywords: ["repair", "repairs", "maintenance", "amc", "servicing", "service charge"] },
  { code: "6010", name: "Salaries and Wages", type: "Expense", keywords: ["salary", "salaries", "wages", "staff pay", "employee pay", "pay to employee", "remuneration", "payroll", "monthly salary", "salary for month", "wages paid", "pay slip", "payslip", "employee salary", "worker wages", "labour charges", "labor charges", "pay to staff", "salary paid", "wages for", "bonus to employee", "salary expense", "payroll expense", "staff salary", "employee wages", "monthly wages", "salary for", "wage payment", "salary payment", "payroll payment", "incentive", "incentives", "bonus", "bonus paid", "salary and wages"] },
  { code: "6260", name: "Freight Outwards", type: "Expense", keywords: ["freight", "freight outward", "freight outwards", "delivery", "delivering", "delivering goods", "delivery to customers", "delivery to customer", "transportation for delivery", "transport for delivery", "cartage outward", "delivery charges", "freight out", "shipping", "courier to customer", "logistics", "dispatch", "outward freight", "delivery expense", "paid for delivery", "transportation for delivering", "delivery of goods", "freight charges", "delivery paid", "shipping charges", "outward cartage", "transport for delivery", "goods delivery", "customer delivery"] },
  { code: "6200", name: "Postage & Courier", type: "Expense", keywords: ["postage", "courier", "post", "speed post", "courier charges", "parcel", "mail", "registered post", "courier fee", "postage charges", "parcel charges", "courier sent", "speed post charges", "registered post charges", "document courier", "courier service"] },
  { code: "6070", name: "Bank Charges", type: "Expense", keywords: ["bank charges", "bank fee", "bank fees", "ledger fee", "sms charges", "bank commission", "transaction charges", "imps charges", "neft charges", "rtgs charges", "cheque book charges", "cheque book fee", "atm charges", "cash handling", "bank service charge", "quarterly charges", "annual charges bank", "demand draft charges", "dd charges"] },
  { code: "6110", name: "Insurance Expense", type: "Expense", keywords: ["insurance", "insurance premium", "premium", "policy", "insurance policy", "fire insurance", "vehicle insurance", "life insurance", "general insurance", "insurance paid", "premium paid", "policy premium", "insurance renewal", "group insurance", "mediclaim", "health insurance", "marine insurance", "theft insurance"] },
  { code: "6210", name: "Vehicle Maintenance", type: "Expense", keywords: ["vehicle maintenance", "car repair", "bike repair", "vehicle repair", "vehicle service", "tyre", "tire", "battery", "vehicle fuel", "car maintenance", "bike maintenance", "tyre change", "battery change", "oil change", "servicing of vehicle", "car service", "bike service", "petrol for vehicle", "diesel for vehicle", "tyres", "tires", "wheel", "puncture", "vehicle repair charges"] },
  { code: "6150", name: "Staff Welfare", type: "Expense", keywords: ["staff welfare", "employee welfare", "welfare", "canteen", "uniform", "safety", "esi", "pf", "provident fund", "gratuity", "leave encashment", "staff welfare expense", "employee benefit", "canteen expense", "uniform expense", "safety equipment", "epf", "employer pf", "employer contribution", "gratuity payment", "leave encashment paid"] },
  { code: "6250", name: "Commission to Sales Agents", type: "Expense", keywords: ["commission", "sales commission", "agent commission", "brokerage", "broker", "agent fee", "commission to agent", "agent commission paid", "brokerage paid", "sales agent commission", "dealer commission", "distributor commission", "commission expense"] },
  { code: "6270", name: "Bad Debts", type: "Expense", keywords: ["bad debt", "bad debts", "debt written off", "write off", "irrecoverable", "doubtful debt", "bad debt written off", "irrecoverable debt", "debtor written off", "provision for bad debt"] },
  { code: "6290", name: "Office Refreshments", type: "Expense", keywords: ["refreshment", "refreshments", "tea", "coffee", "snacks", "office tea", "canteen", "food for office", "office snacks", "tea coffee", "biscuits", "office food", "refreshment for meeting", "meeting refreshment"] },
  { code: "6300", name: "Security Expenses", type: "Expense", keywords: ["security", "security guard", "security service", "watchman", "guard", "security charges", "guard charges", "watchman salary", "security agency", "security contract", "security expense paid"] },
  { code: "6220", name: "IT & Software Expenses", type: "Expense", keywords: ["software", "it expense", "subscription", "saas", "cloud", "domain", "hosting", "antivirus", "microsoft", "license", "software license", "software subscription", "cloud subscription", "domain renewal", "hosting charges", "it support", "software purchase", "annual license", "saas subscription", "app subscription"] },
  { code: "6310", name: "Website Expenses", type: "Expense", keywords: ["website", "web hosting", "domain", "ssl", "website hosting", "domain registration", "ssl certificate", "website maintenance", "web development", "website charges"] },
  { code: "6230", name: "Training & Development", type: "Expense", keywords: ["training", "development", "workshop", "seminar", "skill development", "employee training", "staff training", "training program", "training fee", "seminar fee", "workshop fee", "skill development program", "training expense"] },
  { code: "6160", name: "Recruitment Expenses", type: "Expense", keywords: ["recruitment", "recruiting", "placement", "job portal", "interview", "hiring", "recruitment fee", "placement fee", "hiring charges", "recruitment agency", "job posting", "interview expense", "recruitment expense"] },
  { code: "6170", name: "Subscription & Periodicals", type: "Expense", keywords: ["subscription", "periodical", "magazine", "newspaper", "journal", "annual subscription", "magazine subscription", "newspaper subscription", "journal subscription", "periodical subscription", "membership subscription"] },
  { code: "6180", name: "Donations & Charity", type: "Expense", keywords: ["donation", "donations", "charity", "donated", "contribution to charity", "charity donation", "donation paid", "charity paid", "csr", "corporate social responsibility", "donation to", "contribution to"] },
  { code: "6190", name: "Rates & Taxes", type: "Expense", keywords: ["rates", "taxes", "property tax", "municipal tax", "local tax", "cess", "property tax paid", "municipal tax paid", "local tax", "professional tax", "pt", "trade license", "license fee", "municipal charges"] },
  { code: "6120", name: "Miscellaneous Expenses", type: "Expense", keywords: ["miscellaneous", "misc", "sundry expense", "other expense", "general expense", "misc expense", "sundry", "other charges", "general charges", "petty expense", "incidental expense"] },
  { code: "6100", name: "Depreciation Expense", type: "Expense", keywords: ["depreciation", "depreciated", "depreciation charge", "depreciation expense", "depreciation for", "depreciation on", "wdv", "written down value"] },
  { code: "6320", name: "Business Promotion", type: "Expense", keywords: ["business promotion", "promotion", "gift", "free sample", "business gift", "promotional gift", "corporate gift", "client gift", "free sample distributed", "promotion expense"] },

  // ---- INCOME (GUNSHOT: all possible keywords) ----
  { code: "4001", name: "Sales", type: "Income", keywords: ["sale", "sales", "sold", "sold goods", "revenue", "sales revenue", "income from sale", "sale of", "sold to", "sales of goods", "billing", "invoice", "sales income", "goods sold", "sale revenue", "credit sale", "cash sale", "sale received", "sales bill", "sales invoice", "sold to customer", "sales to customer"] },
  { code: "4010", name: "Sales Revenue", type: "Revenue", keywords: ["sales", "sale", "sold", "revenue", "sales revenue", "sale revenue"] },
  { code: "4002", name: "Service Income", type: "Income", keywords: ["service", "service income", "fees received", "consulting", "consulting income", "service charge", "service revenue", "fees from service", "service fees", "consultancy income", "professional fees received", "service rendered", "fees earned", "service billing", "consulting fee received"] },
  { code: "4020", name: "Service Revenue", type: "Revenue", keywords: ["service", "fees", "consulting", "service revenue", "fees received"] },
  { code: "4003", name: "Interest Income", type: "Income", keywords: ["interest", "interest income", "interest received", "dividend", "dividend income", "interest on deposit", "fd interest", "savings interest", "bank interest", "interest earned", "interest from bank", "fixed deposit interest", "recurring deposit interest", "dividend received", "interest income received"] },
  { code: "4510", name: "Interest Income", type: "Other Income", keywords: ["interest", "interest income", "dividend", "interest received", "dividend received"] },
  { code: "4530", name: "Commission Received", type: "Income", keywords: ["commission received", "commission income", "brokerage received", "commission earned", "commission from", "brokerage income", "agent commission received"] },
  { code: "4030", name: "Sales Returns", type: "Revenue", keywords: ["sales return", "sale return", "return of goods", "goods returned", "return by customer", "defective return", "customer return", "goods return", "return inward", "sales return inward", "return from customer"] },
  { code: "4005", name: "Purchase Returns", type: "Revenue", keywords: ["purchase return", "return to supplier", "goods returned to", "return to vendor", "supplier return", "return outward", "purchase return outward", "return to supplier", "goods returned to supplier"] },

  // ---- LIABILITIES (GUNSHOT: all possible keywords) ----
  { code: "2001", name: "Sundry Creditors", type: "Liability", keywords: ["creditor", "creditors", "supplier", "vendor", "payable", "accounts payable", "due to supplier", "sundry creditors", "trade payable", "creditor balance", "payable to supplier", "payable to vendor", "bills payable", "creditor for goods"] },
  { code: "2410", name: "Accounts Payable / Sundry Creditors", type: "Liability", keywords: ["creditor", "supplier", "vendor", "payable", "accounts payable", "sundry creditor"] },
  { code: "2002", name: "Sundry Debtors", type: "Liability", keywords: ["debtor", "debtors", "customer", "client", "receivable", "accounts receivable", "due from customer", "sundry debtors", "trade receivable", "debtor balance", "receivable from customer", "bills receivable", "debtor for goods"] },
  { code: "2003", name: "Outstanding Expenses", type: "Liability", keywords: ["outstanding", "outstanding expense", "accrued", "accrued expense", "payable expense", "expense payable", "due but not paid", "outstanding liability", "expense due", "unpaid expense", "expense outstanding", "accrued liability"] },
  { code: "2004", name: "Outstanding Rent", type: "Liability", keywords: ["outstanding rent", "accrued rent", "rent payable", "rent due", "rent outstanding", "rent to be paid", "unpaid rent", "rent liability"] },
  { code: "2005", name: "Outstanding Salary", type: "Liability", keywords: ["outstanding salary", "accrued salary", "salary payable", "salary due", "salary outstanding", "unpaid salary", "salary to be paid", "salary liability", "wages payable", "wages outstanding"] },
  { code: "2006", name: "Other Outstanding Expenses", type: "Liability", keywords: ["outstanding", "accrued", "outstanding expense", "accrued expense", "payable", "due"] },

  // ---- EQUITY (Drawings for personal – GUNSHOT keywords) ----
  { code: "2040", name: "Drawings", type: "Equity", keywords: ["drawings", "drawing", "personal", "owner", "proprietor", "director", "private use", "for personal", "personal expense", "personal use", "owner withdrawal", "proprietor withdrawal", "drawing for personal", "personal drawing", "withdrawal for personal", "capital withdrawal", "owner drawing"] },

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
