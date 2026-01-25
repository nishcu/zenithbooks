/**
 * GST Engine
 * Detects and calculates GST for journal entries
 */

import type { GSTDetails, GSTConfig, GSTType } from "./types";
import { GST_KEYWORDS, GST_RATES, RCM_SERVICES, BLOCKED_CREDITS } from "./constants";

/**
 * Detect GST from narration
 */
export function detectGST(narration: string, amount: number, config: GSTConfig): GSTDetails | undefined {
  const lower = narration.toLowerCase();
  let isGSTApplicable = false;
  let gstRate: number | undefined;
  let isInclusive = false;
  let isRCM = false;
  let gstType: GSTType | undefined;

  // Check for GST keywords
  const hasGSTKeyword = lower.includes("gst") || 
    lower.includes("cgst") || 
    lower.includes("sgst") || 
    lower.includes("igst") ||
    lower.includes("tax");

  if (!hasGSTKeyword) {
    // No GST mentioned, return undefined
    return undefined;
  }

  isGSTApplicable = true;

  // Detect inclusive vs exclusive
  if (GST_KEYWORDS.inclusive.some((k) => lower.includes(k))) {
    isInclusive = true;
  } else if (GST_KEYWORDS.exclusive.some((k) => lower.includes(k))) {
    isInclusive = false;
  } else {
    // Default: assume exclusive for purchases, inclusive for sales
    isInclusive = lower.includes("sale") || lower.includes("sold");
  }

  // Detect GST rate
  for (const rate of Object.keys(GST_RATES)) {
    const rateNum = parseFloat(rate);
    if (lower.includes(`${rate}%`) || lower.includes(`gst ${rate}`) || lower.includes(`gst${rate}`)) {
      gstRate = rateNum;
      break;
    }
  }

  // If rate not detected, use default
  if (!gstRate) {
    // Determine if goods or services
    const isService = lower.includes("service") || 
      lower.includes("fees") || 
      lower.includes("consulting") ||
      lower.includes("professional");
    
    gstRate = isService ? config.defaultGSTRates.services : config.defaultGSTRates.goods;
  }

  // Detect CGST/SGST vs IGST
  if (GST_KEYWORDS.cgst_sgst.some((k) => lower.includes(k)) || 
      lower.includes("intra") || 
      lower.includes("within state") ||
      lower.includes("same state")) {
    gstType = "CGST_SGST";
  } else if (GST_KEYWORDS.igst.some((k) => lower.includes(k)) || 
             lower.includes("inter") || 
             lower.includes("interstate") ||
             lower.includes("different state")) {
    gstType = "IGST";
  } else {
    // Default: assume CGST/SGST (intra-state)
    gstType = "CGST_SGST";
  }

  // Detect RCM
  if (GST_KEYWORDS.rcm.some((k) => lower.includes(k)) || 
      RCM_SERVICES.some((service) => lower.includes(service))) {
    isRCM = true;
  }

  // Calculate GST amounts
  return calculateGSTAmounts(amount, gstRate, isInclusive, gstType, isRCM, narration, config);
}

/**
 * Calculate GST amounts
 */
function calculateGSTAmounts(
  amount: number,
  gstRate: number,
  isInclusive: boolean,
  gstType: GSTType,
  isRCM: boolean,
  narration: string,
  config: GSTConfig
): GSTDetails {
  let taxableValue: number;
  let totalGST: number;
  let cgstAmount: number | undefined;
  let sgstAmount: number | undefined;
  let igstAmount: number | undefined;

  if (isInclusive) {
    // GST included in amount: reverse calculate
    // amount = taxable + GST
    // amount = taxable + (taxable × rate/100)
    // amount = taxable × (1 + rate/100)
    // taxable = amount / (1 + rate/100)
    taxableValue = amount / (1 + gstRate / 100);
    totalGST = amount - taxableValue;
  } else {
    // GST exclusive: add GST to amount
    taxableValue = amount;
    totalGST = (taxableValue * gstRate) / 100;
  }

  // Split GST based on type
  if (gstType === "CGST_SGST") {
    cgstAmount = totalGST / 2;
    sgstAmount = totalGST / 2;
    igstAmount = undefined;
  } else {
    cgstAmount = undefined;
    sgstAmount = undefined;
    igstAmount = totalGST;
  }

  // Check ITC eligibility
  const itcEligible = checkITCEligibility(narration, config, isRCM);

  const totalAmount = isInclusive ? amount : amount + totalGST;

  return {
    isGSTApplicable: true,
    gstType,
    gstRate,
    isInclusive,
    taxableValue: Math.round(taxableValue * 100) / 100,
    cgstAmount: cgstAmount ? Math.round(cgstAmount * 100) / 100 : undefined,
    sgstAmount: sgstAmount ? Math.round(sgstAmount * 100) / 100 : undefined,
    igstAmount: igstAmount ? Math.round(igstAmount * 100) / 100 : undefined,
    totalGST: Math.round(totalGST * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    isRCM,
    itcEligible,
    blockedCredit: !itcEligible,
    reason: !itcEligible ? getBlockedCreditReason(narration, config) : undefined,
  };
}

/**
 * Check ITC eligibility
 */
function checkITCEligibility(narration: string, config: GSTConfig, isRCM: boolean): boolean {
  const lower = narration.toLowerCase();

  // Composition scheme: no ITC
  if (config.compositionScheme) {
    return false;
  }

  // Check blocked credits
  for (const blocked of BLOCKED_CREDITS) {
    if (lower.includes(blocked)) {
      return false;
    }
  }

  // RCM: ITC available if paid
  if (isRCM) {
    return true; // ITC available on RCM if tax is paid
  }

  // Default: ITC eligible
  return true;
}

/**
 * Get reason for blocked credit
 */
function getBlockedCreditReason(narration: string, config: GSTConfig): string | undefined {
  const lower = narration.toLowerCase();

  if (config.compositionScheme) {
    return "Composition scheme - ITC not available";
  }

  for (const blocked of BLOCKED_CREDITS) {
    if (lower.includes(blocked)) {
      return `ITC blocked for ${blocked} as per Section 17(5)`;
    }
  }

  return undefined;
}

/**
 * Calculate GST for an existing entry (post-processing)
 */
export function calculateGSTForEntry(
  amount: number,
  gstRate: number,
  isInclusive: boolean,
  gstType: "CGST_SGST" | "IGST",
  config: GSTConfig
): GSTDetails {
  return calculateGSTAmounts(
    amount,
    gstRate,
    isInclusive,
    gstType,
    false, // isRCM
    "", // narration
    config
  );
}

