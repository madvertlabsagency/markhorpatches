/** All money in PatchMatch AI is integer minor units + an ISO-4217 code. These helpers are the only place we format it. */

const MINOR_DIGITS: Record<string, number> = { USD: 2, PKR: 2, GBP: 2, EUR: 2, CAD: 2, AED: 2, JPY: 0 };

export function minorDigits(currency: string): number {
  return MINOR_DIGITS[currency.toUpperCase()] ?? 2;
}

export function formatMoney(minor: number, currency = "USD", opts: { compact?: boolean } = {}): string {
  const digits = minorDigits(currency);
  const major = minor / 10 ** digits;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: opts.compact && Number.isInteger(major) ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(major);
}

/** Parse a user-entered major-unit amount ("12.50", "$1,200") into minor units. */
export function toMinor(input: string | number, currency = "USD"): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${input}`);
  return Math.round(n * 10 ** minorDigits(currency));
}

export function toMajorString(minor: number, currency = "USD"): string {
  return (minor / 10 ** minorDigits(currency)).toFixed(minorDigits(currency));
}

/** Round-half-up integer math for basis points (1 bp = 0.01%). */
export function applyBps(minor: number, bps: number): number {
  return Math.round((minor * bps) / 10_000);
}
