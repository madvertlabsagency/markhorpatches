"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { contactAction } from "@/app/actions/public";

export function ContactForm() {
  return (
    <ActionForm action={contactAction} submitLabel="Send message" resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Name"><Input id="name" name="name" required maxLength={120} autoComplete="name" /></Field>
        <Field id="email" label="Email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
      </div>
      <Field id="topic" label="Topic">
        <Select id="topic" name="topic">
          <option value="buyer">I'm a buyer</option>
          <option value="seller">I'm a manufacturer</option>
          <option value="privacy">Privacy request</option>
          <option value="other">Something else</option>
        </Select>
      </Field>
      <Field id="message" label="Message"><Textarea id="message" name="message" rows={6} required minLength={10} maxLength={4000} /></Field>
      <input type="text" name="company_url" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
    </ActionForm>
  );
}
