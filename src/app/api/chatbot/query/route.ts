import { NextRequest, NextResponse } from "next/server";
import { KNOWLEDGE_BASE } from "@/lib/zenith-assist/knowledge-base";
import type { ChatbotQueryRequest, ChatbotQueryResponse } from "@/lib/zenith-assist/types";
import { classifyIntent, findBestKnowledgeBaseMatch } from "@/lib/zenith-assist/intent";
import { processNarration, createJournalEntry } from "@/lib/smart-journal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISCLAIMER = "This is for informational purposes only.";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ChatbotQueryRequest>;
    const rawMessage = (body.message || "").trim();
    const message = rawMessage;

    if (!body.userId || !message) {
      return NextResponse.json(
        { intent: "Unknown", text: "Please provide a message.", disclaimer: DISCLAIMER } satisfies ChatbotQueryResponse,
        { status: 400 }
      );
    }

    const { intent, confidence } = classifyIntent(message);

    // 1) FAQ / Feature Help / Error Explanation via KB (first)
    if (intent === "FAQ" || intent === "FeatureHelp" || intent === "ErrorExplanation" || intent === "ComplianceExplanation") {
      const match = findBestKnowledgeBaseMatch(message, KNOWLEDGE_BASE);
      if (match) {
        const needsDisclaimer = match.intent === "ComplianceExplanation";
        return NextResponse.json({
          intent: match.intent,
          text: match.answer,
          actions: match.actions,
          disclaimer: needsDisclaimer ? DISCLAIMER : undefined,
          confidence: Math.min(0.95, Math.max(0.6, confidence)),
        } satisfies ChatbotQueryResponse);
      }
    }

    // 2) Accounting entry suggestions (rules engine preferred)
    if (intent === "AccountingEntry") {
      const narration = rawMessage
        .replace(/^\s*(suggest\s+)?(journal\s+entry|entry)\s*[:\-]\s*/i, "")
        .replace(/^\s*suggest\s+voucher\s*[:\-]\s*/i, "")
        .trim();
      // IMPORTANT: do NOT pass userId to smart-journal from server route
      // to avoid Firestore side-effects. We only return suggestions.
      const parsing = await processNarration(narration);
      const journalEntry = parsing.errors.length
        ? undefined
        : (() => {
            const je = createJournalEntry(parsing);
            const debitLine = je.entries.find((l) => l.isDebit);
            const creditLine = je.entries.find((l) => !l.isDebit);
            return {
              voucherType: je.voucherType,
              narration: je.narration,
              debitAccount: debitLine?.accountName,
              creditAccount: creditLine?.accountName,
              lines: je.entries.map((l) => ({
                accountName: l.accountName,
                accountCode: l.accountCode,
                isDebit: l.isDebit,
                amount: l.amount,
              })),
              warnings: parsing.warnings,
            };
          })();

      const text =
        parsing.errors.length > 0
          ? `I couldn't confidently create an entry. ${parsing.errors[0]}`
          : `Here’s a suggested entry. Please review and confirm before posting.`;

      return NextResponse.json({
        intent: "AccountingEntry",
        text,
        journalEntry,
        disclaimer: DISCLAIMER,
        confidence: Math.min(0.9, Math.max(0.55, parsing.parsed.confidence || confidence)),
        actions: [{ type: "navigate", label: "Open Smart Entry", href: "/accounting/journal/smart-entry" }],
      } satisfies ChatbotQueryResponse);
    }

    // 3) Compliance due dates (simple, safe)
    if (intent === "ComplianceDueDates") {
      const text =
        "Common due dates: GSTR-1 (monthly) often 11th, GSTR-3B often 20th, and TDS payment often by 7th of next month. Due dates can vary by scheme and notifications—please confirm for your filing category.";
      return NextResponse.json({
        intent,
        text,
        disclaimer: DISCLAIMER,
        actions: [{ type: "navigate", label: "Open GST Filings", href: "/gst-filings" }],
        confidence,
      } satisfies ChatbotQueryResponse);
    }

    // 4) Unknown / escalation
    return NextResponse.json({
      intent: "Unknown",
      text:
        "I’m not fully sure. Please share a screenshot or exact wording, or contact support. I can also guide you to the right module if you tell me what you’re trying to do.",
      actions: [{ type: "support", label: "Contact Support", href: "/contact" }],
      disclaimer: DISCLAIMER,
      confidence,
    } satisfies ChatbotQueryResponse);
  } catch (e: any) {
    return NextResponse.json(
      {
        intent: "Unknown",
        text: "Something went wrong while processing your request. Please try again.",
        disclaimer: DISCLAIMER,
      } satisfies ChatbotQueryResponse,
      { status: 500 }
    );
  }
}

