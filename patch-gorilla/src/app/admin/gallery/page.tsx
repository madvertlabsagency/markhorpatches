import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { SHAPES, titleShape } from "@/lib/configurator/rules";
import { INDUSTRIES } from "@/content/industries";
import { saveGalleryItem } from "../actions";
import { AdminHeader, Card, Flash, btnCls, btnGhostCls, inputCls, Label } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

export default async function AdminGallery({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("gallery:write");
  const sp = await searchParams;
  const [items, types] = await Promise.all([prisma.galleryItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], include: { patchType: true } }), prisma.patchType.findMany({ orderBy: { sortOrder: "asc" } })]);
  const form = (it?: (typeof items)[number]) => (
    <form action={saveGalleryItem} className="grid gap-2 sm:grid-cols-4">
      {it && <input type="hidden" name="id" value={it.id} />}
      <div className="sm:col-span-2"><Label>Title</Label><input name="title" defaultValue={it?.title} className={inputCls} required /></div>
      <div className="sm:col-span-2"><Label>Image URL (https:// CDN or /public path)</Label><input name="imageUrl" defaultValue={it?.imageUrl} className={inputCls} required /></div>
      <div className="sm:col-span-2"><Label>Alt text</Label><input name="alt" defaultValue={it?.alt} className={inputCls} /></div>
      <div><Label>Width px</Label><input name="width" type="number" defaultValue={it?.width ?? 800} className={inputCls} /></div>
      <div><Label>Height px</Label><input name="height" type="number" defaultValue={it?.height ?? 800} className={inputCls} /></div>
      <div><Label>Patch type</Label><select name="patchTypeId" defaultValue={it?.patchTypeId ?? ""} className={inputCls}><option value="">—</option>{types.map((t) => <option key={t.id} value={t.id}>{t.shortName}</option>)}</select></div>
      <div><Label>Industry</Label><select name="industry" defaultValue={it?.industry ?? ""} className={inputCls}><option value="">—</option>{INDUSTRIES.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}</select></div>
      <div><Label>Shape</Label><select name="shape" defaultValue={it?.shape ?? ""} className={inputCls}><option value="">—</option>{SHAPES.map((s) => <option key={s} value={s}>{titleShape(s)}</option>)}</select></div>
      <div><Label>Size label</Label><input name="sizeLabel" defaultValue={it?.sizeLabel ?? ""} className={inputCls} /></div>
      <div><Label>Backing label</Label><input name="backingLabel" defaultValue={it?.backingLabel ?? ""} className={inputCls} /></div>
      <div className="flex flex-wrap items-end gap-3 text-sm sm:col-span-3">
        <label className="flex items-center gap-1.5"><input type="checkbox" name="published" defaultChecked={it?.published ?? true} />Published</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="featured" defaultChecked={it?.featured} />Featured on home</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="isPlaceholder" defaultChecked={it?.isPlaceholder} />Placeholder</label>
        <button className={it ? btnGhostCls : btnCls}>{it ? "Save" : "Add item"}</button>
        {it && <button name="delete" value="1" className="font-semibold text-danger">Delete</button>}
      </div>
    </form>
  );
  return (
    <div className="space-y-6">
      <AdminHeader title="Gallery" description="Use real customer work (with permission). Never invent customer or company names." />
      <Flash sp={sp} />
      <Card title="Add gallery item">{form()}</Card>
      {items.map((it) => (
        <Card key={it.id}>
          <div className="mb-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <p className="font-semibold">{it.title}</p>
            {it.isPlaceholder && <Badge tone="action">Placeholder — replace</Badge>}
          </div>
          {form(it)}
        </Card>
      ))}
    </div>
  );
}
