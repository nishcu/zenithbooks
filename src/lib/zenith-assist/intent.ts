import type { ChatIntent, KnowledgeBaseEntry } from "./types";

const norm = (s: string) => (s || "").toLowerCase().trim();

export function classifyIntent(message: string): { intent: ChatIntent; confidence: number } {
  const m = norm(message);
  if (!m) return { intent: "Unknown", confidence: 0 };

  // Error / troubleshooting
  if (/\b(error|failed|cannot|can't|issue|bug|crash|not working)\b/.test(m)) {
    return { intent: "ErrorExplanation", confidence: 0.8 };
  }

  // Compliance due dates / compliance queries
  if (/\b(due\s*date|due\s*dates|deadline|gstr|gst|tds|tcs|itr|advance\s*tax)\b/.test(m)) {
    if (/\b(due\s*date|due\s*dates|deadline)\b/.test(m)) return { intent: "ComplianceDueDates", confidence: 0.8 };
    return { intent: "ComplianceExplanation", confidence: 0.65 };
  }

  // Feature navigation help
  if (/\b(how\s+to|where\s+is|navigate|open|upload|csv|excel|bulk)\b/.test(m)) {
    return { intent: "FeatureHelp", confidence: 0.7 };
  }

  // Accounting entry requests (narrations / journal)
  if (
    /\b(journal|entry|voucher|debit|credit|paid|received|purchased|sold|rent|salary|gst\s*@|\b₹|\brs\b)\b/.test(m)
  ) {
    return { intent: "AccountingEntry", confidence: 0.65 };
  }

  // FAQ fallback
  if (/\b(pricing|plan|subscription|what is|help)\b/.test(m)) {
    return { intent: "FAQ", confidence: 0.6 };
  }

  return { intent: "Unknown", confidence: 0.3 };
}

export function findBestKnowledgeBaseMatch(message: string, kb: KnowledgeBaseEntry[]): KnowledgeBaseEntry | null {
  const m = norm(message);
  if (!m) return null;

  let best: { entry: KnowledgeBaseEntry; score: number } | null = null;
  for (const entry of kb) {
    const score = entry.keywords.reduce((acc, kw) => {
      const k = norm(kw);
      if (!k) return acc;
      return acc + (m.includes(k) ? 2 : 0) + (new RegExp(`\\b${escapeRegExp(k)}\\b`).test(m) ? 1 : 0);
    }, 0);
    if (!best || score > best.score) best = { entry, score };
  }

  if (!best || best.score < 2) return null;
  return best.entry;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

