import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, ExternalLink, FileText, PackageCheck } from "lucide-react";
import { getAccessibleOrder } from "@/lib/order-access";
import { proofViews } from "@/lib/proof-view";
import { loadSettings } from "@/lib/settings";
import { orderAccessToken } from "@/lib/crypto";
import { ORDER_STATUS_LABEL, statusTone } from "@/lib/orders/status";
import { formatUSD } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Container } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { HornMark } from "@/components/brand/marks";
import { PatchArt } from "@/components/brand/PatchArt";
import { TrackingTimeline } from "@/components/proof/TrackingTimeline";
import { ProofPanel } from "@/components/proof/ProofPanel";
import { PurchaseTracker } from "@/components/cart/PurchaseTracker";

export const metadata: Metadata = { title: "Your Order | Markhor Patches", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; paid?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const access = await getAccessibleOrder(id, sp.t);
  if (!access) notFound();
  const { order } = access;
  const token = sp.t ?? orderAccessToken(order.id);
  const settings = await loadSettings();
  const items = await Promise.all(order.items.map(async (i) => ({ item: i, proofs: await proofViews(i) })));
  const canPay = order.paymentStatus !== "PAID" && (order.status === "PAYMENT_PENDING" || order.status === "PROOF_APPROVED");
  const justPaid = sp.paid === "1";

  return (
    <section data-header-theme="light" className="min-h-screen bg-offwhite pb-24 pt-[calc(var(--header-h)+2rem)]">
      {justPaid && order.paymentStatus === "PAID" && <PurchaseTracker orderNumber={order.orderNumber} valueCents={order.totalCents} />}
      <Container size="2xl">
        <div className="mb-3 flex items-center gap-2"><HornMark className="h-5 text-electric" /><span className="eyebrow text-slate">Order {order.orderNumber}</span></div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="display text-[clamp(2.6rem,6vw,4.5rem)]">{justPaid && order.paymentStatus === "PAID" ? "Thank you. We're on it." : order.status === "PROOF_READY" ? "Your proof is ready." : "Your order."}</h1>
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(order.status)} className="text-sm">{ORDER_STATUS_LABEL[order.status]}</Badge>
            <Badge tone={order.paymentStatus === "PAID" ? "success" : "neutral"} className="text-sm">{order.paymentStatus === "PAID" ? "Paid" : order.source === "FREE_MOCKUP" ? "Free mockup" : "Unpaid"}</Badge>
          </div>
        </div>
        {justPaid && order.paymentStatus !== "PAID" && <p className="mt-4 rounded-2xl bg-ice p-4 text-sm">We&apos;re confirming your payment with our provider — this page will update shortly. You&apos;ll also get an email confirmation.</p>}

        {canPay && (
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-[1.5rem] bg-midnight p-6 text-white sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-turquoise" aria-hidden />
              <div><p className="font-display text-2xl font-extrabold uppercase">Proof approved — ready for payment</p><p className="text-sm text-white/70">Production starts as soon as payment is confirmed.</p></div>
            </div>
            <ButtonLink href={`/checkout?order=${order.id}&t=${token}`} arrow>Pay now</ButtonLink>
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {items.map(({ item, proofs }) => {
              const s = item.specSnapshot as Record<string, string>;
              return (
                <article key={item.id} id={`proof-${item.id}`} className="scroll-mt-24 rounded-[1.5rem] bg-white p-5 ring-1 ring-line sm:p-8">
                  <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14"><PatchArt code={item.configuration.patchType.code} title="" /></div>
                      <div>
                        <h2 className="font-display text-3xl font-extrabold uppercase leading-none">{item.productName}</h2>
                        <p className="mt-1 text-sm text-slate">{s.size} · {item.quantity.toLocaleString("en-US")} pcs · {s.backing}</p>
                      </div>
                    </div>
                    {item.totalCents > 0 && <p className="font-display text-2xl font-extrabold">{formatUSD(item.totalCents)}</p>}
                  </header>
                  <ProofPanel orderId={order.id} token={token} itemName={item.productName} proofs={proofs} maxUploadMb={settings.uploads.maxUploadMb} />
                </article>
              );
            })}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[1.5rem] bg-white p-6 ring-1 ring-line">
              <h2 className="font-display text-2xl font-extrabold uppercase">Progress</h2>
              <div className="mt-5"><TrackingTimeline status={order.status} events={order.statusEvents.filter((e) => e.isPublic)} /></div>
            </div>
            {order.shipments.length > 0 && (
              <div className="rounded-[1.5rem] bg-white p-6 ring-1 ring-line">
                <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold uppercase"><PackageCheck className="h-5 w-5 text-electric" aria-hidden /> Shipping</h2>
                {order.shipments.map((sh) => (
                  <div key={sh.id} className="mt-3 text-sm">
                    <p className="font-semibold">{sh.carrier}{sh.service ? ` · ${sh.service}` : ""}</p>
                    <p className="text-slate">{sh.trackingNumber}</p>
                    {sh.trackingUrl && <a href={sh.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-patch">Track package <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>}
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-[1.5rem] bg-white p-6 ring-1 ring-line">
              <h2 className="font-display text-2xl font-extrabold uppercase">Summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate">Placed</dt><dd>{formatDate(order.placedAt ?? order.createdAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate">Subtotal</dt><dd>{formatUSD(order.subtotalCents)}</dd></div>
                {order.discountCents > 0 && <div className="flex justify-between"><dt className="text-slate">Discount</dt><dd>−{formatUSD(order.discountCents)}</dd></div>}
                <div className="flex justify-between"><dt className="text-slate">Shipping</dt><dd>{order.shippingMethod ? (order.shippingCents ? formatUSD(order.shippingCents) : "Free") : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-slate">Tax</dt><dd>{formatUSD(order.taxCents)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatUSD(order.totalCents)}</dd></div>
              </dl>
              {order.paymentStatus === "PAID" && (
                <a href={`/invoice/${order.id}?t=${token}`} target="_blank" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-patch"><FileText className="h-4 w-4" aria-hidden /> Download invoice</a>
              )}
            </div>
            <p className="text-sm text-slate">Questions about this order? <Link href="/support" className="font-semibold text-patch">Talk to a patch expert</Link> and mention <strong>{order.orderNumber}</strong>.</p>
          </aside>
        </div>
      </Container>
    </section>
  );
}
