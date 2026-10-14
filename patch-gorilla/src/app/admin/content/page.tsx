import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { saveArticle, saveFaq } from "../actions";
import { AdminHeader, Card, Flash, btnCls, btnGhostCls, inputCls, Label } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; article?: string }> }) {
  await requireStaff("content:write");
  const sp = await searchParams;
  const [faqs, products, articles, categories] = await Promise.all([
    prisma.fAQ.findMany({ orderBy: [{ productId: "asc" }, { category: "asc" }, { sortOrder: "asc" }], include: { product: true } }),
    prisma.product.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.article.findMany({ orderBy: { createdAt: "desc" }, include: { category: true } }),
    prisma.articleCategory.findMany(),
  ]);
  const editing = sp.article === "new" ? null : articles.find((a) => a.id === sp.article);
  return (
    <div className="space-y-6">
      <AdminHeader title="Content" description="FAQs (site-wide and per product page) and Learning Center articles. Homepage copy for the guarantee, video and trust metrics lives in Site settings." />
      <Flash sp={sp} />
      <Card title="Articles" actions={<Link href="?article=new" className={btnGhostCls}>New article</Link>}>
        <ul className="divide-y divide-line">{articles.map((a) => <li key={a.id} className="flex items-center justify-between py-2.5 text-sm"><span><Link href={`?article=${a.id}`} className="font-semibold text-patch">{a.title}</Link> <span className="text-slate">/{a.slug}</span></span><Badge tone={a.published ? "success" : "neutral"}>{a.published ? "Published" : "Draft"}</Badge></li>)}</ul>
        {(editing || sp.article === "new") && (
          <form action={saveArticle} className="mt-6 grid gap-3 rounded-xl bg-offwhite p-4 sm:grid-cols-2">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div><Label>Title</Label><input name="title" defaultValue={editing?.title} className={inputCls} required /></div>
            <div><Label>Slug</Label><input name="slug" defaultValue={editing?.slug} className={inputCls} required /></div>
            <div className="sm:col-span-2"><Label>Excerpt</Label><input name="excerpt" defaultValue={editing?.excerpt} className={inputCls} required /></div>
            <div className="sm:col-span-2"><Label>Body (## headings, - lists, **bold**, [links](/path))</Label><textarea name="body" defaultValue={editing?.body} className={`${inputCls} h-80 py-2 font-mono text-xs`} /></div>
            <div><Label>Category</Label><select name="categoryId" defaultValue={editing?.categoryId ?? ""} className={inputCls}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><Label>Reading minutes</Label><input name="readingMinutes" type="number" defaultValue={editing?.readingMinutes ?? 5} className={inputCls} /></div>
            <div><Label>Cover image URL</Label><input name="coverImageUrl" defaultValue={editing?.coverImageUrl ?? ""} className={inputCls} /></div>
            <div><Label>SEO title</Label><input name="seoTitle" defaultValue={editing?.seoTitle ?? ""} className={inputCls} /></div>
            <div className="sm:col-span-2"><Label>SEO description</Label><input name="seoDescription" defaultValue={editing?.seoDescription ?? ""} className={inputCls} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={editing?.published} />Published</label>
            <div><button className={btnCls}>Save article</button></div>
          </form>
        )}
      </Card>
      <Card title="FAQs">
        <div className="space-y-3">
          {faqs.map((f) => (
            <form key={f.id} action={saveFaq} className="grid gap-2 rounded-xl bg-offwhite p-3 sm:grid-cols-[1fr_1fr_160px_160px]">
              <input type="hidden" name="id" value={f.id} />
              <input name="question" defaultValue={f.question} className={inputCls} aria-label="Question" />
              <input name="category" defaultValue={f.category} className={inputCls} aria-label="Category" />
              <select name="productId" defaultValue={f.productId ?? ""} className={inputCls} aria-label="Page"><option value="">General</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input name="sortOrder" type="number" defaultValue={f.sortOrder} className={inputCls} aria-label="Sort order" />
              <textarea name="answer" defaultValue={f.answer} className={`${inputCls} h-20 py-2 sm:col-span-4`} aria-label="Answer" />
              <div className="flex flex-wrap items-center gap-3 text-sm sm:col-span-4">
                <label className="flex items-center gap-1.5"><input type="checkbox" name="published" defaultChecked={f.published} />Published</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" name="showOnHome" defaultChecked={f.showOnHome} />Show on homepage</label>
                <button className={btnGhostCls}>Save</button><button name="delete" value="1" className="font-semibold text-danger">Delete</button>
              </div>
            </form>
          ))}
        </div>
        <form action={saveFaq} className="mt-6 grid gap-2 sm:grid-cols-2">
          <input name="question" placeholder="New question" className={inputCls} required aria-label="New question" />
          <input name="category" placeholder="Category" className={inputCls} aria-label="Category" />
          <textarea name="answer" placeholder="Answer" className={`${inputCls} h-20 py-2 sm:col-span-2`} required aria-label="Answer" />
          <select name="productId" className={inputCls} aria-label="Page"><option value="">General</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <div className="flex items-center gap-3 text-sm"><label className="flex items-center gap-1.5"><input type="checkbox" name="published" defaultChecked />Published</label><button className={btnCls}>Add FAQ</button></div>
        </form>
      </Card>
    </div>
  );
}
