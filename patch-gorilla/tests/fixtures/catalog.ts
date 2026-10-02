/** Builds an in-memory Catalog + price tables from the seed definitions (no DB). */
import type { Catalog } from "@/lib/configurator/rules";
import type { PriceTable } from "@/lib/pricing/types";
import { BACKINGS, BORDERS, EXTRAS, PATCH_TYPES, QUANTITY_TIERS, SIZE_TIERS, seedPriceCents } from "../../prisma/seed-catalog";

export function buildFixture() {
  const id = (p: string, c: string) => `${p}_${c}`;
  const catalog: Catalog = {
    patchTypes: PATCH_TYPES.map((p) => ({
      id: id("pt", p.code), code: p.code, slug: p.slug, name: p.name, shortName: p.shortName, shortDescription: p.shortDescription, bestUse: p.bestUse,
      imageUrl: null, minSizeIn: p.minSizeIn, maxSizeIn: p.maxSizeIn, minQuantity: p.minQuantity, productionDays: p.productionDays,
      rushProductionDays: p.rushProductionDays, allowedShapes: p.allowedShapes,
      backingIds: p.backings.map((c) => id("bk", c)), borderIds: p.borders.map((c) => id("br", c)), extraIds: p.extras.map((c) => id("ex", c)),
    })),
    backings: BACKINGS.map((b, i) => ({ ...b, id: id("bk", b.code), imageUrl: null, sortOrder: i })),
    borders: BORDERS.map((b, i) => ({ ...b, allowedShapes: [...b.allowedShapes], id: id("br", b.code), imageUrl: null, sortOrder: i })),
    extras: EXTRAS.map((e, i) => ({ ...e, id: id("ex", e.code), imageUrl: null, sortOrder: i })),
  };
  const tables: Record<string, PriceTable> = {};
  for (const p of PATCH_TYPES) {
    const sizes = SIZE_TIERS.filter((s) => s >= p.minSizeIn && s <= p.maxSizeIn);
    const qtys = QUANTITY_TIERS.filter((q) => q >= p.minQuantity);
    tables[id("pt", p.code)] = {
      patchTypeCode: p.code,
      sizeTiers: sizes.map((s) => ({ id: `s${s}`, label: `Up to ${s}"`, maxSizeIn: s })),
      quantityTiers: qtys.map((q) => ({ id: `q${q}`, minQuantity: q })),
      cells: sizes.flatMap((s) => qtys.map((q) => ({ sizeTierId: `s${s}`, quantityTierId: `q${q}`, unitPriceCents: seedPriceCents(p.code, s, q) }))),
    };
  }
  return { catalog, tables, id };
}
