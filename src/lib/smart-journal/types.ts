/**
 * Smart Journal Entry Engine - Types
 * ZenithBooks | AI-powered Double-Entry Accounting with GST
 */

export type VoucherType = "Payment" | "Receipt" | "Journal" | "Sales" | "Purchase";

export type PaymentMode = "cash" | "bank" | "upi" | "credit" | "cheque" | "neft" | "rtgs";

export type GSTType = "CGST_SGST" | "IGST";

export type TransactionType = 
  | "purchase"
  | "sale"
  | "payment"
  | "receipt"
  | "expense"
  | "income"
  | "transfer"
  | "adjustment"
  | "advance"
  | "prepaid"
  | "outstanding"
  | "accrued"
  | "sales_return"
  | "purchase_return";

/**
 * Parsed narration data
 */
export interface ParsedNarration {
  transactionType: TransactionType;
  amount?: number;
  paymentMode?: PaymentMode;
  itemOrService?: string;
  counterparty?: string;
  location?: string; // For GST state determination
  originalNarration: string;
  confidence: number; // 0-1
  isAdvance?: boolean; // Advance payment
  isPrepaid?: boolean; // Prepaid expense
  isOutstanding?: boolean; // Outstanding/Accrued expense
  isPersonal?: boolean; // Personal expense (should go to Drawings)
}

/**
 * GST details
 */
export interface GSTDetails {
  isGSTApplicable: boolean;
  gstType?: GSTType;
  gstRate?: number; // e.g., 18 for 18%
  isInclusive: boolean; // true if GST included in amount
  taxableValue: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalGST: number;
  totalAmount: number;
  hsnCode?: string;
  placeOfSupply?: string;
  isRCM: boolean; // Reverse Charge Mechanism
  itcEligible: boolean; // Input Tax Credit eligible
  blockedCredit?: boolean;
  reason?: string; // For blocked credit
}

/**
 * Account entry (debit or credit)
 */
export interface AccountEntry {
  accountCode: string;
  accountName: string;
  accountType: string; // e.g., "Expense", "Asset", "Liability"
  amount: number;
  isDebit: boolean;
  narration?: string;
  gstDetails?: GSTDetails;
}

/**
 * Chart of Accounts entry
 */
export interface ChartOfAccount {
  code: string;
  name: string;
  type: string; // "Asset", "Liability", "Expense", "Income", "Capital"
  parentCode?: string;
  keywords: string[]; // Keywords for auto-matching
  gstAccount?: boolean; // Is this a GST account
  defaultGSTRate?: number;
}

/**
 * Journal entry
 */
export interface JournalEntry {
  voucherType: VoucherType;
  date: string; // YYYY-MM-DD
  narration: string;
  entries: AccountEntry[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  gstDetails?: GSTDetails;
  counterparty?: string;
  paymentMode?: PaymentMode;
  metadata?: {
    confidence: number;
    detectedTransactionType: TransactionType;
    suggestedAccounts: string[];
  };
}

/**
 * User confirmation data
 */
export interface JournalConfirmation {
  journalEntry: JournalEntry;
  userEdits?: {
    entries?: Partial<AccountEntry>[];
    voucherType?: VoucherType;
    date?: string;
    narration?: string;
  };
  confirmed: boolean;
}

/**
 * GST configuration
 */
export interface GSTConfig {
  gstNumber?: string;
  businessState: string; // State code
  compositionScheme: boolean;
  blockedCredits: string[]; // List of blocked credit scenarios
  defaultGSTRates: {
    goods: number;
    services: number;
  };
  rcmServices: string[]; // Services under RCM
}

/**
 * Parsing result
 */
export interface ParsingResult {
  parsed: ParsedNarration;
  suggestedAccounts: ChartOfAccount[];
  suggestedVoucherType: VoucherType;
  gstDetails?: GSTDetails;
  errors: string[];
  warnings: string[];
}
