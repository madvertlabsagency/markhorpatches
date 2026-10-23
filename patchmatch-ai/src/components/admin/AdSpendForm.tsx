"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Input, Select } from "@/components/ui/fields";
import { adSpendAction } from "@/app/admin/actions";

export function AdSpendForm() {
  return (
    <ActionForm action={adSpendAction} submitLabel="Save spend" resetOnSuccess>
      <div className="grid grid-cols-2 gap-3">
        <Field id="date" label="Date"><Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
        <Field id="channel" label="Channel"><Select id="channel" name="channel"><option>Meta Ads</option><option>Google Search Ads</option><option>Retargeting</option><option>SEO / content</option><option>Referral</option><option>Other</option></Select></Field>
        <Field id="amount" label="Amount (USD)"><Input id="amount" name="amount" inputMode="decimal" required /></Field>
        <Field id="leads" label="Platform-reported leads" optional><Input id="leads" name="leads" inputMode="numeric" /></Field>
      </div>
      <Field id="campaign" label="Campaign" optional><Input id="campaign" name="campaign" /></Field>
    </ActionForm>
  );
}
