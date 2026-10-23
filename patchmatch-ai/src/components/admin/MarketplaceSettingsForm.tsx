"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Input, Select } from "@/components/ui/fields";
import { marketplaceSettingsAction } from "@/app/admin/actions";
import type { MarketplaceSettings } from "@/lib/settings";

export function MarketplaceSettingsForm({ value }: { value: MarketplaceSettings }) {
  const num = (id: keyof MarketplaceSettings, label: string, hint?: string) => (
    <Field id={id} label={label} hint={hint}>
      <Input id={id} name={id} type="number" defaultValue={String(value[id])} className="tabular" />
    </Field>
  );
  return (
    <ActionForm action={marketplaceSettingsAction} submitLabel="Save settings" className="grid gap-4 sm:grid-cols-2">
      {num("sharedSellerLimit", "Shared RFQ seller limit", "Max manufacturers per shared request (buyer consent may allow fewer)")}
      {num("claimWindowDays", "Quality-claim window (days)")}
      {num("contactReadyMaxAgeDays", "Contact-Ready freshness (days)", "How recent the buyer's “ready for quotes” answer must be")}
      {num("intentExpiryDays", "Buyer intent expiry (days)")}
      <Field id="quoteReminderHours" label="Buyer quote reminders (hours)" hint="Up to two, comma separated — e.g. 24, 72">
        <Input id="quoteReminderHours" name="quoteReminderHours" defaultValue={value.quoteReminderHours.join(", ")} />
      </Field>
      {num("sellerReminderHours", "Seller quote reminder (hours after unlock)")}
      {num("sellerWeeklyCapacity", "Default seller weekly RFQ capacity")}
      <Field id="intakeMode" label="Buyer intake" hint="Waitlist: accept requests but hold matching while supply is short">
        <Select id="intakeMode" name="intakeMode" defaultValue={value.intakeMode}>
          <option value="open">Open</option>
          <option value="waitlist">Waitlist</option>
        </Select>
      </Field>
    </ActionForm>
  );
}
