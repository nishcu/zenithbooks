/**
 * FIFO Redemption Engine
 * Applies FIFO method to determine which lots are redeemed and their tax treatment
 */

import type { SIPInput, SIPLot, RedemptionLot, InvestmentType, GainType } from "./types";
import { calculateHoldingPeriods } from "./nav-unit-engine";
import { getTaxRules } from "../asset-tax-calculator/config/tax-rules";

const EQUITY_TYPES: InvestmentType[] = ["equity_mf", "etf", "index_fund"];

/**
 * Apply FIFO redemption logic
 * Returns redeemed lots in FIFO order with tax classification
 */
export function applyFIFORedemption(
  lots: SIPLot[],
  input: SIPInput,
  exitNAV: number
): RedemptionLot[] {
  // Sort lots by installment date (FIFO = oldest first)
  const sortedLots = [...lots].sort((a, b) => 
    new Date(a.installmentDate).getTime() - new Date(b.installmentDate).getTime()
  );

  // Calculate holding periods
  const lotsWithHolding = calculateHoldingPeriods(sortedLots, input.exitDate, input.investmentType);

  // Determine total units to redeem
  const totalUnits = lotsWithHolding.reduce((sum, lot) => sum + lot.units, 0);
  let unitsToRedeem: number;

  if (input.redemptionType === "Full") {
    unitsToRedeem = totalUnits;
  } else {
    // Partial redemption: calculate units from amount
    if (!input.partialRedemptionAmount) {
      throw new Error("Partial redemption amount is required for partial redemption");
    }
    unitsToRedeem = input.partialRedemptionAmount / exitNAV;
    if (unitsToRedeem > totalUnits) {
      unitsToRedeem = totalUnits; // Cap at available units
    }
  }

  // Apply FIFO: redeem from oldest lots first
  const redeemedLots: RedemptionLot[] = [];
  let remainingUnits = unitsToRedeem;

  for (const lot of lotsWithHolding) {
    if (remainingUnits <= 0) break;

    const unitsRedeemed = Math.min(lot.units, remainingUnits);
    const redemptionValue = unitsRedeemed * exitNAV;
    const investedAmount = (unitsRedeemed / lot.units) * lot.investedAmount;
    const gain = redemptionValue - investedAmount;

    // Classify gain type based on holding period and asset type
    const gainType = classifyGainType(lot, input.investmentType, input.equityPercentage);

    // Calculate taxable amount (will be computed in tax engine)
    const taxableAmount = gain; // Will be adjusted for exemptions in tax engine

    redeemedLots.push({
      ...lot,
      units: unitsRedeemed, // Only redeemed units
      investedAmount,
      currentValue: redemptionValue,
      gain,
      gainType,
      taxableAmount,
      taxPayable: 0, // Will be calculated in tax engine
    });

    remainingUnits -= unitsRedeemed;
  }

  return redeemedLots;
}

/**
 * Classify gain as STCG or LTCG based on holding period and asset type
 */
function classifyGainType(
  lot: SIPLot,
  investmentType: InvestmentType,
  equityPercentage?: number
): GainType {
  const rules = getTaxRules();

  // Check if it's equity-type (equity MF, ETF, index fund, or hybrid with >65% equity)
  const isEquityType = EQUITY_TYPES.includes(investmentType) || 
    (investmentType === "hybrid_mf" && (equityPercentage ?? 0) > 65);

  if (isEquityType) {
    return (lot.holdingMonths ?? 0) <= rules.equityStcgMonths ? "STCG" : "LTCG";
  } else {
    // Debt MF or hybrid with ≤65% equity
    return (lot.holdingMonths ?? 0) <= rules.nonEquityLtcgMonths ? "STCG" : "LTCG";
  }
}

/**
 * Calculate investment summary
 */
export function calculateInvestmentSummary(
  lots: SIPLot[],
  exitNAV: number,
  exitDate: string
): {
  totalInvested: number;
  totalUnits: number;
  currentNAV: number;
  marketValue: number;
  totalGain: number;
  totalGainPercent: number;
  numberOfLots: number;
  investmentPeriodDays: number;
  investmentPeriodMonths: number;
} {
  const totalInvested = lots.reduce((sum, lot) => sum + lot.investedAmount, 0);
  const totalUnits = lots.reduce((sum, lot) => sum + lot.units, 0);
  const marketValue = totalUnits * exitNAV;
  const totalGain = marketValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const startDate = new Date(lots[0]?.installmentDate || exitDate);
  const endDate = new Date(exitDate);
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const months = Math.floor(days / 30);

  return {
    totalInvested,
    totalUnits,
    currentNAV: exitNAV,
    marketValue,
    totalGain,
    totalGainPercent,
    numberOfLots: lots.length,
    investmentPeriodDays: days,
    investmentPeriodMonths: months,
  };
}
