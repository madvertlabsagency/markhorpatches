"use client";
import { useActionState } from "react";
import { trackOrderAction } from "@/app/actions/leads";
import { Field, Input } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";

export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrderAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p role="alert" className="rounded-xl bg-danger/5 p-3 text-sm font-medium text-danger">{state.error}</p>}
      <Field label="Order number" htmlFor="t-num" required hint="Starts with PG- (find it in your confirmation email)"><Input id="t-num" name="orderNumber" placeholder="PG-123456" required autoCapitalize="characters" /></Field>
      <Field label="Email" htmlFor="t-email" required><Input id="t-email" name="email" type="email" autoComplete="email" required /></Field>
      <Button size="lg" className="w-full" disabled={pending} arrow>{pending ? "Finding…" : "Track order"}</Button>
    </form>
  );
}
