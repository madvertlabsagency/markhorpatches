/** All money in Markhor Patches is integer cents. These helpers are the only place we format it. */

export function formatUSD(cents: number, opts: { compact?: boolean } = {}): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.compact && Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/** Round-half-up integer math for basis points (1 bp = 0.01%). */
export function applyBps(cents: number, bps: number): number {
  return Math.round((cents * bps) / 10_000);
}

export function dollarsToCents(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${input}`);
  return Math.round(n * 100);
}

export function centsToDollarString(cents: number): string {
  return (cents / 100).toFixed(2);
}
