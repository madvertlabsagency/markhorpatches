"use client";
import { useMemo, useState, useTransition } from "react";
import { Lock, Tag } from "lucide-react";
import { checkoutAction } from "@/app/actions/checkout";
import { orderTotals } from "@/lib/pricing/engine";
import { formatUSD } from "@/lib/money";
import { track } from "@/lib/analytics";
import { US_STATES, type ShippingRate } from "@/lib/services/shipping";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Line { id: string; name: string; detail: string; totalCents: number }
interface Addr { firstName: string; lastName: string; company: string; line1: string; line2: string; city: string; state: string; postalCode: string; country: "US"; phone: string }
const emptyAddr = (): Addr => ({ firstName: "", lastName: "", company: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "US", phone: "" });

export function CheckoutForm(props: {
  lines: Line[];
  subtotalCents: number;
  rates: ShippingRate[];
  tax: { mode: string; ratesBps: Record<string, number>; taxShipping: boolean };
  coupon: { code: string; type: "PERCENT" | "FIXED"; value: number; minSubtotalCents: number } | null;
  initialContact: { firstName: string; lastName: string; email: string; phone: string; company: string };
  orderId?: string;
  orderToken?: string;
  cancelled?: boolean;
}) {
  const [contact, setContact] = useState(props.initialContact);
  const [ship, setShip] = useState<Addr>({ ...emptyAddr(), firstName: props.initialContact.firstName, lastName: props.initialContact.lastName });
  const [billingSame, setBillingSame] = useState(true);
  const [bill, setBill] = useState<Addr>(emptyAddr());
  const [method, setMethod] = useState(props.rates[0]?.code ?? "standard");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [couponCode, setCouponCode] = useState(props.coupon?.code ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(props.cancelled ? "Payment was cancelled. Your order is saved — you can try again whenever you're ready." : null);
  const [pending, start] = useTransition();

  const rate = props.rates.find((r) => r.code === method) ?? props.rates[0];
  const totals = useMemo(
    () => orderTotals({ lines: [{ lineSubtotalCents: props.subtotalCents }], coupon: props.coupon, shippingCents: rate?.cents ?? 0, taxRateBps: props.tax.mode === "flat_by_state" ? props.tax.ratesBps[ship.state] ?? 0 : 0, taxShipping: props.tax.taxShipping }),
    [props.subtotalCents, props.coupon, rate, props.tax, ship.state],
  );

  const err = (k: string) => errors[k];
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    track("begin_checkout", { value: totals.totalCents / 100, currency: "USD" });
    start(async () => {
      const res = await checkoutAction({
        contact, shipping: ship, billingSame, billing: billingSame ? null : bill, shippingMethod: method, couponCode: couponCode || null, notes, marketingConsent: consent,
        orderId: props.orderId ?? null, orderToken: props.orderToken ?? null,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        document.getElementById("checkout-error")?.focus();
        return;
      }
      window.location.assign(res.redirectUrl);
    });
  };

  const addrFields = (prefix: "shipping" | "billing", a: Addr, set: (a: Addr) => void) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" htmlFor={`${prefix}-fn`} required error={err(`${prefix}.firstName`)}><Input id={`${prefix}-fn`} autoComplete={`${prefix} given-name`} value={a.firstName} onChange={(e) => set({ ...a, firstName: e.target.value })} aria-invalid={!!err(`${prefix}.firstName`)} required /></Field>
      <Field label="Last name" htmlFor={`${prefix}-ln`} required error={err(`${prefix}.lastName`)}><Input id={`${prefix}-ln`} autoComplete={`${prefix} family-name`} value={a.lastName} onChange={(e) => set({ ...a, lastName: e.target.value })} aria-invalid={!!err(`${prefix}.lastName`)} required /></Field>
      <Field label="Address" htmlFor={`${prefix}-l1`} required error={err(`${prefix}.line1`)} className="sm:col-span-2"><Input id={`${prefix}-l1`} autoComplete={`${prefix} address-line1`} value={a.line1} onChange={(e) => set({ ...a, line1: e.target.value })} aria-invalid={!!err(`${prefix}.line1`)} required /></Field>
      <Field label="Apartment, suite, etc." htmlFor={`${prefix}-l2`} className="sm:col-span-2"><Input id={`${prefix}-l2`} autoComplete={`${prefix} address-line2`} value={a.line2} onChange={(e) => set({ ...a, line2: e.target.value })} /></Field>
      <Field label="City" htmlFor={`${prefix}-city`} required error={err(`${prefix}.city`)}><Input id={`${prefix}-city`} autoComplete={`${prefix} address-level2`} value={a.city} onChange={(e) => set({ ...a, city: e.target.value })} aria-invalid={!!err(`${prefix}.city`)} required /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="State" htmlFor={`${prefix}-st`} required error={err(`${prefix}.state`)}>
          <Select id={`${prefix}-st`} autoComplete={`${prefix} address-level1`} value={a.state} onChange={(e) => set({ ...a, state: e.target.value })} aria-invalid={!!err(`${prefix}.state`)} required>
            <option value="">—</option>
            {US_STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </Select>
        </Field>
        <Field label="ZIP" htmlFor={`${prefix}-zip`} required error={err(`${prefix}.postalCode`)}><Input id={`${prefix}-zip`} autoComplete={`${prefix} postal-code`} inputMode="numeric" value={a.postalCode} onChange={(e) => set({ ...a, postalCode: e.target.value })} aria-invalid={!!err(`${prefix}.postalCode`)} required /></Field>
      </div>
      <Field label="Country" htmlFor={`${prefix}-country`} required><Select id={`${prefix}-country`} value="US" disabled><option value="US">United States</option></Select></Field>
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_400px]" noValidate>
      <div className="space-y-8">
        {formError && <div id="checkout-error" tabIndex={-1} role="alert" className="rounded-2xl border border-danger/25 bg-danger/5 p-4 text-sm font-medium text-navy">{formError}</div>}
        <fieldset className="rounded-[1.5rem] bg-white p-6 ring-1 ring-line sm:p-8">
          <legend className="sr-only">Contact</legend>
          <h2 className="font-display text-3xl font-extrabold uppercase">1. Contact</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="c-fn" required error={err("contact.firstName")}><Input id="c-fn" autoComplete="given-name" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} required /></Field>
            <Field label="Last name" htmlFor="c-ln" required error={err("contact.lastName")}><Input id="c-ln" autoComplete="family-name" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} required /></Field>
            <Field label="Email" htmlFor="c-email" required error={err("contact.email")} hint="Your proof and order updates go here."><Input id="c-email" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} required /></Field>
            <Field label="Phone" htmlFor="c-phone" error={err("contact.phone")}><Input id="c-phone" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></Field>
            <Field label="Company" htmlFor="c-company" className="sm:col-span-2"><Input id="c-company" autoComplete="organization" value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} /></Field>
          </div>
        </fieldset>

        <fieldset className="rounded-[1.5rem] bg-white p-6 ring-1 ring-line sm:p-8">
          <legend className="sr-only">Shipping</legend>
          <h2 className="font-display text-3xl font-extrabold uppercase">2. Shipping</h2>
          <div className="mt-5">{addrFields("shipping", ship, setShip)}</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Shipping method">
            {props.rates.map((r) => (
              <label key={r.code} className={cn("flex cursor-pointer items-center justify-between rounded-2xl border-2 p-4 transition", method === r.code ? "border-electric bg-electric/5" : "border-navy/10")}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="ship-method" value={r.code} checked={method === r.code} onChange={() => setMethod(r.code)} className="h-4 w-4 accent-electric" />
                  <span><span className="block font-semibold">{r.label}</span><span className="text-sm text-slate">{r.transitMin}–{r.transitMax} business days after production</span></span>
                </span>
                <span className="font-semibold">{r.cents ? formatUSD(r.cents) : "Free"}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-[1.5rem] bg-white p-6 ring-1 ring-line sm:p-8">
          <legend className="sr-only">Billing</legend>
          <h2 className="font-display text-3xl font-extrabold uppercase">3. Billing</h2>
          <Checkbox id="billing-same" className="mt-4" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} label="Billing address is the same as shipping" />
          {!billingSame && <div className="mt-5">{addrFields("billing", bill, setBill)}</div>}
          {!props.orderId && (
            <Field label="Order notes" htmlFor="notes" className="mt-6"><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Deadline, delivery instructions, anything we should know" /></Field>
          )}
          <Checkbox id="marketing" className="mt-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} label="Send me occasional patch ideas and offers. Unsubscribe anytime." />
        </fieldset>
      </div>

      <aside>
        <div className="sticky top-24 rounded-[1.5rem] bg-midnight p-6 text-white">
          <p className="eyebrow text-white/50">Order summary</p>
          <ul className="mt-4 space-y-3 border-b border-white/10 pb-4">
            {props.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-4 text-sm"><span><span className="font-semibold">{l.name}</span><span className="block text-white/55">{l.detail}</span></span><span className="shrink-0">{formatUSD(l.totalCents)}</span></li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <label htmlFor="coupon" className="sr-only">Discount code</label>
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden />
              <input id="coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Discount code" className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-turquoise focus:outline-none" />
            </div>
          </div>
          {couponCode && couponCode !== props.coupon?.code && <p className="mt-1 text-xs text-white/50">Code will be validated when you continue.</p>}
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-white/60">Subtotal</dt><dd>{formatUSD(totals.subtotalCents)}</dd></div>
            {totals.discountCents > 0 && <div className="flex justify-between text-turquoise"><dt>Discount ({props.coupon?.code})</dt><dd>−{formatUSD(totals.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-white/60">Shipping</dt><dd>{totals.shippingCents ? formatUSD(totals.shippingCents) : "Free"}</dd></div>
            <div className="flex justify-between"><dt className="text-white/60">Tax</dt><dd>{props.tax.mode === "stripe" ? "Calculated at payment" : formatUSD(totals.taxCents)}</dd></div>
          </dl>
          <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
            <span className="text-white/60">Total</span>
            <span className="display text-5xl">{formatUSD(totals.totalCents)}</span>
          </div>
          <Button size="lg" className="mt-6 w-full" disabled={pending} arrow>{pending ? "Securing payment…" : "Continue to payment"}</Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-white/50"><Lock className="h-3.5 w-3.5" aria-hidden /> Payment is processed securely by our payment provider. We never see your card number.</p>
          <p className="mt-3 text-center text-xs text-white/50">Your final total is confirmed on the next screen.</p>
        </div>
      </aside>
    </form>
  );
}
