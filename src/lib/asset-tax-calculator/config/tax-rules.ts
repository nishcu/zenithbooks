/**
 * Config-driven Tax Rules – India
 * Update annually; easy to maintain.
 */

import type { TaxRulesConfig } from "../types";

/** Cost Inflation Index (base year 2001-02 = 100). Source: CBDT. */
const CII: Record<string, number> = {
  "2001-02": 100, "2002-03": 105, "2003-04": 109, "2004-05": 113,
  "2005-06": 117, "2006-07": 122, "2007-08": 129, "2008-09": 137,
  "2009-10": 148, "2010-11": 167, "2011-12": 184, "2012-13": 200,
  "2013-14": 220, "2014-15": 240, "2015-16": 254, "2016-17": 264,
  "2017-18": 272, "2018-19": 280, "2019-20": 289, "2020-21": 301,
  "2021-22": 317, "2022-23": 331, "2023-24": 348, "2024-25": 363,
  "2025-26": 378, // Estimated (update when official CII is announced by CBDT)
};

/** Old regime slabs (FY 2024-25). Individual < 60. */
const SLAB_RATES = [
  { from: 0, to: 250_000, rate: 0 },
  { from: 250_001, to: 500_000, rate: 5 },
  { from: 500_001, to: 1_000_000, rate: 20 },
  { from: 1_000_001, to: Infinity, rate: 30 },
];

const SURCHARGE_BANDS = [
  { minIncome: 0, rate: 0 },
  { minIncome: 5_000_000, rate: 0.1 },
  { minIncome: 10_000_000, rate: 0.15 },
  { minIncome: 20_000_000, rate: 0.25 },
  { minIncome: 50_000_000, rate: 0.37 },
];

export const TAX_RULES_2024_25: TaxRulesConfig = {
  financialYear: "2024-25",
  equityStcgMonths: 12,
  equityLtcgExemption: 125_000,
  equityStcgRate: 15,
  equityLtcgRate: 10,
  debtMfSlabEffectiveFrom: "2023-04-01",
  nonEquityLtcgMonths: 24,
  nonEquityLtcgRate: 20,
  cii: CII,
  slabRates: SLAB_RATES,
  cessRate: 0.04,
  surchargeBands: SURCHARGE_BANDS,
};

/** Default config. Swap per FY as needed. */
let currentConfig: TaxRulesConfig = TAX_RULES_2024_25;

export function getTaxRules(): TaxRulesConfig {
  return currentConfig;
}

export function setTaxRules(config: TaxRulesConfig): void {
  currentConfig = config;
}

export function getCIIForFY(fy: string): number | undefined {
  return currentConfig.cii[fy];
}

/** FY string from date (e.g. 2024-04-15 → 2024-25). */
export function getFYFromDate(isoDate: string): string {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (m >= 4) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}
