import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { getOrder } from "@/lib/domain/orders";
import { getCatalog } from "@/lib/catalog";
import { proofViews } from "@/lib/proof-view";
import { orderAccessToken } from "@/lib/crypto";
import { allowedTransitions, ORDER_STATUS_LABEL, statusTone } from "@/lib/orders/status";
import { SHAPES, titleShape } from "@/lib/configurator/rules";
import { formatUSD } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { addShipmentAdmin, saveInternalNotes, sendProofAdmin, transitionOrderAdmin, updateItemSpec } from "@/app/admin/actions";
import { AdminHeader, Card, Flash, btnCls, btnGhostCls, inputCls, Label } from "@/components/admin/ui";
import { ProofUploader } from "@/components/admin/ProofUploader";
import { Badge } from "@/components/ui/Badge";

type Addr = Record<string, string>;

export default async function AdminOrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireStaff("orders:read");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await getOrder(id);
  if (!order) notFound();
  const { catalog } = await getCatalog();
  const items = await Promise.all(order.items.map(async (i) => ({ item: i, proofs: await proofViews(i, { includeDrafts: true }) })));
  const ship = order.shippingAddress as Addr | null;
  const transitions = allowedTransitions(order.status);
  const canProof = can(user.role, "proofs:write");

  return (
    <div>
      <Link href="/admin/orders" className="text-sm font-semibold text-slate hover:text-navy">← Orders</Link>
      <AdminHeader
        title={order.orderNumber}
        description={`${order.source.replace("_", " ").toLowerCase()} · created ${formatDate(order.createdAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`}
        actions={<a href={`/order/${order.id}?t=${orderAccessToken(order.id)}`} target="_blank" className={btnGhostCls}>Customer view <ExternalLink className="h-4 w-4" aria-hidden /></a>}
      />
      <Flash sp={sp} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(order.status)} className="text-sm">{ORDER_STATUS_LABEL[order.status]}</Badge>
        <Badge tone={order.paymentStatus === "PAID" ? "success" : "neutral"} className="text-sm">Payment: {order.paymentStatus}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {items.map(({ item, proofs }) => {
            const c = item.configuration;
            const s = item.specSnapshot as Record<string, string | string[]>;
            const pt = catalog.patchTypes.find((p) => p.id === c.patchTypeId);
            const lockedSpec = item.proofs.some((p) => p.status === "APPROVED") || (order.paymentStatus === "PAID" && order.source === "CHECKOUT");
            return (
              <Card key={item.id} title={`${item.productName} × ${item.quantity.toLocaleString("en-US")}`} actions={<span className="font-semibold">{formatUSD(item.totalCents)}</span>}>
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {(["size", "quotedSize", "shape", "backing", "border", "extras", "artwork"] as const).map((k) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5"><dt className="capitalize text-slate">{k.replace("quotedSize", "quoted size")}</dt><dd className="text-right font-medium">{Array.isArray(s[k]) ? (s[k] as string[]).join(", ") || "None" : String(s[k] ?? "—")}</dd></div>
                  ))}
                </dl>
                {c.notes && <p className="mt-3 rounded-lg bg-ice p-3 text-sm"><strong>Customer notes:</strong> {c.notes}</p>}
                {c.artworkFile && <a href={`/api/artwork/${c.artworkFile.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-patch">Download artwork ({c.artworkFile.originalFilename})</a>}

                {canProof && !lockedSpec && pt && (
                  <details className="mt-4 rounded-xl bg-offwhite p-4">
                    <summary className="cursor-pointer text-sm font-semibold">Edit production spec (re-prices automatically)</summary>
                    <form action={updateItemSpec} className="mt-4 grid gap-3 sm:grid-cols-3">
                      <input type="hidden" name="itemId" value={item.id} />
                      <div><Label>Patch type</Label><select name="patchTypeId" defaultValue={c.patchTypeId} className={inputCls}>{catalog.patchTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                      <div><Label>Width (in)</Label><input name="widthIn" type="number" step="0.05" defaultValue={c.widthIn} className={inputCls} /></div>
                      <div><Label>Height (in)</Label><input name="heightIn" type="number" step="0.05" defaultValue={c.heightIn} className={inputCls} /></div>
                      <div><Label>Quantity</Label><input name="quantity" type="number" defaultValue={c.quantity} className={inputCls} /></div>
                      <div><Label>Shape</Label><select name="shape" defaultValue={c.shape} className={inputCls}>{SHAPES.map((sh) => <option key={sh} value={sh}>{titleShape(sh)}</option>)}</select></div>
                      <div><Label>Backing</Label><select name="backingId" defaultValue={c.backingOptionId ?? ""} className={inputCls}><option value="">—</option>{catalog.backings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                      <div><Label>Border</Label><select name="borderId" defaultValue={c.borderOptionId ?? ""} className={inputCls}><option value="">None / molded</option>{catalog.borders.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                      <fieldset className="sm:col-span-2"><Label>Extras</Label><div className="flex flex-wrap gap-3 text-sm">{catalog.extras.map((e) => <label key={e.id} className="flex items-center gap-1.5"><input type="checkbox" name="extraIds" value={e.id} defaultChecked={c.extras.some((x) => x.extraOptionId === e.id)} />{e.name}</label>)}</div></fieldset>
                      <div className="sm:col-span-3"><button className={btnCls}>Save spec &amp; re-price</button><p className="mt-1 text-xs text-slate">Validated by the same rule engine as the configurator. Incompatible options are rejected.</p></div>
                    </form>
                  </details>
                )}

                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate">Proofs</h3>
                  {proofs.length === 0 && <p className="mb-3 text-sm text-slate">No proofs yet.</p>}
                  <ol className="mb-4 space-y-2">
                    {proofs.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-offwhite p-3 text-sm">
                        <div className="flex items-center gap-3">
                          {p.isImage && p.previewUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.previewUrl} alt="" className="h-12 w-12 rounded object-contain ring-1 ring-line" />}
                          <div>
                            <p className="font-semibold">V{p.version} · <Badge tone={p.status === "APPROVED" ? "success" : p.status === "SENT" ? "action" : "neutral"}>{p.status}</Badge></p>
                            {p.approval && <p className="text-xs text-slate">Approved by {p.approval.approvedByEmail} · {formatDate(p.approval.approvedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>}
                            {p.revisions.map((r) => <p key={r.id} className="text-xs text-danger">Revision: {r.comment}</p>)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a href={p.downloadUrl} target="_blank" rel="noopener noreferrer" className={btnGhostCls}>Open</a>
                          {p.status === "DRAFT" && canProof && <form action={sendProofAdmin}><input type="hidden" name="proofId" value={p.id} /><button className={btnCls}>Send</button></form>}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {canProof && !item.proofs.some((p) => p.status === "APPROVED") && <ProofUploader itemId={item.id} />}
                  {item.proofs.some((p) => p.status === "APPROVED") && <p className="text-xs text-slate">An approved proof is locked and can never be overwritten.</p>}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <Card title="Status">
            {transitions.length ? (
              <form action={transitionOrderAdmin} className="space-y-2">
                <input type="hidden" name="orderId" value={order.id} />
                <select name="to" className={inputCls} aria-label="Next status">{transitions.map((t) => <option key={t} value={t}>{ORDER_STATUS_LABEL[t]}</option>)}</select>
                <input name="note" placeholder="Note (optional, shown on timeline)" className={inputCls} />
                <button className={btnCls}>Update status</button>
                <p className="text-xs text-slate">Production requires every proof approved and payment received.</p>
              </form>
            ) : <p className="text-sm text-slate">No further transitions.</p>}
          </Card>
          <Card title="Customer">
            <p className="font-semibold">{[order.firstName, order.lastName].filter(Boolean).join(" ") || "—"}</p>
            <p className="text-sm">{order.email}</p>
            {order.phone && <p className="text-sm">{order.phone}</p>}
            {order.company && <p className="text-sm text-slate">{order.company}</p>}
            {ship && <p className="mt-3 text-sm text-slate">{ship.line1}{ship.line2 ? `, ${ship.line2}` : ""}<br />{ship.city}, {ship.state} {ship.postalCode}</p>}
            {order.customerNotes && <p className="mt-3 rounded-lg bg-ice p-2 text-sm">{order.customerNotes}</p>}
          </Card>
          <Card title="Totals">
            <dl className="space-y-1 text-sm">
              {([["Subtotal", order.subtotalCents], ["Discount", -order.discountCents], ["Shipping", order.shippingCents], ["Tax", order.taxCents], ["Total", order.totalCents]] as [string, number][]).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-slate">{k}</dt><dd className={k === "Total" ? "font-bold" : ""}>{formatUSD(v)}</dd></div>)}
            </dl>
            {order.payments.map((p) => <p key={p.id} className="mt-2 text-xs text-slate">{p.provider} {p.status} · {formatUSD(p.amountCents)} · {p.providerRef.slice(0, 24)}</p>)}
          </Card>
          {can(user.role, "orders:fulfil") && (
            <Card title="Ship">
              {order.shipments.map((s) => <p key={s.id} className="mb-2 text-sm">{s.carrier} · {s.trackingNumber} {s.trackingUrl && <a href={s.trackingUrl} target="_blank" className="text-patch">track</a>}</p>)}
              {order.status === "QUALITY_CHECK" ? (
                <form action={addShipmentAdmin} className="space-y-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <select name="carrier" className={inputCls} aria-label="Carrier"><option>UPS</option><option>USPS</option><option>FedEx</option><option>DHL</option></select>
                  <input name="service" placeholder="Service (e.g. Ground)" className={inputCls} />
                  <input name="trackingNumber" placeholder="Tracking number" className={inputCls} required />
                  <button className={btnCls}>Mark shipped &amp; notify</button>
                </form>
              ) : <p className="text-xs text-slate">Shipping opens once the order passes quality check.</p>}
            </Card>
          )}
          <Card title="Internal notes">
            <form action={saveInternalNotes} className="space-y-2"><input type="hidden" name="orderId" value={order.id} /><textarea name="internalNotes" defaultValue={order.internalNotes ?? ""} className={`${inputCls} h-28 py-2`} aria-label="Internal notes" /><button className={btnGhostCls}>Save notes</button></form>
          </Card>
          <Card title="Timeline">
            <ol className="space-y-2 text-sm">{order.statusEvents.map((e) => <li key={e.id}><span className="font-semibold">{ORDER_STATUS_LABEL[e.status]}</span>{!e.isPublic && <span className="ml-1 text-xs text-slate">(internal)</span>}<p className="text-xs text-slate">{e.note} · {formatDate(e.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></li>)}</ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
