import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentCart } from "@/lib/cart-session";
import { loadCart } from "@/lib/domain/cart";
import { validateCoupon } from "@/lib/domain/orders";
import { loadSettings } from "@/lib/settings";
import { shippingRates } from "@/lib/services/shipping";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyOrderAccessToken } from "@/lib/crypto";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/Section";
import { Crown } from "@/components/brand/marks";
import { CheckoutForm } from "@/components/cart/CheckoutForm";

export const metadata: Metadata = pageMetadata({ title: "Checkout | Patch Gorilla", path: "/checkout", noindex: true });

type SP = Promise<Record<string, string | undefined>>;

export default async function CheckoutPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [settings, user] = await Promise.all([loadSettings(), getCurrentUser()]);

  let lines: { id: string; name: string; detail: string; totalCents: number }[] = [];
  let subtotal = 0;
  let couponCode: string | null = null;
  let contact = { firstName: user?.customer?.firstName ?? "", lastName: user?.customer?.lastName ?? "", email: user?.email ?? "", phone: user?.customer?.phone ?? "", company: user?.customer?.company ?? "" };
  let orderId: string | undefined;

  if (sp.order) {
    const order = await prisma.order.findUnique({ where: { id: sp.order }, include: { items: true } });
    const allowed = order && (verifyOrderAccessToken(order.id, sp.t) || (user?.customer && order.customerId === user.customer.id));
    if (!order || !allowed) redirect("/track-order");
    if (order.paymentStatus === "PAID") redirect(`/order/${order.id}?t=${sp.t ?? ""}`);
    if (order.source === "CHECKOUT" && !["PAYMENT_PENDING"].includes(order.status)) redirect(`/order/${order.id}?t=${sp.t ?? ""}`);
    if (order.source === "CHECKOUT") {
      // Retry payment for an existing checkout order.
    } else if (!["PROOF_APPROVED", "PAYMENT_PENDING"].includes(order.status)) {
      redirect(`/order/${order.id}?t=${sp.t ?? ""}`);
    }
    orderId = order.id;
    lines = order.items.map((i) => ({ id: i.id, name: `${i.productName} × ${i.quantity.toLocaleString("en-US")}`, detail: "Approved proof", totalCents: i.totalCents }));
    subtotal = order.subtotalCents;
    couponCode = order.couponCode;
    contact = { firstName: order.firstName ?? "", lastName: order.lastName ?? "", email: order.email, phone: order.phone ?? "", company: order.company ?? "" };
  } else {
    const cart = await currentCart();
    const loaded = cart ? await loadCart(cart.id) : null;
    if (!loaded || !loaded.activeLines.length || loaded.hasInvalid) redirect("/cart");
    lines = loaded.activeLines.map((l) => ({ id: l.id, name: `${l.description.patchType} × ${l.config.quantity.toLocaleString("en-US")}`, detail: `${l.description.size} · ${l.description.backing}`, totalCents: l.totalCents }));
    subtotal = loaded.subtotalCents;
    couponCode = loaded.cart.couponCode;
    if (!contact.email && loaded.cart.email) contact.email = loaded.cart.email;
  }

  const coupon = await validateCoupon(couponCode, subtotal);
  return (
    <section data-header-theme="light" className="min-h-screen bg-offwhite pb-24 pt-[calc(var(--header-h)+2rem)]">
      <Container size="2xl">
        <div className="mb-3 flex items-center gap-2"><Crown className="h-5 text-electric" /><span className="eyebrow text-slate">Secure checkout</span></div>
        <h1 className="display mb-8 text-[clamp(2.6rem,6vw,4.5rem)]">{orderId ? "Pay for your order." : "Almost there."}</h1>
        <CheckoutForm
          lines={lines}
          subtotalCents={subtotal}
          rates={shippingRates(settings.shipping, subtotal)}
          tax={settings.tax}
          coupon={coupon}
          initialContact={contact}
          orderId={orderId}
          orderToken={sp.t}
          cancelled={sp.cancelled === "1"}
        />
      </Container>
    </section>
  );
}
