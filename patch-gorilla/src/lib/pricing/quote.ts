/**
 * Price a configuration against a catalog bundle. Pure — used by both the
 * client (live estimate) and the server (authoritative).
 */
import { getPatchType, isRush, selectedModifiers, validateConfig, type Catalog, type ConfigState, type RuleViolation } from "@/lib/configurator/rules";
import { PricingError, priceLine } from "./engine";
import type { LinePrice, PriceTable } from "./types";

export type QuoteResult =
  | { ok: true; line: LinePrice; rush: boolean; productionDays: number }
  | { ok: false; violations: RuleViolation[]; pricingError?: string };

export function quoteConfiguration(catalog: Catalog, tables: Record<string, PriceTable>, state: ConfigState, opts: { partial?: boolean } = {}): QuoteResult {
  const pt = getPatchType(catalog, state.patchTypeId);
  if (!pt) return { ok: false, violations: [{ field: "patchType", message: "Choose a patch type." }] };

  // For live estimates we only block on violations that affect price.
  const violations = validateConfig(catalog, state).filter((v) => !opts.partial || v.field === "size" || v.field === "quantity" || v.field === "patchType");
  if (violations.length) return { ok: false, violations };

  try {
    const line = priceLine({ table: tables[pt.id], widthIn: state.widthIn, heightIn: state.heightIn, quantity: state.quantity, modifiers: selectedModifiers(catalog, state) });
    const rush = isRush(catalog, state);
    return { ok: true, line, rush, productionDays: rush ? pt.rushProductionDays : pt.productionDays };
  } catch (e) {
    if (e instanceof PricingError) return { ok: false, violations: [], pricingError: e.message };
    throw e;
  }
}
