import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { SHAPES, titleShape } from "@/lib/configurator/rules";
import { deleteProductMedia, updatePatchType, updateProductPage } from "../../actions";
import { AdminHeader, Card, Flash, btnCls, btnGhostCls, inputCls, Label } from "@/components/admin/ui";

export default async function AdminProductEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("catalog:write");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [t, backings, borders, extras] = await Promise.all([
    prisma.patchType.findUnique({ where: { id }, include: { backings: true, borders: true, extras: true, product: { include: { media: true } } } }),
    prisma.backingOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.borderOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.extraOption.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!t) notFound();
  const p = t.product;
  const field = (name: string, label: string, value: string | number | null | undefined, type = "text") => (
    <div><Label htmlFor={name}>{label}</Label><input id={name} name={name} type={type} step={type === "number" ? "any" : undefined} defaultValue={value ?? ""} className={inputCls} /></div>
  );
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm font-semibold text-slate">← Patch types</Link>
      <AdminHeader title={t.name} description={`Code ${t.code}. Changes apply immediately to the configurator, product pages and checkout pricing.`} actions={<Link href={`/admin/pricing?type=${t.id}`} className={btnGhostCls}>Edit prices</Link>} />
      <Flash sp={sp} />
      <Card title="Configurator rules">
        <form action={updatePatchType} className="space-y-5">
          <input type="hidden" name="id" value={t.id} />
          <div className="grid gap-3 sm:grid-cols-4">
            {field("name", "Name", t.name)}{field("shortName", "Short name", t.shortName)}{field("bestUse", "Best use", t.bestUse)}{field("imageUrl", "Card image URL (optional)", t.imageUrl)}
            <div className="sm:col-span-4">{field("shortDescription", "Short description", t.shortDescription)}</div>
            {field("minSizeIn", 'Min size (")', t.minSizeIn, "number")}{field("maxSizeIn", 'Max size (")', t.maxSizeIn, "number")}{field("minQuantity", "Min quantity", t.minQuantity, "number")}{field("sortOrder", "Sort order", t.sortOrder, "number")}
            {field("productionDays", "Production days", t.productionDays, "number")}{field("rushProductionDays", "Rush production days", t.rushProductionDays, "number")}
          </div>
          <fieldset><Label>Shapes</Label><div className="flex flex-wrap gap-4 text-sm">{SHAPES.map((s) => <label key={s} className="flex items-center gap-1.5"><input type="checkbox" name="allowedShapes" value={s} defaultChecked={t.allowedShapes.includes(s)} />{titleShape(s)}</label>)}</div></fieldset>
          <fieldset><Label>Compatible backings</Label><div className="flex flex-wrap gap-4 text-sm">{backings.map((b) => <label key={b.id} className="flex items-center gap-1.5"><input type="checkbox" name="backings" value={b.id} defaultChecked={t.backings.some((x) => x.backingOptionId === b.id)} />{b.name}</label>)}</div></fieldset>
          <fieldset><Label>Compatible borders (none = molded edge, border step hidden)</Label><div className="flex flex-wrap gap-4 text-sm">{borders.map((b) => <label key={b.id} className="flex items-center gap-1.5"><input type="checkbox" name="borders" value={b.id} defaultChecked={t.borders.some((x) => x.borderOptionId === b.id)} />{b.name}</label>)}</div></fieldset>
          <fieldset><Label>Available extras</Label><div className="flex flex-wrap gap-4 text-sm">{extras.map((e) => <label key={e.id} className="flex items-center gap-1.5"><input type="checkbox" name="extras" value={e.id} defaultChecked={t.extras.some((x) => x.extraOptionId === e.id)} />{e.name}</label>)}</div></fieldset>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={t.active} /> Active (visible in configurator & site)</label>
          <button className={btnCls}>Save rules</button>
        </form>
      </Card>
      {p && (
        <Card title={`Product page /${p.slug}`}>
          <form action={updateProductPage} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={p.id} />
            {field("h1", "H1", p.h1)}{field("tagline", "Tagline (eyebrow)", p.tagline)}
            <div className="sm:col-span-2">{field("shortDescription", "Short description", p.shortDescription)}</div>
            <div className="sm:col-span-2"><Label htmlFor="description">Description</Label><textarea id="description" name="description" defaultValue={p.description} className={`${inputCls} h-24 py-2`} /></div>
            <div><Label htmlFor="bestFor">Best for (one per line)</Label><textarea id="bestFor" name="bestFor" defaultValue={p.bestFor.join("\n")} className={`${inputCls} h-28 py-2`} /></div>
            <div><Label htmlFor="canReproduce">Can reproduce (one per line)</Label><textarea id="canReproduce" name="canReproduce" defaultValue={p.canReproduce.join("\n")} className={`${inputCls} h-28 py-2`} /></div>
            <div><Label htmlFor="highlights">Highlights (one per line)</Label><textarea id="highlights" name="highlights" defaultValue={p.highlights.join("\n")} className={`${inputCls} h-28 py-2`} /></div>
            <div className="space-y-3">{field("heroImageUrl", "Hero image URL", p.heroImageUrl)}{field("videoUrl", "Video URL (mp4 / CDN)", p.videoUrl)}{field("videoPosterUrl", "Video poster URL", p.videoPosterUrl)}</div>
            {field("seoTitle", "SEO title", p.seoTitle)}{field("seoDescription", "SEO description", p.seoDescription)}
            <div className="rounded-lg bg-offwhite p-3 sm:col-span-2">
              <Label>Add gallery media to this page</Label>
              <div className="grid gap-2 sm:grid-cols-3"><input name="mediaUrl" placeholder="https://cdn…/photo.webp" className={inputCls} aria-label="Media URL" /><input name="mediaAlt" placeholder="Alt text" className={inputCls} aria-label="Alt text" /><select name="mediaType" className={inputCls} aria-label="Media type"><option>IMAGE</option><option>VIDEO</option></select></div>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={p.active} /> Page active</label>
            <div className="sm:col-span-2"><button className={btnCls}>Save product page</button></div>
          </form>
          {p.media.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3">{p.media.map((m) => <li key={m.id} className="rounded-lg bg-offwhite p-2 text-xs">{m.type} · {m.url.slice(0, 40)}<form action={deleteProductMedia} className="inline"><input type="hidden" name="id" value={m.id} /><button className="ml-2 text-danger">Remove</button></form></li>)}</ul>
          )}
        </Card>
      )}
    </div>
  );
}
