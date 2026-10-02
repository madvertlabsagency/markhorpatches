import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Lock } from "lucide-react";
import { currentCart } from "@/lib/cart-session";
import { loadCart, type CartLine } from "@/lib/domain/cart";
import { loadSettings } from "@/lib/settings";
import { formatUSD } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { PatchArt } from "@/components/brand/PatchArt";
import { Crown } from "@/components/brand/marks";
import { CartLineActions } from "@/components/cart/CartLineActions";
import { CartEmailCapture } from "@/components/cart/CartEmailCapture";

export const metadata: Metadata = pageMetadata({ title: "Your Cart | Patch Gorilla", path: "/cart", noindex: true });

function Line({ l }: { l: CartLine }) {
  const d = l.description;
  return (
    <li className="flex flex-col gap-4 rounded-[var(--radius-patch)] bg-white p-5 ring-1 ring-line sm:flex-row">
      <div className="w-20 shrink-0 self-start"><PatchArt code={l.config.patchType.code} title="" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-2xl font-extrabold uppercase leading-none">{d.patchType}</h3>
            <p className="mt-1 text-sm text-slate">{d.size} · {d.shape} · {d.backing}{d.border !== "—" ? ` · ${d.border}` : ""}{d.extras.length ? ` · ${d.extras.join(", ")}` : ""}</p>
            <p className="mt-0.5 text-sm text-slate">Artwork: {d.artwork}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold">{formatUSD(l.totalCents)}</p>
            <p className="text-sm text-slate">{l.config.quantity.toLocaleString("en-US")} × {formatUSD(l.unitPriceCents)}</p>
          </div>
        </div>
        {l.priceChanged && <p className="mt-2 text-sm text-patch">Price updated to our current price list.</p>}
        {l.invalidReason && <p role="alert" className="mt-2 flex gap-2 text-sm text-danger"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />{l.invalidReason} Edit this item to continue.</p>}
        <div className="mt-3 -ml-3"><CartLineActions itemId={l.id} saved={l.savedForLater} /></div>
      </div>
    </li>
  );
}

export default async function CartPage() {
  const cart = await currentCart();
  const loaded = cart ? await loadCart(cart.id) : null;
  const settings = await loadSettings();

  return (
    <section data-header-theme="light" className="min-h-screen bg-offwhite pb-24 pt-[calc(var(--header-h)+2rem)]">
      <Container>
        <div className="mb-8 flex items-center gap-2"><Crown className="h-5 text-electric" /><span className="eyebrow text-slate">Cart</span></div>
        <h1 className="display text-[clamp(2.8rem,7vw,5rem)]">Your patches.</h1>
        {!loaded || loaded.lines.length === 0 ? (
          <EmptyState className="mt-10" title="Your cart is empty." description="Every great patch starts with an idea. Let's build yours." action={<ButtonLink href="/build-your-patch" arrow>Build your patch</ButtonLink>} />
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              {loaded.activeLines.length > 0 ? (
                <ul className="space-y-4">{loaded.activeLines.map((l) => <Line key={l.id} l={l} />)}</ul>
              ) : (
                <p className="rounded-2xl bg-white p-6 text-slate ring-1 ring-line">No items in your cart — move a saved design back in, or <Link className="font-semibold text-patch" href="/build-your-patch">build a new patch</Link>.</p>
              )}
              {loaded.savedLines.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-extrabold uppercase">Saved for later</h2>
                  <ul className="mt-4 space-y-4 opacity-90">{loaded.savedLines.map((l) => <Line key={l.id} l={l} />)}</ul>
                </div>
              )}
              <Link href="/build-your-patch" className="inline-block font-semibold text-patch hover:underline">+ Add another patch design</Link>
            </div>
            <aside className="space-y-4">
              <div className="sticky top-24 space-y-4">
                <div className="rounded-[1.5rem] bg-midnight p-6 text-white">
                  <p className="eyebrow text-white/50">Order summary</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-white/60">Items</dt><dd>{loaded.itemCount}</dd></div>
                    <div className="flex justify-between"><dt className="text-white/60">Subtotal</dt><dd className="font-semibold">{formatUSD(loaded.subtotalCents)}</dd></div>
                    <div className="flex justify-between"><dt className="text-white/60">Shipping</dt><dd>{settings.shipping.freeThresholdCents && loaded.subtotalCents >= settings.shipping.freeThresholdCents ? "Free" : "Calculated at checkout"}</dd></div>
                  </dl>
                  <p className="display mt-5 text-5xl">{formatUSD(loaded.subtotalCents)}</p>
                  <ButtonLink href="/checkout" size="lg" className={`mt-5 w-full ${loaded.hasInvalid || !loaded.itemCount ? "pointer-events-none opacity-50" : ""}`} arrow aria-disabled={loaded.hasInvalid || !loaded.itemCount}>Checkout</ButtonLink>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/50"><Lock className="h-3.5 w-3.5" aria-hidden /> Secure checkout · Nothing is produced until you approve a proof</p>
                </div>
                <CartEmailCapture initialEmail={loaded.cart.email} />
              </div>
            </aside>
          </div>
        )}
      </Container>
    </section>
  );
}
