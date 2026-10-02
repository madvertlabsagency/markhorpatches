"use client";
import { useState, useTransition } from "react";
import { captureCartEmailAction } from "@/app/actions/cart";
import { Checkbox, Input } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";

/** Optional "email me my cart" — follow-ups only with explicit consent. */
export function CartEmailCapture({ initialEmail }: { initialEmail?: string | null }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (done) return <p className="rounded-2xl bg-success/10 p-4 text-sm font-medium text-success">Saved. We&apos;ll keep your patches safe.</p>;
  return (
    <form
      className="rounded-2xl bg-white p-5 ring-1 ring-line"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await captureCartEmailAction(email, consent);
          if (r.ok) setDone(true);
          else setErr(r.error);
        });
      }}
    >
      <p className="font-semibold">Not ready yet?</p>
      <p className="mt-1 text-sm text-slate">Save your cart to your email and pick up later.</p>
      <div className="mt-3 flex gap-2">
        <label htmlFor="cart-email" className="sr-only">Email</label>
        <Input id="cart-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@brand.com" className="h-11" aria-invalid={!!err} />
        <Button size="sm" variant="dark" disabled={pending}>Save</Button>
      </div>
      <Checkbox id="cart-consent" className="mt-3" checked={consent} onChange={(e) => setConsent(e.target.checked)} label="Email me a reminder about my saved patches. Unsubscribe anytime." />
      {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
    </form>
  );
}
