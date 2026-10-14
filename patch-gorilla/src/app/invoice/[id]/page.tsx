import { notFound } from "next/navigation";
import { getAccessibleOrder } from "@/lib/order-access";
import { formatUSD } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Invoice | Markhor Patches", robots: { index: false } };

type Addr = { firstName: string; lastName: string; company?: string; line1: string; line2?: string; city: string; state: string; postalCode: string };

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const access = await getAccessibleOrder(id, t);
  if (!access || access.order.paymentStatus !== "PAID") notFound();
  const o = access.order;
  const bill = (o.billingAddress ?? o.shippingAddress) as Addr | null;
  return (
    <main className="mx-auto max-w-3xl bg-white p-10 text-navy print:p-0">
      <div className="flex items-start justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/markhor-badge-400.png" alt="Markhor Patches" className="h-auto w-28 object-contain" />
        <div className="text-right"><h1 className="display text-5xl">Invoice</h1><p className="text-sm text-slate">{o.orderNumber}</p><p className="text-sm text-slate">{formatDate(o.placedAt ?? o.createdAt)}</p></div>
      </div>
      {bill && (
        <div className="mt-10 text-sm"><p className="font-semibold">Billed to</p><p>{bill.firstName} {bill.lastName}</p>{bill.company && <p>{bill.company}</p>}<p>{bill.line1}{bill.line2 ? `, ${bill.line2}` : ""}</p><p>{bill.city}, {bill.state} {bill.postalCode}</p><p>{o.email}</p></div>
      )}
      <table className="mt-10 w-full text-sm">
        <thead><tr className="border-b-2 border-navy text-left"><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit</th><th className="py-2 text-right">Total</th></tr></thead>
        <tbody>
          {o.items.map((i) => {
            const s = i.specSnapshot as Record<string, string>;
            return (
              <tr key={i.id} className="border-b border-line"><td className="py-3"><p className="font-semibold">{i.productName}</p><p className="text-slate">{s.size} · {s.shape} · {s.backing}</p></td><td className="py-3 text-right">{i.quantity.toLocaleString("en-US")}</td><td className="py-3 text-right">{formatUSD(i.unitPriceCents)}</td><td className="py-3 text-right">{formatUSD(i.totalCents)}</td></tr>
            );
          })}
        </tbody>
      </table>
      <dl className="ml-auto mt-6 w-64 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatUSD(o.subtotalCents)}</dd></div>
        {o.discountCents > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{formatUSD(o.discountCents)}</dd></div>}
        <div className="flex justify-between"><dt>Shipping</dt><dd>{formatUSD(o.shippingCents)}</dd></div>
        <div className="flex justify-between"><dt>Tax</dt><dd>{formatUSD(o.taxCents)}</dd></div>
        <div className="flex justify-between border-t-2 border-navy pt-2 text-base font-bold"><dt>Paid</dt><dd>{formatUSD(o.totalCents)}</dd></div>
      </dl>
      <p className="mt-16 text-center text-xs text-slate">Thank you for choosing Markhor Patches — custom patches for bold brands.</p>
      <div className="mt-8 text-center print:hidden"><PrintButton /></div>
    </main>
  );
}
