import type { PriceTable as Table } from "@/lib/pricing/types";
import { formatUSD } from "@/lib/money";
import { cn } from "@/lib/utils";

const SIZES = [2, 2.5, 3, 3.5, 4, 5];

/** Unit prices by quantity × size, straight from the live price matrix. Scrolls horizontally on small screens. */
export function PriceTable({ table, name, minSize, maxSize, className }: { table: Table; name: string; minSize: number; maxSize: number; className?: string }) {
  const sizes = SIZES.filter((s) => s >= minSize && s <= maxSize).map((s) => table.sizeTiers.find((t) => t.maxSizeIn === s)).filter(Boolean) as Table["sizeTiers"];
  const qtys = [...table.quantityTiers].sort((a, b) => a.minQuantity - b.minQuantity);
  const price = (sizeId: string, qtyId: string) => table.cells.find((c) => c.sizeTierId === sizeId && c.quantityTierId === qtyId)?.unitPriceCents ?? null;
  if (!sizes.length || !qtys.length) return null;
  return (
    <div className={cn("overflow-hidden rounded-[1.5rem] bg-white shadow-lift ring-1 ring-navy/5", className)}>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${name} price table`}>
        <table className="w-full min-w-[560px] text-left">
          <caption className="sr-only">{name} price per patch by quantity and size</caption>
          <thead>
            <tr className="bg-navy text-white">
              <th scope="col" className="sticky left-0 bg-navy px-5 py-4 font-display text-lg font-extrabold uppercase">Qty</th>
              {sizes.map((s) => (
                <th key={s.id} scope="col" className="px-4 py-4 text-right font-display text-lg font-extrabold uppercase">{s.maxSizeIn}&quot;</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qtys.map((q, i) => (
              <tr key={q.id} className={cn("border-t border-line", i % 2 && "bg-offwhite")}>
                <th scope="row" className={cn("sticky left-0 px-5 py-3 font-display text-lg font-extrabold", i % 2 ? "bg-offwhite" : "bg-white")}>{q.minQuantity.toLocaleString("en-US")}+</th>
                {sizes.map((s) => {
                  const p = price(s.id, q.id);
                  return (
                    <td key={s.id} className="px-4 py-3 text-right tabular-nums text-navy/85">{p === null ? "—" : formatUSD(p)}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-5 py-3 text-xs text-slate">Price per patch. Size is the average of width and height. Backings and extras may add to the price — the builder shows everything before checkout.</p>
    </div>
  );
}
