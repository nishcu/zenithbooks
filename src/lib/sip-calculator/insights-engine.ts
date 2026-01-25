/**
 * Dynamic Insights Generation Engine
 * Generates data-driven insights for SIP investments
 */

import type { SIPInput, SIPLot, RedemptionLot, SIPInsight, ExitSimulation, CapitalGainsSummary } from "./types";
import { getTaxRules } from "../asset-tax-calculator/config/tax-rules";
import { format } from "date-fns";

const EQUITY_TYPES = ["equity_mf", "etf", "index_fund"];

/**
 * Generate insights based on investment data
 */
export function generateInsights(
  input: SIPInput,
  lots: SIPLot[],
  redeemedLots: RedemptionLot[],
  capitalGains: CapitalGainsSummary,
  exitSimulations: ExitSimulation[]
): SIPInsight[] {
  const insights: SIPInsight[] = [];
  const rules = getTaxRules();
  const isEquityType = EQUITY_TYPES.includes(input.investmentType) || 
    (input.investmentType === "hybrid_mf" && (input.equityPercentage ?? 0) > 65);
  const thresholdMonths = isEquityType ? rules.equityStcgMonths : rules.nonEquityLtcgMonths;

  // Insight 1: LTCG eligibility dates
  const sortedLots = [...lots].sort((a, b) => 
    new Date(a.installmentDate).getTime() - new Date(b.installmentDate).getTime()
  );
  
  const upcomingLTCGDates: Array<{ date: string; units: number; percent: number }> = [];
  for (const lot of sortedLots) {
    if (lot.isShortTerm) {
      const lotDate = new Date(lot.installmentDate);
      const ltcgDate = new Date(lotDate);
      ltcgDate.setMonth(ltcgDate.getMonth() + thresholdMonths + 1);
      
      if (ltcgDate <= new Date(input.exitDate)) {
        const totalUnits = lots.reduce((sum, l) => sum + l.units, 0);
        const percent = totalUnits > 0 ? (lot.units / totalUnits) * 100 : 0;
        upcomingLTCGDates.push({
          date: ltcgDate.toISOString().slice(0, 10),
          units: lot.units,
          percent,
        });
      }
    }
  }

  if (upcomingLTCGDates.length > 0) {
    const nextLTCG = upcomingLTCGDates[0];
    insights.push({
      type: "ltcg_eligibility",
      title: "LTCG Eligibility Window",
      description: `${nextLTCG.percent.toFixed(1)}% of your SIP units (${nextLTCG.units.toFixed(2)} units) will become LTCG-eligible after ${format(new Date(nextLTCG.date), "dd-MMM-yyyy")}.`,
      relevantDate: nextLTCG.date,
      actionable: `Consider delaying exit until after ${format(new Date(nextLTCG.date), "dd-MMM-yyyy")} to benefit from lower LTCG tax rates.`,
    });
  }

  // Insight 2: Tax savings from waiting
  if (exitSimulations.length > 1) {
    const currentSim = exitSimulations.find(s => s.exitDate === input.exitDate) || exitSimulations[0];
    const optimalSim = exitSimulations.find(s => s.isOptimal);
    
    if (optimalSim && optimalSim.exitDate !== currentSim.exitDate) {
      const taxSavings = currentSim.taxLiability - optimalSim.taxLiability;
      if (taxSavings > 0) {
        insights.push({
          type: "tax_savings",
          title: "Tax Savings Opportunity",
          description: `Exiting on ${format(new Date(optimalSim.exitDate), "dd-MMM-yyyy")} instead of ${format(new Date(currentSim.exitDate), "dd-MMM-yyyy")} can save ₹${Math.round(taxSavings).toLocaleString("en-IN")} in taxes.`,
          impactAmount: taxSavings,
          impactPercent: currentSim.taxLiability > 0 ? (taxSavings / currentSim.taxLiability) * 100 : 0,
          actionable: `Post-tax value increases from ₹${Math.round(currentSim.postTaxValue).toLocaleString("en-IN")} to ₹${Math.round(optimalSim.postTaxValue).toLocaleString("en-IN")}.`,
        });
      }
    }
  }

  // Insight 3: Exemption usage
  if (capitalGains.exemptions > 0) {
    insights.push({
      type: "exemption_usage",
      title: "Equity LTCG Exemption Applied",
      description: `₹${(capitalGains.exemptions / 1_00_000).toFixed(2)} Lakh exemption applied on LTCG. This reduces your taxable LTCG from ₹${((capitalGains.ltcgAmount) / 1_00_000).toFixed(2)} Lakh to ₹${((capitalGains.taxableLTCG) / 1_00_000).toFixed(2)} Lakh.`,
      impactAmount: capitalGains.exemptions * (rules.equityLtcgRate / 100),
    });
  }

  // Insight 4: FIFO breakdown
  if (redeemedLots.length > 0) {
    const stcgLots = redeemedLots.filter(l => l.gainType === "STCG");
    const ltcgLots = redeemedLots.filter(l => l.gainType === "LTCG");
    
    if (stcgLots.length > 0 && ltcgLots.length > 0) {
      insights.push({
        type: "fifo_breakdown",
        title: "FIFO Redemption Breakdown",
        description: `Under FIFO, ${stcgLots.length} lot(s) are STCG (₹${Math.round(capitalGains.stcgAmount).toLocaleString("en-IN")}) and ${ltcgLots.length} lot(s) are LTCG (₹${Math.round(capitalGains.ltcgAmount).toLocaleString("en-IN")}).`,
      });
    }
  }

  // Insight 5: CAGR impact
  if (exitSimulations.length > 1) {
    const currentSim = exitSimulations.find(s => s.exitDate === input.exitDate) || exitSimulations[0];
    const bestCAGRSim = exitSimulations.reduce((best, sim) => 
      sim.postTaxCAGR > best.postTaxCAGR ? sim : best
    );
    
    if (bestCAGRSim.postTaxCAGR > currentSim.postTaxCAGR) {
      const cagrImprovement = bestCAGRSim.postTaxCAGR - currentSim.postTaxCAGR;
      insights.push({
        type: "cagr_impact",
        title: "Post-Tax CAGR Optimization",
        description: `Post-tax CAGR improves by ${cagrImprovement.toFixed(2)}% (from ${currentSim.postTaxCAGR.toFixed(2)}% to ${bestCAGRSim.postTaxCAGR.toFixed(2)}%) by exiting on ${format(new Date(bestCAGRSim.exitDate), "dd-MMM-yyyy")}.`,
        impactPercent: cagrImprovement,
        actionable: `Tax drag reduces from ${currentSim.taxDragPercent.toFixed(2)}% to ${bestCAGRSim.taxDragPercent.toFixed(2)}%.`,
      });
    }
  }

  return insights;
}
