import { describe, expect, it } from "vitest";
import { baseUnitPrice, couponDiscount, findQuantityTier, findSizeTier, orderTotals, priceLadder, priceLine, PricingError, quotedSize, startingUnitPrice } from "@/lib/pricing/engine";
import { applyBps, dollarsToCents, formatUSD } from "@/lib/money";
import { buildFixture } from "../fixtures/catalog";

const { tables } = buildFixture();
const EMB = tables["pt_EMBROIDERED"];
const PVC = tables["pt_PVC"];

describe("size calculations", () => {
  it("quotes size as the average of width and height", () => {
    expect(quotedSize(3, 2)).toBe(2.5);
    expect(quotedSize(3, 3)).toBe(3);
    expect(quotedSize(4.25, 2.1)).toBe(3.18);
  });
  it("rejects non-positive dimensions", () => {
    expect(() => quotedSize(0, 3)).toThrow(PricingError);
    expect(() => quotedSize(-1, 3)).toThrow(PricingError);
  });
  it("selects the smallest size tier that fits", () => {
    expect(findSizeTier(EMB.sizeTiers, 3).maxSizeIn).toBe(3);
    expect(findSizeTier(EMB.sizeTiers, 3.01).maxSizeIn).toBe(3.5);
    expect(findSizeTier(EMB.sizeTiers, 0.5).maxSizeIn).toBe(1);
  });
  it("throws for sizes larger than the largest tier", () => {
    expect(() => findSizeTier(PVC.sizeTiers, 9)).toThrow(/custom quote/);
  });
});

describe("quantity tiers", () => {
  it("selects the largest tier at or below the quantity", () => {
    expect(findQuantityTier(EMB.quantityTiers, 50).minQuantity).toBe(50);
    expect(findQuantityTier(EMB.quantityTiers, 99).minQuantity).toBe(50);
    expect(findQuantityTier(EMB.quantityTiers, 100).minQuantity).toBe(100);
    expect(findQuantityTier(EMB.quantityTiers, 7000).minQuantity).toBe(5000);
  });
  it("enforces the minimum", () => {
    expect(() => findQuantityTier(PVC.quantityTiers, 25)).toThrow(/Minimum quantity is 50/);
  });
});

describe("seed anchor prices (3 inch)", () => {
  const cases: [string, number, number][] = [
    ["EMBROIDERED", 50, 425], ["EMBROIDERED", 100, 295], ["EMBROIDERED", 1000, 110],
    ["WOVEN", 300, 155], ["PVC", 500, 185], ["LEATHER", 200, 395], ["CHENILLE", 1000, 115],
  ];
  it.each(cases)("%s × %i = %i¢", (code, qty, cents) => {
    expect(baseUnitPrice(tables[`pt_${code}`], 3, qty).unitPriceCents).toBe(cents);
  });
});

describe("priceLine", () => {
  it("prices a plain line: unit × quantity", () => {
    const l = priceLine({ table: EMB, widthIn: 3, heightIn: 3, quantity: 100, modifiers: [] });
    expect(l.unitPriceCents).toBe(295);
    expect(l.lineSubtotalCents).toBe(29_500);
    expect(l.quotedSizeIn).toBe(3);
  });

  it("applies per-unit, percent and fixed modifiers in order", () => {
    const l = priceLine({
      table: EMB, widthIn: 3, heightIn: 3, quantity: 100,
      modifiers: [
        { code: "IRON_ON", name: "Iron-On", modifierType: "PER_UNIT", modifierValue: 15 },
        { code: "RUSH", name: "Rush", modifierType: "PERCENT", modifierValue: 2500 },
        { code: "SETUP", name: "Setup", modifierType: "FIXED", modifierValue: 3500 },
      ],
    });
    // base 295 + 15 + round(295 * 25%) = 295 + 15 + 74 = 384
    expect(l.unitPriceCents).toBe(384);
    expect(l.fixedChargesCents).toBe(3500);
    expect(l.lineSubtotalCents).toBe(384 * 100 + 3500);
    expect(l.modifiers.map((m) => m.code)).toEqual(["IRON_ON", "RUSH", "SETUP"]);
  });

  it("percent modifiers are based on the base unit price, not compounding", () => {
    const l = priceLine({
      table: EMB, widthIn: 3, heightIn: 3, quantity: 50,
      modifiers: [
        { code: "A", name: "A", modifierType: "PERCENT", modifierValue: 1000 },
        { code: "B", name: "B", modifierType: "PERCENT", modifierValue: 1000 },
      ],
    });
    expect(l.unitPriceCents).toBe(425 + 43 + 43);
  });

  it("reports savings vs the entry quantity tier", () => {
    const l = priceLine({ table: EMB, widthIn: 3, heightIn: 3, quantity: 100, modifiers: [] });
    expect(l.savingsCents).toBe((1000 - 295) * 100);
    const entry = priceLine({ table: EMB, widthIn: 3, heightIn: 3, quantity: 10, modifiers: [] });
    expect(entry.savingsCents).toBe(0);
  });

  it("uses the averaged size for tier selection but keeps integer cents", () => {
    const l = priceLine({ table: EMB, widthIn: 4, heightIn: 2, quantity: 200, modifiers: [] });
    expect(l.quotedSizeIn).toBe(3);
    expect(Number.isInteger(l.lineSubtotalCents)).toBe(true);
  });

  it("rejects fractional quantities", () => {
    expect(() => priceLine({ table: EMB, widthIn: 3, heightIn: 3, quantity: 10.5, modifiers: [] })).toThrow(PricingError);
  });
});

describe("discounts", () => {
  it("percent coupon", () => {
    expect(couponDiscount(20_000, { code: "X", type: "PERCENT", value: 1000, minSubtotalCents: 0 })).toBe(2000);
  });
  it("fixed coupon never exceeds subtotal", () => {
    expect(couponDiscount(1500, { code: "X", type: "FIXED", value: 5000, minSubtotalCents: 0 })).toBe(1500);
  });
  it("respects minimum subtotal", () => {
    expect(couponDiscount(9_999, { code: "X", type: "PERCENT", value: 1000, minSubtotalCents: 10_000 })).toBe(0);
  });
  it("no coupon → zero", () => {
    expect(couponDiscount(9_999, null)).toBe(0);
  });
});

describe("order totals", () => {
  it("subtotal → discount → shipping → tax", () => {
    const t = orderTotals({
      lines: [{ lineSubtotalCents: 29_500 }, { lineSubtotalCents: 10_500 }],
      coupon: { code: "TEN", type: "PERCENT", value: 1000, minSubtotalCents: 0 },
      shippingCents: 995,
      taxRateBps: 825,
    });
    expect(t.subtotalCents).toBe(40_000);
    expect(t.discountCents).toBe(4_000);
    expect(t.shippingCents).toBe(995);
    expect(t.taxCents).toBe(applyBps(36_000, 825));
    expect(t.totalCents).toBe(36_000 + 995 + 2970);
  });
  it("can tax shipping when configured", () => {
    const t = orderTotals({ lines: [{ lineSubtotalCents: 10_000 }], shippingCents: 1000, taxRateBps: 1000, taxShipping: true });
    expect(t.taxCents).toBe(1100);
  });
  it("empty order is zero", () => {
    expect(orderTotals({ lines: [], shippingCents: 0, taxRateBps: 0 }).totalCents).toBe(0);
  });
});

describe("display helpers", () => {
  it("starting price is the minimum cell", () => {
    expect(startingUnitPrice(EMB)).toBe(Math.min(...EMB.cells.map((c) => c.unitPriceCents)));
  });
  it("price ladder lists every quantity tier for a size", () => {
    const ladder = priceLadder(EMB, 3);
    expect(ladder[0]).toEqual({ minQuantity: 10, unitPriceCents: 1000 });
    expect(ladder).toHaveLength(EMB.quantityTiers.length);
  });
  it("money helpers", () => {
    expect(formatUSD(295)).toBe("$2.95");
    expect(dollarsToCents("$1,234.56")).toBe(123456);
    expect(applyBps(295, 2500)).toBe(74);
  });
});
