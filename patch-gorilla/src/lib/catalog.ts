import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import type { Catalog } from "@/lib/configurator/rules";
import type { PriceTable } from "@/lib/pricing/types";
import { startingUnitPrice } from "@/lib/pricing/engine";

export interface CatalogBundle {
  catalog: Catalog;
  tables: Record<string, PriceTable>; // keyed by patchTypeId
}

async function loadCatalog(): Promise<CatalogBundle> {
  const [types, backings, borders, extras, sizeTiers, qtyTiers, cells] = await Promise.all([
    prisma.patchType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { backings: true, borders: true, extras: true },
    }),
    prisma.backingOption.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.borderOption.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.extraOption.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.sizeTier.findMany({ where: { active: true }, orderBy: { maxSizeIn: "asc" } }),
    prisma.quantityTier.findMany({ where: { active: true }, orderBy: { minQuantity: "asc" } }),
    prisma.priceMatrix.findMany({ where: { active: true } }),
  ]);

  const catalog: Catalog = {
    patchTypes: types.map((t) => ({
      id: t.id, code: t.code, slug: t.slug, name: t.name, shortName: t.shortName, shortDescription: t.shortDescription,
      bestUse: t.bestUse, imageUrl: t.imageUrl, minSizeIn: t.minSizeIn, maxSizeIn: t.maxSizeIn, minQuantity: t.minQuantity,
      productionDays: t.productionDays, rushProductionDays: t.rushProductionDays, allowedShapes: t.allowedShapes,
      backingIds: t.backings.map((b) => b.backingOptionId),
      borderIds: t.borders.map((b) => b.borderOptionId),
      extraIds: t.extras.map((e) => e.extraOptionId),
    })),
    backings: backings.map((b) => ({ id: b.id, code: b.code, name: b.name, description: b.description, imageUrl: b.imageUrl, modifierType: b.modifierType, modifierValue: b.modifierValue, sortOrder: b.sortOrder })),
    borders: borders.map((b) => ({ id: b.id, code: b.code, name: b.name, description: b.description, imageUrl: b.imageUrl, modifierType: b.modifierType, modifierValue: b.modifierValue, sortOrder: b.sortOrder, allowedShapes: b.allowedShapes })),
    extras: extras.map((e) => ({ id: e.id, code: e.code, name: e.name, description: e.description, imageUrl: e.imageUrl, modifierType: e.modifierType, modifierValue: e.modifierValue, sortOrder: e.sortOrder, isRush: e.isRush })),
  };

  const tables: Record<string, PriceTable> = {};
  for (const t of types) {
    tables[t.id] = {
      patchTypeCode: t.code,
      sizeTiers: sizeTiers.map((s) => ({ id: s.id, label: s.label, maxSizeIn: s.maxSizeIn })),
      quantityTiers: qtyTiers.map((q) => ({ id: q.id, minQuantity: q.minQuantity })),
      cells: cells.filter((c) => c.patchTypeId === t.id).map((c) => ({ sizeTierId: c.sizeTierId, quantityTierId: c.quantityTierId, unitPriceCents: c.unitPriceCents })),
    };
    // Only tiers that actually have prices for this type (keeps lookups honest).
    const usedSize = new Set(tables[t.id].cells.map((c) => c.sizeTierId));
    const usedQty = new Set(tables[t.id].cells.map((c) => c.quantityTierId));
    tables[t.id].sizeTiers = tables[t.id].sizeTiers.filter((s) => usedSize.has(s.id));
    tables[t.id].quantityTiers = tables[t.id].quantityTiers.filter((q) => usedQty.has(q.id));
  }
  return { catalog, tables };
}

/** Cached catalog. Invalidate with `invalidateCatalog()` after any admin edit. */
export const getCatalog = unstable_cache(loadCatalog, ["catalog-v1"], { tags: ["catalog"], revalidate: 600 });

/** Uncached read for checkout-critical paths (never trust a stale cache for money). */
export const getCatalogFresh = loadCatalog;

export function invalidateCatalog() {
  revalidateTag("catalog", "max");
}

export async function getStartingPrices(): Promise<Record<string, number | null>> {
  const { catalog, tables } = await getCatalog();
  return Object.fromEntries(catalog.patchTypes.map((p) => [p.code, startingUnitPrice(tables[p.id])]));
}
