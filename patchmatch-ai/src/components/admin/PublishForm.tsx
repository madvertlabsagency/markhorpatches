"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/client";
import { Field, Input, Select } from "@/components/ui/fields";
import { publishAction } from "@/app/admin/actions";

export function PublishForm({ rfqId, sharedEnabled, maxRecipients, eligible, needsPrice }: { rfqId: string; sharedEnabled: boolean; maxRecipients: number; eligible: { id: string; label: string }[]; needsPrice: boolean }) {
  const [mode, setMode] = useState("EXCLUSIVE");
  return (
    <ActionForm action={publishAction} submitLabel="Publish & notify" confirm="Publish this opportunity and notify the selected manufacturers?">
      <input type="hidden" name="rfqId" value={rfqId} />
      <Field id="mode" label="Distribution">
        <Select id="mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="EXCLUSIVE">Exclusive (launch default) — top matches notified, one can buy</option>
          <option value="PRIVATE_INVITATION">Private invitation — only selected manufacturers see it</option>
          <option value="ADMIN_ASSIGNMENT">Admin assignment — one specific eligible manufacturer</option>
          <option value="LIMITED_SHARED" disabled={!sharedEnabled || maxRecipients < 2}>Limited shared {sharedEnabled ? (maxRecipients < 2 ? "(buyer consented to 1)" : "") : "(disabled by feature flag)"}</option>
        </Select>
      </Field>
      {mode === "LIMITED_SHARED" && <Field id="maxUnlocks" label={`Max buyers' recipients (≤ ${maxRecipients})`}><Input id="maxUnlocks" name="maxUnlocks" inputMode="numeric" defaultValue={Math.min(2, maxRecipients)} /></Field>}
      {(mode === "PRIVATE_INVITATION" || mode === "ADMIN_ASSIGNMENT") && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Eligible manufacturers</legend>
          {eligible.length === 0 && <p className="text-sm text-muted">No eligible manufacturers.</p>}
          {eligible.map((e) => <label key={e.id} className="flex items-center gap-2 py-1 text-sm"><input type={mode === "ADMIN_ASSIGNMENT" ? "radio" : "checkbox"} name="sellerIds" value={e.id} className="accent-electric" /> {e.label}</label>)}
        </fieldset>
      )}
      <Field id="price" label={needsPrice ? "Unlock price (USD) — required for enterprise" : "Override price (USD)"} optional={!needsPrice} hint="Shown to sellers before purchase. Overrides are audit-logged."><Input id="price" name="price" inputMode="decimal" required={needsPrice} /></Field>
    </ActionForm>
  );
}
