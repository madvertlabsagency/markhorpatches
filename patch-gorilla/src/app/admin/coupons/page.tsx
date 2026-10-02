import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { saveCoupon } from "../actions";
import { AdminHeader, Card, Flash, btnCls, btnGhostCls, inputCls, Label } from "@/components/admin/ui";

const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");

export default async function AdminCoupons({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("coupons:write");
  const sp = await searchParams;
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const form = (c?: (typeof coupons)[number]) => (
    <form action={saveCoupon} className="grid items-end gap-2 sm:grid-cols-[1fr_120px_100px_110px_100px_140px_140px_auto]">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div><Label>Code</Label><input name="code" defaultValue={c?.code} className={inputCls} required /></div>
      <div><Label>Type</Label><select name="type" defaultValue={c?.type ?? "PERCENT"} className={inputCls}><option value="PERCENT">%</option><option value="FIXED">$ off</option></select></div>
      <div><Label>Value</Label><input name="value" defaultValue={c ? (c.type === "PERCENT" ? c.value / 100 : (c.value / 100).toFixed(2)) : ""} className={inputCls} required /></div>
      <div><Label>Min order $</Label><input name="minSubtotal" defaultValue={c ? (c.minSubtotalCents / 100).toFixed(2) : "0"} className={inputCls} /></div>
      <div><Label>Max uses</Label><input name="maxRedemptions" defaultValue={c?.maxRedemptions ?? ""} className={inputCls} /></div>
      <div><Label>Starts</Label><input name="startsAt" type="date" defaultValue={d(c?.startsAt ?? null)} className={inputCls} /></div>
      <div><Label>Ends</Label><input name="endsAt" type="date" defaultValue={d(c?.endsAt ?? null)} className={inputCls} /></div>
      <div className="flex items-center gap-2 text-sm"><label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} />Active</label><button className={c ? btnGhostCls : btnCls}>{c ? "Save" : "Add"}</button>{c && <button name="delete" value="1" className="text-danger">✕</button>}</div>
      {c && <p className="text-xs text-slate sm:col-span-8">Used {c.redemptions} time(s)</p>}
    </form>
  );
  return (
    <div className="space-y-6">
      <AdminHeader title="Coupons" description="Discounts apply to the merchandise subtotal, before shipping and tax, and are always validated on the server." />
      <Flash sp={sp} />
      <Card title="New coupon">{form()}</Card>
      {coupons.map((c) => <Card key={c.id}>{form(c)}</Card>)}
    </div>
  );
}
