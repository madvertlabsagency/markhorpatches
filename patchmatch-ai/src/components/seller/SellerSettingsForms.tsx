"use client";

import { ActionForm } from "@/components/ui/client";
import { Card, CardHeader } from "@/components/ui/primitives";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/fields";
import { preferencesAction, sellerProfileAction } from "@/app/actions/seller";

export function SellerSettingsForms({ prefs, profile }: { prefs: { availability: string; dailyRfqLimit: number; maxDailySpend: number; minBudget: number | null; emailOpportunities: boolean }; profile: { tradingName: string; description: string; website: string; phone: string } }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Opportunity preferences & spending controls" description="Applied to matching and enforced at purchase time." />
        <div className="p-5">
          <ActionForm action={preferencesAction}>
            <Field id="availability" label="Status"><Select id="availability" name="availability" defaultValue={prefs.availability}><option value="ACTIVE">Active — receive opportunities</option><option value="PAUSED">Paused — no new opportunities</option></Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="dailyRfqLimit" label="Max unlocks per day"><Input id="dailyRfqLimit" name="dailyRfqLimit" inputMode="numeric" defaultValue={prefs.dailyRfqLimit} /></Field>
              <Field id="maxDailySpend" label="Max spend per day ($)"><Input id="maxDailySpend" name="maxDailySpend" inputMode="decimal" defaultValue={prefs.maxDailySpend} /></Field>
            </div>
            <Field id="minBudget" label="Minimum project budget ($)" optional hint="Skip RFQs whose disclosed budget is below this."><Input id="minBudget" name="minBudget" inputMode="decimal" defaultValue={prefs.minBudget ?? ""} /></Field>
            <Checkbox id="emailOpportunities" name="emailOpportunities" defaultChecked={prefs.emailOpportunities} label="Email me when a matching RFQ is available" />
          </ActionForm>
        </div>
      </Card>
      <Card>
        <CardHeader title="Public profile" />
        <div className="p-5">
          <ActionForm action={sellerProfileAction}>
            <Field id="tradingName" label="Trading name" optional><Input id="tradingName" name="tradingName" defaultValue={profile.tradingName} /></Field>
            <Field id="phone" label="Phone"><Input id="phone" name="phone" defaultValue={profile.phone} required /></Field>
            <Field id="website" label="Website" optional><Input id="website" name="website" defaultValue={profile.website} /></Field>
            <Field id="description" label="Description" optional><Textarea id="description" name="description" rows={4} defaultValue={profile.description} /></Field>
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}
