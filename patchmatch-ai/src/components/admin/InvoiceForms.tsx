"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Input, Select } from "@/components/ui/fields";
import { issueInvoiceAction, markInvoicePaidAction } from "@/app/admin/actions";

export function InvoicePaidForm({ invoiceId }: { invoiceId: string }) {
  return (
    <ActionForm action={markInvoicePaidAction} submitLabel="Mark paid" submitSize="sm" submitVariant="success" confirm="Confirm the bank transfer was received? Credits will be added." className="flex flex-wrap items-end gap-2 space-y-0">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Input name="reference" placeholder="Bank reference" required className="h-9 w-40" aria-label="Bank reference" />
    </ActionForm>
  );
}

export function IssueInvoiceForSeller({ sellers, defaultOrg, defaultAmount }: { sellers: { id: string; name: string }[]; defaultOrg?: string; defaultAmount?: string }) {
  return (
    <ActionForm action={issueInvoiceAction} submitLabel="Issue invoice" resetOnSuccess>
      <Field id="orgId" label="Seller"><Select id="orgId" name="orgId" defaultValue={defaultOrg}>{sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="amount" label="Amount (USD)"><Input id="amount" name="amount" inputMode="decimal" defaultValue={defaultAmount} required /></Field>
        <Field id="dueDays" label="Due (days)"><Input id="dueDays" name="dueDays" inputMode="numeric" defaultValue="14" /></Field>
      </div>
      <Field id="description" label="Description"><Input id="description" name="description" defaultValue="Prepaid RFQ credits" /></Field>
    </ActionForm>
  );
}
