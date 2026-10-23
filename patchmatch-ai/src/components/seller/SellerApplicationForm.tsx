"use client";

import Link from "next/link";
import { ActionForm } from "@/components/ui/client";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/fields";
import { applyAction } from "@/app/actions/seller";
import { COUNTRIES } from "@/lib/catalog";

export function SellerApplicationForm({ defaultEmail, defaultName }: { defaultEmail: string; defaultName: string }) {
  return (
    <ActionForm action={applyAction} submitLabel="Continue to capabilities" pendingLabel="Saving…">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="legalName" label="Legal business name"><Input id="legalName" name="legalName" required /></Field>
        <Field id="tradingName" label="Trading name" optional><Input id="tradingName" name="tradingName" /></Field>
        <Field id="country" label="Country">
          <Select id="country" name="country" defaultValue="PK">{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select>
        </Field>
        <Field id="city" label="City" optional><Input id="city" name="city" /></Field>
        <Field id="addressLine1" label="Business address" optional className="sm:col-span-2"><Input id="addressLine1" name="addressLine1" autoComplete="street-address" /></Field>
        <Field id="region" label="State / province" optional><Input id="region" name="region" /></Field>
        <Field id="postalCode" label="Postal code" optional><Input id="postalCode" name="postalCode" /></Field>
        <Field id="contactName" label="Contact person"><Input id="contactName" name="contactName" defaultValue={defaultName} required /></Field>
        <Field id="email" label="Business email"><Input id="email" name="email" type="email" defaultValue={defaultEmail} required /></Field>
        <Field id="phone" label="Phone (with country code)"><Input id="phone" name="phone" type="tel" required placeholder="+92 …" /></Field>
        <Field id="website" label="Website" optional><Input id="website" name="website" /></Field>
        <Field id="registrationNumber" label="Business registration number" optional><Input id="registrationNumber" name="registrationNumber" /></Field>
        <Field id="yearsOperating" label="Years operating" optional><Input id="yearsOperating" name="yearsOperating" inputMode="numeric" /></Field>
        <Field id="factoryLocation" label="Factory location" optional className="sm:col-span-2"><Input id="factoryLocation" name="factoryLocation" placeholder="e.g. Sialkot, Punjab" /></Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Export markets <span className="font-normal text-muted">(optional)</span></legend>
        <div className="flex flex-wrap gap-3">{COUNTRIES.map((c) => <label key={c.code} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="exportMarkets" value={c.code} className="accent-electric" /> {c.name}</label>)}</div>
      </fieldset>
      <Field id="description" label="Company description" optional hint="Shown on your public profile once verified."><Textarea id="description" name="description" rows={4} maxLength={1500} /></Field>
      <Checkbox id="acceptTerms" name="acceptTerms" required label={<>I accept the <Link href="/seller-terms" target="_blank" className="text-electric underline">Seller Terms</Link> and <Link href="/rfq-quality-policy" target="_blank" className="text-electric underline">RFQ Quality Policy</Link>, and understand an RFQ is not a guaranteed order.</>} />
    </ActionForm>
  );
}
