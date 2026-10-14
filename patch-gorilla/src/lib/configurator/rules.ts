/**
 * CONFIGURATOR RULE ENGINE — pure functions over catalog data loaded from the DB.
 * Components never hard-code compatibility; they ask these functions.
 */
import type { Shape } from "@/generated/prisma/enums";
import type { PriceModifier } from "@/lib/pricing/types";

export const SHAPES: Shape[] = ["CIRCLE", "SQUARE", "RECTANGLE", "SHIELD", "OVAL", "CUSTOM"];

export interface CatalogOption extends PriceModifier {
  id: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
}

export interface CatalogBorder extends CatalogOption {
  allowedShapes: Shape[];
}

export interface CatalogExtra extends CatalogOption {
  isRush: boolean;
}

export interface CatalogPatchType {
  id: string;
  code: string;
  slug: string;
  name: string;
  shortName: string;
  shortDescription: string;
  bestUse: string;
  imageUrl: string | null;
  minSizeIn: number;
  maxSizeIn: number;
  minQuantity: number;
  productionDays: number;
  rushProductionDays: number;
  allowedShapes: Shape[];
  backingIds: string[];
  borderIds: string[];
  extraIds: string[];
}

export interface Catalog {
  patchTypes: CatalogPatchType[];
  backings: CatalogOption[];
  borders: CatalogBorder[];
  extras: CatalogExtra[];
}

export interface ConfigState {
  patchTypeId: string | null;
  widthIn: number;
  heightIn: number;
  quantity: number;
  shape: Shape | null;
  backingId: string | null;
  borderId: string | null;
  extraIds: string[];
}

export type ConfigField = "patchType" | "size" | "quantity" | "shape" | "backing" | "border" | "extras";

export interface RuleViolation {
  field: ConfigField;
  message: string;
}

export function getPatchType(catalog: Catalog, id: string | null) {
  return catalog.patchTypes.find((p) => p.id === id) ?? null;
}

export function allowedBackings(catalog: Catalog, pt: CatalogPatchType | null) {
  if (!pt) return [];
  return catalog.backings.filter((b) => pt.backingIds.includes(b.id));
}

export function allowedBorders(catalog: Catalog, pt: CatalogPatchType | null, shape: Shape | null) {
  if (!pt) return [];
  return catalog.borders.filter((b) => pt.borderIds.includes(b.id) && (!shape || b.allowedShapes.length === 0 || b.allowedShapes.includes(shape)));
}

export function allowedExtras(catalog: Catalog, pt: CatalogPatchType | null) {
  if (!pt) return [];
  return catalog.extras.filter((e) => pt.extraIds.includes(e.id));
}

export function allowedShapes(pt: CatalogPatchType | null): Shape[] {
  if (!pt) return SHAPES;
  return pt.allowedShapes.length ? pt.allowedShapes : SHAPES;
}

/** Does this patch type need a border decision at all? (e.g. PVC is molded — no border step) */
export function requiresBorder(catalog: Catalog, pt: CatalogPatchType | null) {
  return !!pt && pt.borderIds.length > 0 && catalog.borders.some((b) => pt.borderIds.includes(b.id));
}

export function validateConfig(catalog: Catalog, s: ConfigState): RuleViolation[] {
  const v: RuleViolation[] = [];
  const pt = getPatchType(catalog, s.patchTypeId);
  if (!pt) return [{ field: "patchType", message: "Choose a patch type." }];

  const size = (s.widthIn + s.heightIn) / 2;
  if (!(s.widthIn > 0 && s.heightIn > 0)) v.push({ field: "size", message: "Enter a width and height." });
  else if (size < pt.minSizeIn || size > pt.maxSizeIn)
    v.push({ field: "size", message: `${pt.shortName} patches are available from ${pt.minSizeIn}" to ${pt.maxSizeIn}".` });
  if (Math.max(s.widthIn, s.heightIn) > pt.maxSizeIn * 1.6)
    v.push({ field: "size", message: `That shape is too long for ${pt.shortName.toLowerCase()} production — talk to us for a custom quote.` });

  if (!Number.isInteger(s.quantity) || s.quantity < pt.minQuantity)
    v.push({ field: "quantity", message: `Minimum order for ${pt.shortName.toLowerCase()} patches is ${pt.minQuantity}.` });

  if (!s.shape) v.push({ field: "shape", message: "Choose a shape." });
  else if (!allowedShapes(pt).includes(s.shape)) v.push({ field: "shape", message: `${titleShape(s.shape)} isn't available for ${pt.shortName}.` });

  const backings = allowedBackings(catalog, pt);
  if (!s.backingId) {
    if (backings.length) v.push({ field: "backing", message: "Choose a backing." });
  } else if (!backings.some((b) => b.id === s.backingId)) v.push({ field: "backing", message: "That backing isn't compatible with this patch type." });

  if (requiresBorder(catalog, pt)) {
    const borders = allowedBorders(catalog, pt, s.shape);
    if (!s.borderId) v.push({ field: "border", message: "Choose a border." });
    else if (!borders.some((b) => b.id === s.borderId)) v.push({ field: "border", message: "That border doesn't work with this patch type and shape." });
  } else if (s.borderId) {
    v.push({ field: "border", message: "This patch type doesn't use a border option." });
  }

  const extras = allowedExtras(catalog, pt).map((e) => e.id);
  if (s.extraIds.some((id) => !extras.includes(id))) v.push({ field: "extras", message: "Some extras aren't available for this patch type." });

  return v;
}

export interface ReconcileResult {
  state: ConfigState;
  resets: { field: ConfigField; message: string }[];
}

/**
 * Called whenever a selection changes. Keeps everything that is still valid and
 * resets ONLY the properties that became incompatible — with a human message for each.
 */
export function reconcile(catalog: Catalog, next: ConfigState): ReconcileResult {
  const pt = getPatchType(catalog, next.patchTypeId);
  const resets: ReconcileResult["resets"] = [];
  const state: ConfigState = { ...next, extraIds: [...next.extraIds] };
  if (!pt) return { state, resets };

  if (state.shape && !allowedShapes(pt).includes(state.shape)) {
    resets.push({ field: "shape", message: `${titleShape(state.shape)} shape isn't available for ${pt.shortName} — please pick another.` });
    state.shape = null;
  }

  if (state.backingId && !allowedBackings(catalog, pt).some((b) => b.id === state.backingId)) {
    const name = catalog.backings.find((b) => b.id === state.backingId)?.name ?? "That backing";
    resets.push({ field: "backing", message: `${name} isn't compatible with ${pt.shortName} patches, so we cleared it.` });
    state.backingId = null;
  }

  if (state.borderId) {
    const ok = requiresBorder(catalog, pt) && allowedBorders(catalog, pt, state.shape).some((b) => b.id === state.borderId);
    if (!ok) {
      const name = catalog.borders.find((b) => b.id === state.borderId)?.name ?? "That border";
      resets.push({
        field: "border",
        message: requiresBorder(catalog, pt) ? `${name} doesn't work with this combination — choose another border.` : `${pt.shortName} patches have a molded edge, so no border is needed.`,
      });
      state.borderId = null;
    }
  }

  const extras = allowedExtras(catalog, pt).map((e) => e.id);
  const removed = state.extraIds.filter((id) => !extras.includes(id));
  if (removed.length) {
    const names = removed.map((id) => catalog.extras.find((e) => e.id === id)?.name ?? "extra").join(", ");
    resets.push({ field: "extras", message: `Removed ${names} — not available for ${pt.shortName}.` });
    state.extraIds = state.extraIds.filter((id) => extras.includes(id));
  }

  if (state.quantity < pt.minQuantity) {
    resets.push({ field: "quantity", message: `${pt.shortName} starts at ${pt.minQuantity} pieces — we bumped your quantity.` });
    state.quantity = pt.minQuantity;
  }

  return { state, resets };
}

/** Selected options as pricing modifiers. */
export function selectedModifiers(catalog: Catalog, s: ConfigState): PriceModifier[] {
  const mods: PriceModifier[] = [];
  const b = catalog.backings.find((x) => x.id === s.backingId);
  if (b) mods.push(b);
  const br = catalog.borders.find((x) => x.id === s.borderId);
  if (br) mods.push(br);
  for (const id of s.extraIds) {
    const e = catalog.extras.find((x) => x.id === id);
    if (e) mods.push(e);
  }
  return mods;
}

export function isRush(catalog: Catalog, s: ConfigState) {
  return s.extraIds.some((id) => catalog.extras.find((e) => e.id === id)?.isRush);
}

export function titleShape(s: Shape) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
