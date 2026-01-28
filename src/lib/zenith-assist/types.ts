export type ZenithUserRole = "CA" | "Client" | "Student";

export type ChatIntent =
  | "FAQ"
  | "FeatureHelp"
  | "AccountingEntry"
  | "ErrorExplanation"
  | "ComplianceDueDates"
  | "ComplianceExplanation"
  | "Unknown";

export interface ChatbotQueryRequest {
  userId: string;
  userRole: ZenithUserRole;
  companyType?: string | null;
  gstRegistered?: boolean | null;
  message: string;
}

export type ChatAction =
  | { type: "navigate"; label: string; href: string }
  | { type: "support"; label: string; href: string };

export interface SuggestedJournalEntry {
  voucherType?: string;
  narration: string;
  // Minimal structure requested + extensible lines
  debitAccount?: string;
  creditAccount?: string;
  lines?: Array<{
    accountName: string;
    accountCode?: string;
    isDebit: boolean;
    amount: number;
  }>;
  warnings?: string[];
}

export interface ChatbotQueryResponse {
  intent: ChatIntent;
  text: string;
  actions?: ChatAction[];
  journalEntry?: SuggestedJournalEntry;
  disclaimer?: string;
  confidence?: number; // 0-1 (rule-based)
}

export interface KnowledgeBaseEntry {
  id: string;
  intent: "FAQ" | "FeatureHelp" | "ErrorExplanation" | "ComplianceExplanation";
  title: string;
  answer: string;
  keywords: string[];
  actions?: ChatAction[];
}

