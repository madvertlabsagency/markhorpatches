"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Input } from "@/components/ui/fields";
import { adjustCreditsAction, issueInvoiceAction } from "@/app/admin/actions";

export function SellerFinanceForms({ orgId, sellerId }: { orgId: string; sellerId: string }) {
  return (
    <div className="space-y-6">
      <ActionForm action={issueInvoiceAction} submitLabel="Issue credit invoice" resetOnSuccess>
        <input type="hidden" name="orgId" value={orgId} />
        <div className="grid grid-cols-2 gap-3">
          <Field id="amount" label="Amount (USD)"><Input id="amount" name="amount" inputMode="decimal" required /></Field>
          <Field id="dueDays" label="Due in (days)"><Input id="dueDays" name="dueDays" inputMode="numeric" defaultValue="14" /></Field>
        </div>
        <Field id="description" label="Description"><Input id="description" name="description" defaultValue="Prepaid RFQ credits" /></Field>
      </ActionForm>
      <div className="border-t border-line pt-5">
        <ActionForm action={adjustCreditsAction} submitLabel="Add goodwill credit" submitVariant="secondary" resetOnSuccess confirm="Add credits without payment? This is audit-logged.">
          <input type="hidden" name="orgId" value={orgId} /><input type="hidden" name="sellerId" value={sellerId} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="adj" label="Amount (USD)"><Input id="adj" name="amount" inputMode="decimal" required /></Field>
            <Field id="memo" label="Reason"><Input id="memo" name="memo" required minLength={5} /></Field>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
