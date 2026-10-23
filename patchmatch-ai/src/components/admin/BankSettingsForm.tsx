"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { bankSettingsAction } from "@/app/admin/actions";

export function BankSettingsForm({ value }: { value: Record<string, string> }) {
  return (
    <ActionForm action={bankSettingsAction}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="accountName" label="Account name"><Input id="accountName" name="accountName" defaultValue={value.accountName} /></Field>
        <Field id="bankName" label="Bank"><Input id="bankName" name="bankName" defaultValue={value.bankName} /></Field>
        <Field id="iban" label="IBAN"><Input id="iban" name="iban" defaultValue={value.iban} /></Field>
        <Field id="swift" label="SWIFT"><Input id="swift" name="swift" defaultValue={value.swift} /></Field>
      </div>
      <Field id="instructions" label="Instructions"><Textarea id="instructions" name="instructions" rows={2} defaultValue={value.instructions} /></Field>
    </ActionForm>
  );
}
