import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { saveReview } from "../actions";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Card, Flash, btnCls, btnGhostCls, inputCls, Label } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("reviews:write");
  const sp = await searchParams;
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" }, include: { order: true, patchType: true } });
  return (
    <div className="space-y-6">
      <AdminHeader title="Reviews" description="Only published reviews appear on the site. Never publish reviews you can't verify. AggregateRating structured data uses only real (non-sample) published reviews." />
      <Flash sp={sp} />
      <div className="space-y-3">
        {reviews.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="flex flex-wrap gap-2">{r.isSample && <Badge tone="action">Sample — replace before launch</Badge>}<Badge tone={r.published ? "success" : "neutral"}>{r.published ? "Published" : "Hidden"}</Badge>{r.verified && <Badge tone="info">Verified order</Badge>}</div>
                <p className="mt-2 font-semibold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} {r.title}</p>
                <p className="mt-1 text-sm text-slate">{r.body}</p>
                <p className="mt-2 text-xs text-slate">{r.customerName}{r.company ? ` · ${r.company}` : ""} · {r.patchType?.shortName ?? "—"} · {r.order?.orderNumber ?? "no order"} · {formatDate(r.createdAt)}</p>
              </div>
              <form action={saveReview} className="flex flex-wrap items-center gap-3 text-sm">
                <input type="hidden" name="id" value={r.id} />
                <label className="flex items-center gap-1.5"><input type="checkbox" name="published" defaultChecked={r.published} />Published</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" name="verified" defaultChecked={r.verified} />Verified</label>
                <button className={btnGhostCls}>Save</button>
                <button name="delete" value="1" className="text-sm font-semibold text-danger">Delete</button>
              </form>
            </div>
          </Card>
        ))}
        {!reviews.length && <p className="text-sm text-slate">No reviews yet. Delivered orders automatically receive a review request.</p>}
      </div>
      <Card title="Add a review you've received (e.g. by email)">
        <form action={saveReview} className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="rv-n">Customer name</Label><input id="rv-n" name="customerName" className={inputCls} required /></div>
          <div><Label htmlFor="rv-c">Company</Label><input id="rv-c" name="company" className={inputCls} /></div>
          <div><Label htmlFor="rv-r">Rating</Label><select id="rv-r" name="rating" className={inputCls}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><Label htmlFor="rv-t">Title</Label><input id="rv-t" name="title" className={inputCls} /></div>
          <div className="sm:col-span-2"><Label htmlFor="rv-b">Review</Label><textarea id="rv-b" name="body" className={`${inputCls} h-24 py-2`} required /></div>
          <div><Label htmlFor="rv-p">Photo URL</Label><input id="rv-p" name="photoUrl" className={inputCls} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" />Publish now</label>
          <div><button className={btnCls}>Add review</button></div>
        </form>
      </Card>
    </div>
  );
}
