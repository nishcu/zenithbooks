import type { KnowledgeBaseEntry } from "./types";

// Small, curated KB. Keep answers short and actionable.
export const KNOWLEDGE_BASE: KnowledgeBaseEntry[] = [
  {
    id: "bulk-invoice-upload",
    intent: "FeatureHelp",
    title: "Bulk invoice upload (CSV/Excel)",
    answer:
      "Go to Billing → Invoices. Use the Bulk Upload option to upload your CSV/Excel. Make sure columns match the template (Party, Date, Item, Qty, Rate, GST%, Place of Supply). If GST totals look off, verify whether amounts are GST-inclusive or exclusive.",
    keywords: ["bulk", "invoice", "upload", "csv", "excel", "template", "billing"],
    actions: [{ type: "navigate", label: "Open Invoices", href: "/billing/invoices" }],
  },
  {
    id: "gstr-filing-help",
    intent: "FeatureHelp",
    title: "How to file GST returns in ZenithBooks",
    answer:
      "Go to GST Filings. Pick the return you want (GSTR-1 / GSTR-3B / GSTR-9). Use the wizard to review outward supplies, tax summary, and then finalize. If numbers don’t match, check place of supply and GST-inclusive vs exclusive amounts.",
    keywords: ["file", "gst", "filing", "gstr", "gstr-1", "gstr-3b", "return", "wizard"],
    actions: [{ type: "navigate", label: "Open GST Filings", href: "/gst-filings" }],
  },
  {
    id: "brs-help",
    intent: "FeatureHelp",
    title: "Bank Reconciliation (BRS)",
    answer:
      "Go to Accounting → Bank Reconciliation. Import/enter your bank statement, then match entries. Unmatched items usually indicate missing vouchers, bank charges, or timing differences.",
    keywords: ["brs", "bank", "reconciliation", "statement", "match", "unmatched"],
    actions: [{ type: "navigate", label: "Open Bank Reconciliation", href: "/accounting/bank-reconciliation" }],
  },
  {
    id: "gst-mismatch",
    intent: "ErrorExplanation",
    title: "GST mismatch / GST not matching totals",
    answer:
      "GST mismatches usually happen due to (1) inclusive vs exclusive amounts, (2) wrong rate, (3) CGST/SGST vs IGST, or (4) rounding. Check the place of supply (state) and confirm whether the amount you entered already includes GST.",
    keywords: ["gst", "mismatch", "not matching", "cgst", "sgst", "igst", "rounding"],
  },
  {
    id: "trial-balance-not-matching",
    intent: "ErrorExplanation",
    title: "Trial Balance not matching / not tallying",
    answer:
      "If Trial Balance doesn’t match, check (1) unbalanced entries, (2) entries posted to wrong accounts, (3) missing party accounts, or (4) filters/date range. Open Trial Balance and verify totals, then drill into the account causing difference.",
    keywords: ["trial balance", "not matching", "not tallying", "difference", "unbalanced", "missing"],
    actions: [{ type: "navigate", label: "Open Trial Balance", href: "/accounting/trial-balance" }],
  },
  {
    id: "personal-expense",
    intent: "FAQ",
    title: "Personal expense vs business expense (Drawings)",
    answer:
      "If the narration indicates personal use (personal/family/home/private), it should be treated as Drawings: Debit Drawings, Credit Cash/Bank. This avoids impacting Profit & Loss. You can still review and edit before posting.",
    keywords: ["personal", "drawings", "family", "home", "private", "expense"],
    actions: [{ type: "navigate", label: "Open Smart Entry", href: "/accounting/journal/smart-entry" }],
  },
  {
    id: "tds-payment-vs-return",
    intent: "FAQ",
    title: "TDS payment vs TDS return (what’s the difference?)",
    answer:
      "TDS payment is depositing the tax deducted to the government (challan). TDS return is the quarterly statement (24Q/26Q/27Q/27EQ) reporting deductee details and amounts. Both are required when applicable.",
    keywords: ["tds", "payment", "return", "difference", "challan", "24q", "26q", "27q", "27eq"],
    actions: [{ type: "navigate", label: "Open TDS Returns", href: "/income-tax/tds-returns" }],
  },
  {
    id: "compliance-due-dates",
    intent: "ComplianceExplanation",
    title: "Common compliance due dates (GST/TDS)",
    answer:
      "Common due dates: GSTR-1 (monthly) often 11th, GSTR-3B often 20th, and TDS payment often by 7th of next month. Exact due dates can vary by scheme, state notifications, and category—please confirm for your case.",
    keywords: ["due date", "due dates", "gstr", "gstr-1", "gstr-3b", "tds", "compliance"],
    actions: [{ type: "navigate", label: "Open GST Filings", href: "/gst-filings" }],
  },
  {
    id: "qrmp-iff-due-dates",
    intent: "ComplianceExplanation",
    title: "QRMP / IFF basics (GSTR-1 quarterly)",
    answer:
      "Under QRMP, GSTR-1 is filed quarterly, and IFF (Invoice Furnishing Facility) can be used for the first 2 months to pass ITC to buyers. Exact due dates can change via notifications—confirm the current due date for your period.",
    keywords: ["qrmp", "iff", "quarterly", "gstr-1", "monthly", "invoice furnishing facility"],
    actions: [{ type: "navigate", label: "Open GST Filings", href: "/gst-filings" }],
  },
  {
    id: "tds-return-due-dates",
    intent: "ComplianceExplanation",
    title: "TDS return due dates (24Q/26Q/27Q)",
    answer:
      "TDS returns are generally quarterly (24Q salary, 26Q non-salary, 27Q non-resident, 27EQ TCS). Exact due dates can vary based on notifications—confirm for your quarter before filing.",
    keywords: ["tds", "return", "due dates", "24q", "26q", "27q", "27eq", "tcs"],
    actions: [{ type: "navigate", label: "Open TDS Returns", href: "/income-tax/tds-returns" }],
  },
  {
    id: "form16-help",
    intent: "FeatureHelp",
    title: "Form 16 generation",
    answer:
      "Go to Income Tax → Form 16. Select employee, ensure mobile is filled, verify FY and regime, then Generate. Review the preview before downloading.",
    keywords: ["form 16", "form16", "income tax", "tds certificate"],
    actions: [{ type: "navigate", label: "Open Form 16", href: "/income-tax/form-16" }],
  },
];

