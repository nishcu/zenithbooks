/**
 * NLP Parser for Smart Journal Entry
 * Parses plain English narration into structured data
 */

import type { ParsedNarration, TransactionType, PaymentMode } from "./types";
import { INDIAN_STATES } from "./constants";

/**
 * Parse plain English narration
 */
export function parseNarration(narration: string): ParsedNarration {
  const lowerNarration = narration.toLowerCase().trim();
  let confidence = 0.8; // Default confidence

  // Detect advance/prepaid/outstanding first (before transaction type)
  const isAdvance = detectAdvance(lowerNarration);
  const isPrepaid = detectPrepaid(lowerNarration);
  const isOutstanding = detectOutstanding(lowerNarration);

  // Extract amount
  const amount = extractAmount(lowerNarration);

  // Detect transaction type (consider advance/prepaid/outstanding)
  const transactionType = detectTransactionType(lowerNarration, isAdvance, isPrepaid, isOutstanding);

  // Detect payment mode
  const paymentMode = detectPaymentMode(lowerNarration);

  // Extract item/service
  const itemOrService = extractItemOrService(lowerNarration, transactionType);

  // Extract counterparty
  const counterparty = extractCounterparty(narration);

  // Extract location (for GST)
  const location = extractLocation(lowerNarration);

  // Adjust confidence based on extracted data
  if (!amount) confidence -= 0.2;
  if (!paymentMode) confidence -= 0.1;
  if (!itemOrService) confidence -= 0.1;

  return {
    transactionType,
    amount,
    paymentMode,
    itemOrService,
    counterparty,
    location,
    originalNarration: narration,
    confidence: Math.max(0, Math.min(1, confidence)),
    isAdvance,
    isPrepaid,
    isOutstanding,
  };
}

/**
 * Extract amount from narration
 */
function extractAmount(narration: string): number | undefined {
  // Patterns: "Rs 1800", "₹1800", "1800 rupees", "INR 1800", "Rs. 1800", "Rs1800"
  const patterns = [
    /(?:rs|rupees|inr|₹)\.?\s*([\d,]+(?:\.\d{2})?)/i,
    /([\d,]+(?:\.\d{2})?)\s*(?:rs|rupees|inr|₹)\.?/i,
    /amount[:\s]+([\d,]+(?:\.\d{2})?)/i,
    /\b([\d,]+(?:\.\d{2})?)\s*(?:rs|rupees|inr|₹|only)?\b/i, // More flexible pattern
  ];

  for (const pattern of patterns) {
    const match = narration.match(pattern);
    if (match && match[1]) {
      const amountStr = match[1].replace(/,/g, "");
      const amount = parseFloat(amountStr);
      if (amount > 0 && amount < 1000000000) {
        // Reasonable range
        return amount;
      }
    }
  }

  return undefined;
}

/**
 * Detect advance payment
 */
function detectAdvance(narration: string): boolean {
  const advanceKeywords = ["advance", "advance payment", "paid in advance", "advance paid"];
  return advanceKeywords.some((k) => narration.includes(k));
}

/**
 * Detect prepaid expense
 */
function detectPrepaid(narration: string): boolean {
  const prepaidKeywords = ["prepaid", "pre-paid", "pre paid", "paid in advance"];
  return prepaidKeywords.some((k) => narration.includes(k));
}

/**
 * Detect outstanding/accrued expense
 */
function detectOutstanding(narration: string): boolean {
  const outstandingKeywords = ["outstanding", "accrued", "accrual", "payable", "due"];
  return outstandingKeywords.some((k) => narration.includes(k));
}

/**
 * Detect transaction type
 */
function detectTransactionType(
  narration: string,
  isAdvance?: boolean,
  isPrepaid?: boolean,
  isOutstanding?: boolean
): TransactionType {
  // Handle advance/prepaid/outstanding first
  if (isAdvance || isPrepaid) {
    if (narration.includes("rent")) return "prepaid";
    return "advance";
  }
  if (isOutstanding) {
    return "outstanding";
  }
  const purchaseKeywords = ["purchase", "purchased", "bought", "buy", "paid for", "expense"];
  const saleKeywords = ["sale", "sold", "sold to", "invoice", "billing"];
  const paymentKeywords = ["payment", "paid", "pay", "paid to", "settled"];
  const receiptKeywords = ["received", "receipt", "collection", "collected", "got"];
  const expenseKeywords = ["expense", "spent", "incurred", "cost"];
  const incomeKeywords = ["income", "earned", "revenue", "received for"];

  const lower = narration.toLowerCase();

  if (purchaseKeywords.some((k) => lower.includes(k))) return "purchase";
  if (saleKeywords.some((k) => lower.includes(k))) return "sale";
  if (paymentKeywords.some((k) => lower.includes(k))) return "payment";
  if (receiptKeywords.some((k) => lower.includes(k))) return "receipt";
  if (expenseKeywords.some((k) => lower.includes(k))) return "expense";
  if (incomeKeywords.some((k) => lower.includes(k))) return "income";

  // Default based on context
  if (lower.includes("from") || lower.includes("by")) return "receipt";
  if (lower.includes("to") || lower.includes("for")) return "payment";

  return "expense"; // Default
}

/**
 * Detect payment mode
 */
function detectPaymentMode(narration: string): PaymentMode | undefined {
  const lower = narration.toLowerCase();

  if (lower.includes("cash")) return "cash";
  if (lower.includes("bank") || lower.includes("cheque") || lower.includes("neft") || lower.includes("rtgs")) {
    return "bank";
  }
  if (lower.includes("upi") || lower.includes("phonepe") || lower.includes("gpay") || lower.includes("paytm")) {
    return "upi";
  }
  if (lower.includes("credit") || lower.includes("on credit") || lower.includes("credit basis")) {
    return "credit";
  }
  if (lower.includes("cheque")) return "cheque";

  return undefined;
}

/**
 * Extract item or service
 */
function extractItemOrService(narration: string, transactionType: TransactionType): string | undefined {
  // Remove common words
  const stopWords = ["purchased", "bought", "sold", "paid", "received", "for", "rs", "rupees", "inr", "₹", "with", "bill"];
  let text = narration.toLowerCase();

  // Remove amount
  text = text.replace(/(?:rs|rupees|inr|₹)\.?\s*[\d,]+(?:\.\d{2})?/gi, "");
  text = text.replace(/[\d,]+(?:\.\d{2})?\s*(?:rs|rupees|inr|₹)\.?/gi, "");

  // Remove stop words
  stopWords.forEach((word) => {
    text = text.replace(new RegExp(`\\b${word}\\b`, "gi"), "");
  });

  // Extract meaningful words
  const words = text
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !["the", "and", "or", "in", "on", "at", "to", "from", "cash", "bank"].includes(w));

  if (words.length > 0) {
    return words.slice(0, 3).join(" ").trim() || undefined;
  }

  return undefined;
}

/**
 * Extract counterparty (customer/supplier name)
 */
function extractCounterparty(narration: string): string | undefined {
  // Patterns: "to ABC", "from XYZ", "paid to", "received from"
  const patterns = [
    /(?:to|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    /(?:paid\s+to|received\s+from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
  ];

  for (const pattern of patterns) {
    const match = narration.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract location (for GST state determination)
 */
function extractLocation(narration: string): string | undefined {
  // Look for state names or codes
  const stateNames = Object.values(INDIAN_STATES || {});
  const stateCodes = Object.keys(INDIAN_STATES || {});

  const lower = narration.toLowerCase();

  for (const state of stateNames) {
    if (lower.includes(state.toLowerCase())) {
      return state;
    }
  }

  for (const code of stateCodes) {
    if (lower.includes(code.toLowerCase())) {
      return code;
    }
  }

  return undefined;
}
