import { toMinor } from "@/lib/money";

type Q = { quantity: number; unitPrice: number; setupFee: number; sampleFee: number; toolingFee: number; artworkFee: number; shipping: number; currency: string };

/** Integer-minor-unit quote totals. Shared with the client builder for live preview. */
export function computeQuoteTotals(q: Q) {
  const unit = toMinor(q.unitPrice, q.currency);
  const lines = [
    { label: "Patches", quantity: q.quantity, unitMinor: unit, totalMinor: unit * q.quantity },
    { label: "Setup", quantity: 1, unitMinor: toMinor(q.setupFee, q.currency), totalMinor: toMinor(q.setupFee, q.currency) },
    { label: "Sample", quantity: 1, unitMinor: toMinor(q.sampleFee, q.currency), totalMinor: toMinor(q.sampleFee, q.currency) },
    { label: "Tooling / mould", quantity: 1, unitMinor: toMinor(q.toolingFee, q.currency), totalMinor: toMinor(q.toolingFee, q.currency) },
    { label: "Artwork / digitising", quantity: 1, unitMinor: toMinor(q.artworkFee, q.currency), totalMinor: toMinor(q.artworkFee, q.currency) },
    { label: "Shipping", quantity: 1, unitMinor: toMinor(q.shipping, q.currency), totalMinor: toMinor(q.shipping, q.currency) },
  ];
  return { unitMinor: unit, lines: lines.filter((l, i) => i === 0 || l.totalMinor > 0), totalMinor: lines.reduce((a, l) => a + l.totalMinor, 0) };
}

