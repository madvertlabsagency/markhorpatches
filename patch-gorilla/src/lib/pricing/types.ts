import type { ModifierType } from "@/generated/prisma/enums";

export type { ModifierType };

export interface PriceModifier {
  code: string;
  name: string;
  modifierType: ModifierType;
  /** cents for FIXED / PER_UNIT, basis points for PERCENT */
  modifierValue: number;
}

export interface SizeTierRow {
  id: string;
  label: string;
  maxSizeIn: number;
}

export interface QuantityTierRow {
  id: string;
  minQuantity: number;
}

export interface MatrixCell {
  sizeTierId: string;
  quantityTierId: string;
  unitPriceCents: number;
}

export interface PriceTable {
  patchTypeCode: string;
  sizeTiers: SizeTierRow[];
  quantityTiers: QuantityTierRow[];
  cells: MatrixCell[];
}

export interface CouponInput {
  code: string;
  type: "PERCENT" | "FIXED";
  /** bps for PERCENT, cents for FIXED */
  value: number;
  minSubtotalCents: number;
}

export interface LinePriceInput {
  table: PriceTable;
  widthIn: number;
  heightIn: number;
  quantity: number;
  modifiers: PriceModifier[];
}

export interface ModifierBreakdown {
  code: string;
  name: string;
  kind: ModifierType;
  perUnitCents: number;
  fixedCents: number;
}

export interface LinePrice {
  quotedSizeIn: number;
  sizeTierId: string;
  quantityTierId: string;
  baseUnitCents: number;
  unitPriceCents: number;
  quantity: number;
  fixedChargesCents: number;
  lineSubtotalCents: number;
  /** Savings vs. buying the same quantity at the smallest quantity tier's unit price. */
  savingsCents: number;
  modifiers: ModifierBreakdown[];
}

export interface OrderTotalsInput {
  lines: { lineSubtotalCents: number }[];
  coupon?: CouponInput | null;
  shippingCents: number;
  /** Tax rate in basis points (e.g. 725 = 7.25%). */
  taxRateBps: number;
  taxShipping?: boolean;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}
