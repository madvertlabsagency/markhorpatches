"use client";
import { useActionState } from "react";
import { supportAction } from "@/app/actions/leads";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";

export function SupportForm({ defaultTopic }: { defaultTopic?: string }) {
  const [state, action, pending] = useActionState(supportAction, undefined);
  const fe = state?.fieldErrors ?? {};
  if (state?.success) return <p role="status" className="rounded-2xl bg-success/10 p-6 font-semibold text-success">{state.success}</p>;
  return (
    <form action={action} onSubmit={() => track("submit_support")} className="grid gap-4 sm:grid-cols-2">
      {state?.error && <p role="alert" className="rounded-xl bg-danger/5 p-3 text-sm text-danger sm:col-span-2">{state.error}</p>}
      <Field label="Name" htmlFor="s-name" required error={fe.name}><Input id="s-name" name="name" autoComplete="name" required /></Field>
      <Field label="Email" htmlFor="s-email" required error={fe.email}><Input id="s-email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Phone" htmlFor="s-phone"><Input id="s-phone" name="phone" type="tel" /></Field>
      <Field label="Topic" htmlFor="s-topic" required>
        <Select id="s-topic" name="topic" defaultValue={defaultTopic === "quote" ? "Quote / bulk order" : "General question"}>
          {["General question", "Quote / bulk order", "Existing order", "Artwork help", "Proof question", "Shipping", "Something went wrong"].map((t) => <option key={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Order number" htmlFor="s-order" className="sm:col-span-2"><Input id="s-order" name="orderNumber" placeholder="PG-123456" /></Field>
      <Field label="Message" htmlFor="s-msg" required error={fe.message} className="sm:col-span-2"><Textarea id="s-msg" name="message" required /></Field>
      <div className="absolute left-[-9999px]" aria-hidden><input name="company_website" tabIndex={-1} autoComplete="off" /></div>
      <div className="sm:col-span-2"><Button size="lg" disabled={pending} arrow>{pending ? "Sending…" : "Send message"}</Button></div>
    </form>
  );
}
