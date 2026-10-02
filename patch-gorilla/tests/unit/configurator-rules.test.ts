import { describe, expect, it } from "vitest";
import { allowedBackings, allowedBorders, reconcile, requiresBorder, selectedModifiers, validateConfig, type ConfigState } from "@/lib/configurator/rules";
import { quoteConfiguration } from "@/lib/pricing/quote";
import { addBusinessDays, estimateDelivery } from "@/lib/configurator/delivery";
import { canTransition } from "@/lib/orders/status";
import { buildFixture } from "../fixtures/catalog";

const { catalog, tables, id } = buildFixture();

const base = (over: Partial<ConfigState> = {}): ConfigState => ({
  patchTypeId: id("pt", "EMBROIDERED"), widthIn: 3, heightIn: 3, quantity: 100, shape: "CIRCLE",
  backingId: id("bk", "IRON_ON"), borderId: id("br", "MERROWED"), extraIds: [], ...over,
});

describe("option compatibility", () => {
  it("PVC excludes iron-on and has no border step", () => {
    const pvc = catalog.patchTypes.find((p) => p.code === "PVC")!;
    expect(allowedBackings(catalog, pvc).map((b) => b.code)).not.toContain("IRON_ON");
    expect(requiresBorder(catalog, pvc)).toBe(false);
  });
  it("merrowed border is not offered for custom shapes", () => {
    const emb = catalog.patchTypes.find((p) => p.code === "EMBROIDERED")!;
    expect(allowedBorders(catalog, emb, "CUSTOM").map((b) => b.code)).toEqual(["HEAT_CUT", "LASER_CUT"]);
    expect(allowedBorders(catalog, emb, "CIRCLE").map((b) => b.code)).toContain("MERROWED");
  });
  it("leather only offers laser cut", () => {
    const leather = catalog.patchTypes.find((p) => p.code === "LEATHER")!;
    expect(allowedBorders(catalog, leather, "CIRCLE").map((b) => b.code)).toEqual(["LASER_CUT"]);
  });
});

describe("validateConfig", () => {
  it("accepts a valid embroidered config", () => {
    expect(validateConfig(catalog, base())).toEqual([]);
  });
  it("flags quantity below the patch-type minimum", () => {
    const v = validateConfig(catalog, base({ patchTypeId: id("pt", "PVC"), borderId: null, backingId: id("bk", "SEW_ON"), quantity: 25 }));
    expect(v.map((x) => x.field)).toContain("quantity");
  });
  it("flags out-of-range size", () => {
    const v = validateConfig(catalog, base({ widthIn: 14, heightIn: 14 }));
    expect(v.find((x) => x.field === "size")).toBeTruthy();
  });
  it("flags incompatible backing", () => {
    const v = validateConfig(catalog, base({ patchTypeId: id("pt", "PVC"), borderId: null, quantity: 100 }));
    expect(v.map((x) => x.field)).toEqual(["backing"]);
  });
  it("flags a border on a borderless patch type", () => {
    const v = validateConfig(catalog, base({ patchTypeId: id("pt", "PVC"), backingId: id("bk", "SEW_ON") }));
    expect(v.map((x) => x.field)).toEqual(["border"]);
  });
});

describe("reconcile on patch-type switch", () => {
  it("resets ONLY the incompatible properties", () => {
    const { state, resets } = reconcile(catalog, base({ patchTypeId: id("pt", "PVC"), extraIds: [id("ex", "METALLIC_THREAD"), id("ex", "RUSH")] }));
    expect(state.backingId).toBeNull(); // iron-on invalid for PVC
    expect(state.borderId).toBeNull(); // PVC has no border
    expect(state.extraIds).toEqual([id("ex", "RUSH")]); // rush kept
    expect(state.shape).toBe("CIRCLE"); // untouched
    expect(state.widthIn).toBe(3);
    expect(resets.map((r) => r.field).sort()).toEqual(["backing", "border", "extras"]);
  });
  it("bumps quantity to the new minimum", () => {
    const { state, resets } = reconcile(catalog, base({ patchTypeId: id("pt", "PVC"), quantity: 10, backingId: null, borderId: null }));
    expect(state.quantity).toBe(50);
    expect(resets.map((r) => r.field)).toEqual(["quantity"]);
  });
  it("clears merrowed border when switching to a custom shape", () => {
    const { state, resets } = reconcile(catalog, base({ shape: "CUSTOM" }));
    expect(state.borderId).toBeNull();
    expect(resets[0].field).toBe("border");
  });
  it("is a no-op for a compatible config", () => {
    expect(reconcile(catalog, base()).resets).toEqual([]);
  });
});

describe("quoteConfiguration", () => {
  it("prices with selected modifiers", () => {
    const q = quoteConfiguration(catalog, tables, base());
    expect(q.ok).toBe(true);
    if (q.ok) expect(q.line.unitPriceCents).toBe(295 + 15);
    expect(selectedModifiers(catalog, base()).map((m) => m.code)).toEqual(["IRON_ON", "MERROWED"]);
  });
  it("partial mode prices before backing/border are chosen", () => {
    const q = quoteConfiguration(catalog, tables, base({ backingId: null, borderId: null, shape: null }), { partial: true });
    expect(q.ok).toBe(true);
  });
  it("rush shortens production days", () => {
    const q = quoteConfiguration(catalog, tables, base({ extraIds: [id("ex", "RUSH")] }));
    expect(q.ok && q.rush && q.productionDays).toBe(6);
  });
});

describe("delivery & status rules", () => {
  it("skips weekends", () => {
    const fri = new Date(2026, 9, 2); // Fri Oct 2 2026
    expect(addBusinessDays(fri, 1).getDay()).toBe(1);
  });
  it("estimates a delivery window", () => {
    const e = estimateDelivery({ productionDays: 10, rushProductionDays: 6, rush: false, transitDaysMin: 3, transitDaysMax: 5, from: new Date(2026, 9, 1) });
    expect(e.latest > e.earliest).toBe(true);
    expect(e.totalBusinessDaysMax).toBe(16);
  });
  it("blocks production without approval and payment", () => {
    expect(canTransition("PAID", "IN_PRODUCTION", { paymentStatus: "PAID", allProofsApproved: false }).ok).toBe(false);
    expect(canTransition("PROOF_APPROVED", "IN_PRODUCTION", { paymentStatus: "UNPAID", allProofsApproved: true }).ok).toBe(false);
    expect(canTransition("PROOF_APPROVED", "IN_PRODUCTION", { paymentStatus: "PAID", allProofsApproved: true }).ok).toBe(true);
    expect(canTransition("DELIVERED", "IN_PRODUCTION", { paymentStatus: "PAID", allProofsApproved: true }).ok).toBe(false);
  });
});
