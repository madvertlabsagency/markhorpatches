"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Input } from "@/components/ui/fields";
import { requestInvoiceAction } from "@/app/actions/seller";

export function RequestInvoiceForm() {
  return (
    <ActionForm action={requestInvoiceAction} submitLabel="Request invoice" resetOnSuccess>
      <Field id="amount" label="Amount (USD)" hint="Between $10 and $10,000.">
        <div className="relative"><span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">$</span><Input id="amount" name="amount" inputMode="decimal" className="tabular pl-7" defaultValue="100" required /></div>
      </Field>
    </ActionForm>
  );
}
