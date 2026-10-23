/**
 * Hypothetical unit-economics simulator. Every output is an illustration of the
 * inputs — not a prediction, target or promise. The UI labels it as such.
 */
export interface ForecastInputs {
  dailyAdSpendMinor: number;
  rawCplMinor: number;
  qualificationRate: number; // 0..1
  matchRate: number; // 0..1, share of qualified RFQs with ≥1 eligible seller
  sellThroughRate: number; // 0..1, share of matched RFQs purchased
  avgUnlockMinor: number;
  unlocksPerRfq: number; // 1 for exclusive
  refundRate: number; // 0..1, share of sold unlocks refunded/credited
  variableCostPerSoldMinor: number;
  sellerDemandCap?: number | null; // max unlocks sellers will buy per day (null = unconstrained)
}

export const DEFAULT_FORECAST: ForecastInputs = {
  dailyAdSpendMinor: 30_000,
  rawCplMinor: 300,
  qualificationRate: 0.7,
  matchRate: 1,
  sellThroughRate: 0.7,
  avgUnlockMinor: 2500,
  unlocksPerRfq: 1,
  refundRate: 0,
  variableCostPerSoldMinor: 200,
  sellerDemandCap: null,
};

export interface ForecastDay {
  rawLeads: number;
  qualified: number;
  matched: number;
  sold: number;
  unlocks: number;
  grossRevenueMinor: number;
  refundsMinor: number;
  netRevenueMinor: number;
  adSpendMinor: number;
  variableCostMinor: number;
  contributionMinor: number;
  effectiveCostPerSoldMinor: number | null;
  revenuePerSoldMinor: number | null;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function forecastDay(i: ForecastInputs): ForecastDay {
  const rawLeads = i.rawCplMinor > 0 ? i.dailyAdSpendMinor / i.rawCplMinor : 0;
  const qualified = rawLeads * i.qualificationRate;
  const matched = qualified * i.matchRate;
  let unlocks = matched * i.sellThroughRate * Math.max(1, i.unlocksPerRfq);
  if (i.sellerDemandCap != null) unlocks = Math.min(unlocks, i.sellerDemandCap);
  const sold = unlocks / Math.max(1, i.unlocksPerRfq);
  const gross = Math.round(unlocks * i.avgUnlockMinor);
  const refunds = Math.round(gross * i.refundRate);
  const net = gross - refunds;
  const variable = Math.round(unlocks * i.variableCostPerSoldMinor);
  const contribution = net - i.dailyAdSpendMinor - variable;
  return {
    rawLeads: r1(rawLeads),
    qualified: r1(qualified),
    matched: r1(matched),
    sold: r1(sold),
    unlocks: r1(unlocks),
    grossRevenueMinor: gross,
    refundsMinor: refunds,
    netRevenueMinor: net,
    adSpendMinor: i.dailyAdSpendMinor,
    variableCostMinor: variable,
    contributionMinor: contribution,
    effectiveCostPerSoldMinor: unlocks > 0 ? Math.round((i.dailyAdSpendMinor + variable) / unlocks) : null,
    revenuePerSoldMinor: unlocks > 0 ? Math.round(net / unlocks) : null,
  };
}

export function forecastPeriod(i: ForecastInputs, days: number) {
  const d = forecastDay(i);
  const scale = (n: number) => Math.round(n * days);
  return {
    days,
    rawLeads: scale(d.rawLeads),
    qualified: scale(d.qualified),
    sold: scale(d.sold),
    grossRevenueMinor: scale(d.grossRevenueMinor),
    netRevenueMinor: scale(d.netRevenueMinor),
    adSpendMinor: scale(d.adSpendMinor),
    variableCostMinor: scale(d.variableCostMinor),
    contributionMinor: scale(d.contributionMinor),
  };
}
