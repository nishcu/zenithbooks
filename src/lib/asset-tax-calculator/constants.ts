/**
 * Asset category labels and display strings
 */

import type { AssetCategory } from "./types";

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  equity_shares: "Equity Shares (Indian listed)",
  equity_mf: "Equity Mutual Funds (>65% equity)",
  debt_mf: "Debt Mutual Funds (post 1-Apr-2023 rules)",
  gold: "Gold (Physical, ETF, SGB)",
  silver: "Silver",
  commodities: "Commodities",
  real_estate: "Real Estate (Land / Building)",
  foreign_equity: "Foreign Equity (US stocks, ETFs)",
  foreign_property: "Foreign Property",
  crypto: "Crypto",
};
