"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Input, Select } from "@/components/ui/fields";
import { createPricingRuleAction } from "@/app/admin/actions";
import { PATCH_TYPES } from "@/lib/catalog";

export function PricingRuleForm() {
  return (
    <ActionForm action={createPricingRuleAction} submitLabel="Create rule" resetOnSuccess>
      <Field id="name" label="Name"><Input id="name" name="name" required placeholder="e.g. PVC launch promo" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="tier" label="Tier"><Select id="tier" name="tier"><option value="STANDARD">Standard</option><option value="HIGH_INTENT">High intent</option><option value="PREMIUM">Premium</option><option value="ENTERPRISE">Enterprise</option></Select></Field>
        <Field id="patchType" label="Patch type" optional><Select id="patchType" name="patchType"><option value="">All</option>{PATCH_TYPES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</Select></Field>
        <Field id="distributionMode" label="Distribution" optional><Select id="distributionMode" name="distributionMode"><option value="">All</option><option value="EXCLUSIVE">Exclusive</option><option value="LIMITED_SHARED">Limited shared</option><option value="PRIVATE_INVITATION">Private invitation</option><option value="ADMIN_ASSIGNMENT">Admin assignment</option></Select></Field>
        <Field id="price" label="Price ($)"><Input id="price" name="price" inputMode="decimal" required /></Field>
        <Field id="discountPct" label="Promo discount %" optional><Input id="discountPct" name="discountPct" inputMode="decimal" /></Field>
        <Field id="priority" label="Priority" optional><Input id="priority" name="priority" inputMode="numeric" defaultValue="10" /></Field>
        <Field id="min" label="Min ($)" optional><Input id="min" name="min" inputMode="decimal" defaultValue="5" /></Field>
        <Field id="max" label="Max ($)" optional><Input id="max" name="max" inputMode="decimal" defaultValue="500" /></Field>
        <Field id="startsAt" label="Starts" optional><Input id="startsAt" name="startsAt" type="date" /></Field>
        <Field id="endsAt" label="Ends" optional><Input id="endsAt" name="endsAt" type="date" /></Field>
      </div>
    </ActionForm>
  );
}
