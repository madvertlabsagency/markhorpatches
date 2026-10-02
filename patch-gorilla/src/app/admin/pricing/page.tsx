import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { SHAPES, titleShape } from "@/lib/configurator/rules";
import { addTier, importPricingCsv, saveOption, savePriceMatrix, toggleTier } from "../actions";
import { AdminHeader, Card, Flash, Notice, btnCls, btnGhostCls, inputCls, Label } from "@/components/admin/ui";

export default async function AdminPricing({ searchParams }: { searchParams: Promise<{ type?: string; ok?: string; error?: string }> }) {
  await requireStaff("pricing:write");
  const sp = await searchParams;
  const [types, sizes, qtys, backings, borders, extras] = await Promise.all([
    prisma.patchType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.sizeTier.findMany({ orderBy: { maxSizeIn: "asc" } }),
    prisma.quantityTier.findMany({ orderBy: { minQuantity: "asc" } }),
    prisma.backingOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.borderOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.extraOption.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const type = types.find((t) => t.id === sp.type) ?? types[0];
  const cells = type ? await prisma.priceMatrix.findMany({ where: { patchTypeId: type.id } }) : [];
  const val = (s: string, q: string) => {
    const c = cells.find((x) => x.sizeTierId === s && x.quantityTierId === q);
    return c ? (c.unitPriceCents / 100).toFixed(2) : "";
  };
  const activeSizes = sizes.filter((s) => s.active && type && s.maxSizeIn >= type.minSizeIn - 0.001 && s.maxSizeIn <= type.maxSizeIn + 0.001);
  const activeQtys = qtys.filter((q) => q.active);

  const optionRows = (kind: "backing" | "border" | "extra", rows: typeof backings | typeof borders | typeof extras) =>
    rows.map((o) => (
      <form key={o.id} action={saveOption} className="grid items-end gap-2 border-b border-line py-3 sm:grid-cols-[1fr_2fr_130px_110px_auto_auto]">
        <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={o.id} />
        <div><Label>Name</Label><input name="name" defaultValue={o.name} className={inputCls} /></div>
        <div><Label>Description</Label><input name="description" defaultValue={o.description} className={inputCls} /></div>
        <div><Label>Type</Label><select name="modifierType" defaultValue={o.modifierType} className={inputCls}><option value="PER_UNIT">$ per patch</option><option value="FIXED">$ fixed / line</option><option value="PERCENT">% of base</option></select></div>
        <div><Label>Value</Label><input name="modifierValue" defaultValue={o.modifierType === "PERCENT" ? o.modifierValue / 100 : (o.modifierValue / 100).toFixed(2)} className={inputCls} /></div>
        <label className="flex h-10 items-center gap-1.5 text-sm"><input type="checkbox" name="active" defaultChecked={o.active} />Active</label>
        <button className={btnGhostCls}>Save</button>
        {kind === "border" && "allowedShapes" in o && (
          <fieldset className="sm:col-span-6"><span className="mr-3 text-xs text-slate">Allowed shapes (none = all):</span>{SHAPES.map((s) => <label key={s} className="mr-3 inline-flex items-center gap-1 text-xs"><input type="checkbox" name="allowedShapes" value={s} defaultChecked={(o.allowedShapes as string[]).includes(s)} />{titleShape(s)}</label>)}</fieldset>
        )}
      </form>
    ));

  return (
    <div className="space-y-6">
      <AdminHeader title="Pricing & options" description="Every price on the site, in the configurator and at checkout is calculated from these tables. Changes apply immediately — no deploy." actions={<a href="/admin/api/pricing-csv" className={btnGhostCls}>Export CSV</a>} />
      <Notice tone="warn">Demo market pricing — verify production economics before launch. (This note is internal and never shown to customers.)</Notice>
      <Flash sp={sp} />

      <Card title="Price matrix (USD per patch)">
        <nav className="mb-4 flex flex-wrap gap-2">{types.map((t) => <Link key={t.id} href={`?type=${t.id}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${t.id === type?.id ? "bg-navy text-white" : "bg-offwhite ring-1 ring-line"}`}>{t.shortName}</Link>)}</nav>
        {type && (
          <form action={savePriceMatrix}>
            <input type="hidden" name="patchTypeId" value={type.id} />
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead><tr><th className="sticky left-0 bg-white px-2 py-2 text-left text-xs uppercase text-slate">Size ↓ / Qty →</th>{activeQtys.map((q) => <th key={q.id} className="px-1 py-2 text-xs font-semibold">{q.minQuantity.toLocaleString("en-US")}+</th>)}</tr></thead>
                <tbody>
                  {activeSizes.map((s) => (
                    <tr key={s.id}>
                      <th scope="row" className="sticky left-0 bg-white px-2 py-1 text-left font-semibold">{s.label}</th>
                      {activeQtys.map((q) => (
                        <td key={q.id} className="px-1 py-1"><input name={`cell:${s.id}:${q.id}`} defaultValue={val(s.id, q.id)} inputMode="decimal" aria-label={`${s.label}, ${q.minQuantity}+`} className={`${inputCls} h-9 w-20 px-2 text-right tabular-nums ${q.minQuantity < type.minQuantity ? "opacity-40" : ""}`} placeholder="—" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate">Leave a cell empty to remove that price (that size/quantity becomes unavailable). Faded columns are below this type&apos;s minimum quantity ({type.minQuantity}).</p>
            <button className={`${btnCls} mt-4`}>Save {type.shortName} prices</button>
          </form>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Size & quantity tiers">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div><Label>Size tiers</Label>{sizes.map((s) => <form key={s.id} action={toggleTier} className="flex items-center justify-between py-1"><input type="hidden" name="id" value={s.id} /><input type="hidden" name="kind" value="size" /><input type="hidden" name="active" value={s.active ? "0" : "1"} /><span className={s.active ? "" : "text-slate line-through"}>{s.label}</span><button className="text-xs font-semibold text-patch">{s.active ? "Deactivate" : "Activate"}</button></form>)}</div>
            <div><Label>Quantity tiers</Label>{qtys.map((q) => <form key={q.id} action={toggleTier} className="flex items-center justify-between py-1"><input type="hidden" name="id" value={q.id} /><input type="hidden" name="kind" value="qty" /><input type="hidden" name="active" value={q.active ? "0" : "1"} /><span className={q.active ? "" : "text-slate line-through"}>{q.minQuantity.toLocaleString("en-US")}+</span><button className="text-xs font-semibold text-patch">{q.active ? "Deactivate" : "Activate"}</button></form>)}</div>
          </div>
          <form action={addTier} className="mt-4 flex gap-2"><select name="kind" className={`${inputCls} w-36`} aria-label="Tier kind"><option value="size">Size (max in)</option><option value="qty">Quantity (min)</option></select><input name="value" placeholder="e.g. 7 or 750" className={inputCls} aria-label="Tier value" /><button className={btnGhostCls}>Add tier</button></form>
        </Card>
        <Card title="Import CSV">
          <form action={importPricingCsv} className="space-y-3">
            <p className="text-sm text-slate">Columns: <code className="rounded bg-offwhite px-1">patch_type_code,size_max_in,min_quantity,unit_price_usd,active</code>. Sizes and quantities must match existing tiers. The whole file is validated before anything changes.</p>
            <input type="file" name="csv" accept=".csv,text/csv" className="text-sm" aria-label="CSV file" />
            <button className={btnCls}>Import</button>
          </form>
        </Card>
      </div>

      <Card title="Option modifiers" className="scroll-mt-6">
        <div id="options" />
        <h3 className="mt-2 text-sm font-semibold uppercase tracking-wider text-slate">Backings</h3>{optionRows("backing", backings)}
        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate">Borders</h3>{optionRows("border", borders)}
        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate">Extras &amp; rush</h3>{optionRows("extra", extras)}
        <p className="mt-3 text-xs text-slate">Order of operations: base unit price + per-patch modifiers (incl. % of base) → × quantity → + fixed charges → − discount → + shipping → + tax.</p>
      </Card>
    </div>
  );
}
