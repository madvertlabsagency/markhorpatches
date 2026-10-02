/**
 * PATCH GORILLA PRICING ENGINE — pure, deterministic, integer-cents only.
 *
 * Formula (in this exact order):
 *   1. baseUnitPrice      ← price matrix [patchType × sizeTier × quantityTier]
 *   2. + per-unit modifiers (PER_UNIT cents, PERCENT bps of the base unit price)
 *   3. × quantity
 *   4. + fixed charges    (FIXED modifiers, once per line)
 *   5. − discounts        (coupon, applied to merchandise subtotal)
 *   6. + shipping
 *   7. + tax
 *
 * The same functions run in the browser (live estimates) and on the server
 * (authoritative totals). The server ALWAYS recomputes before checkout.
 */
import { applyBps } from "@/lib/money";
import type {
  CouponInput,
  LinePrice,
  LinePriceInput,
  MatrixCell,
  ModifierBreakdown,
  OrderTotals,
  OrderTotalsInput,
  PriceTable,
  QuantityTierRow,
  SizeTierRow,
} from "./types";

export class PricingError extends Error {
  constructor(
    public code: "SIZE_OUT_OF_RANGE" | "QUANTITY_TOO_LOW" | "NO_PRICE" | "INVALID_INPUT",
    message: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

/** Industry-standard quoted size: average of width and height, rounded to 2 decimals. */
export function quotedSize(widthIn: number, heightIn: number): number {
  if (!(widthIn > 0) || !(heightIn > 0)) throw new PricingError("INVALID_INPUT", "Width and height must be positive.");
  return Math.round(((widthIn + heightIn) / 2) * 100) / 100;
}

export function findSizeTier(tiers: SizeTierRow[], sizeIn: number): SizeTierRow {
  const sorted = [...tiers].sort((a, b) => a.maxSizeIn - b.maxSizeIn);
  const tier = sorted.find((t) => sizeIn <= t.maxSizeIn + 1e-9);
  if (!tier) {
    const max = sorted.at(-1)?.maxSizeIn ?? 0;
    throw new PricingError("SIZE_OUT_OF_RANGE", `Sizes above ${max}" need a custom quote.`);
  }
  return tier;
}

export function findQuantityTier(tiers: QuantityTierRow[], quantity: number): QuantityTierRow {
  const sorted = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
  const tier = sorted.find((t) => quantity >= t.minQuantity);
  if (!tier) {
    const min = sorted.at(-1)?.minQuantity ?? 0;
    throw new PricingError("QUANTITY_TOO_LOW", `Minimum quantity is ${min}.`);
  }
  return tier;
}

function cell(table: PriceTable, sizeTierId: string, quantityTierId: string): MatrixCell | undefined {
  return table.cells.find((c) => c.sizeTierId === sizeTierId && c.quantityTierId === quantityTierId);
}

export function baseUnitPrice(table: PriceTable, sizeIn: number, quantity: number) {
  const sizeTier = findSizeTier(table.sizeTiers, sizeIn);
  const qtyTier = findQuantityTier(table.quantityTiers, quantity);
  const c = cell(table, sizeTier.id, qtyTier.id);
  if (!c) throw new PricingError("NO_PRICE", `No price configured for ${table.patchTypeCode} at ${sizeTier.label} / ${qtyTier.minQuantity}+.`);
  return { sizeTier, qtyTier, unitPriceCents: c.unitPriceCents };
}

export function priceLine(input: LinePriceInput): LinePrice {
  const { table, widthIn, heightIn, quantity, modifiers } = input;
  if (!Number.isInteger(quantity) || quantity <= 0) throw new PricingError("INVALID_INPUT", "Quantity must be a whole number above zero.");

  const size = quotedSize(widthIn, heightIn);
  const { sizeTier, qtyTier, unitPriceCents: base } = baseUnitPrice(table, size, quantity);

  const breakdown: ModifierBreakdown[] = modifiers.map((m) => {
    switch (m.modifierType) {
      case "PER_UNIT":
        return { code: m.code, name: m.name, kind: m.modifierType, perUnitCents: m.modifierValue, fixedCents: 0 };
      case "PERCENT":
        return { code: m.code, name: m.name, kind: m.modifierType, perUnitCents: applyBps(base, m.modifierValue), fixedCents: 0 };
      case "FIXED":
        return { code: m.code, name: m.name, kind: m.modifierType, perUnitCents: 0, fixedCents: m.modifierValue };
    }
  });

  const unit = base + breakdown.reduce((s, b) => s + b.perUnitCents, 0);
  const fixed = breakdown.reduce((s, b) => s + b.fixedCents, 0);
  const lineSubtotal = unit * quantity + fixed;

  // Savings: same options, but priced at the entry quantity tier.
  const entryTier = [...table.quantityTiers].sort((a, b) => a.minQuantity - b.minQuantity)[0];
  let savings = 0;
  if (entryTier && entryTier.id !== qtyTier.id) {
    const entryCell = cell(table, sizeTier.id, entryTier.id);
    if (entryCell) {
      const entryBase = entryCell.unitPriceCents;
      const entryUnit =
        entryBase +
        modifiers.reduce((s, m) => s + (m.modifierType === "PER_UNIT" ? m.modifierValue : m.modifierType === "PERCENT" ? applyBps(entryBase, m.modifierValue) : 0), 0);
      savings = Math.max(0, (entryUnit - unit) * quantity);
    }
  }

  return {
    quotedSizeIn: size,
    sizeTierId: sizeTier.id,
    quantityTierId: qtyTier.id,
    baseUnitCents: base,
    unitPriceCents: unit,
    quantity,
    fixedChargesCents: fixed,
    lineSubtotalCents: lineSubtotal,
    savingsCents: savings,
    modifiers: breakdown,
  };
}

export function couponDiscount(subtotalCents: number, coupon: CouponInput | null | undefined): number {
  if (!coupon || subtotalCents <= 0) return 0;
  if (subtotalCents < coupon.minSubtotalCents) return 0;
  const raw = coupon.type === "PERCENT" ? applyBps(subtotalCents, coupon.value) : coupon.value;
  return Math.min(Math.max(raw, 0), subtotalCents);
}

export function orderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = input.lines.reduce((s, l) => s + l.lineSubtotalCents, 0);
  const discount = couponDiscount(subtotal, input.coupon);
  const shipping = Math.max(0, input.shippingCents);
  const taxable = subtotal - discount + (input.taxShipping ? shipping : 0);
  const tax = Math.max(0, applyBps(taxable, input.taxRateBps));
  return {
    subtotalCents: subtotal,
    discountCents: discount,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: subtotal - discount + shipping + tax,
  };
}

/** Lowest unit price available for a patch type, used for "FROM $X.XX / EA". */
export function startingUnitPrice(table: PriceTable): number | null {
  if (!table.cells.length) return null;
  return Math.min(...table.cells.map((c) => c.unitPriceCents));
}

/** Unit price at a given representative size for every quantity tier — for pricing tables. */
export function priceLadder(table: PriceTable, sizeIn: number) {
  const sizeTier = findSizeTier(table.sizeTiers, sizeIn);
  return [...table.quantityTiers]
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .map((q) => ({ minQuantity: q.minQuantity, unitPriceCents: cell(table, sizeTier.id, q.id)?.unitPriceCents ?? null }));
}
