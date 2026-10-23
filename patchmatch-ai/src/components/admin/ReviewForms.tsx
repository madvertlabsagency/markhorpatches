"use client";

import { ActionForm } from "@/components/ui/client";
import { Card, CardHeader } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { clarifyRfqAction, qualifyRfqAction, rejectRfqAction } from "@/app/admin/actions";

export function ReviewForms({ rfqId, suggestedTier, suggestedPricing, questions }: { rfqId: string; suggestedTier: "A" | "B"; suggestedPricing: string; questions: string[] }) {
  return (
    <Card>
      <CardHeader title="Decision" description="Every decision is recorded in the audit log." />
      <div className="space-y-6 p-5">
        <ActionForm action={qualifyRfqAction} submitLabel="Qualify & start matching" submitVariant="success">
          <input type="hidden" name="rfqId" value={rfqId} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="tier" label="Tier"><Select id="tier" name="tier" defaultValue={suggestedTier}><option value="A">A — Production ready</option><option value="B">B — Needs clarification</option></Select></Field>
            <Field id="pricingTier" label="Pricing tier"><Select id="pricingTier" name="pricingTier" defaultValue={suggestedPricing}><option value="STANDARD">Standard Verified</option><option value="HIGH_INTENT">Contact-Ready</option><option value="PREMIUM">Premium Production-Ready</option><option value="ENTERPRISE">Enterprise (manual price)</option></Select></Field>
          </div>
          <Field id="note" label="Note" optional><Input id="note" name="note" maxLength={300} /></Field>
        </ActionForm>
        <div className="border-t border-line pt-5">
          <ActionForm action={clarifyRfqAction} submitLabel="Request clarification" submitVariant="secondary">
            <input type="hidden" name="rfqId" value={rfqId} />
            <Field id="questions" label="Questions for the buyer (one per line)"><Textarea id="questions" name="questions" rows={4} defaultValue={[...new Set(questions)].slice(0, 5).join("\n")} /></Field>
          </ActionForm>
        </div>
        <div className="border-t border-line pt-5">
          <ActionForm action={rejectRfqAction} submitLabel="Reject as invalid (Tier D)" submitVariant="danger" confirm="Reject and close this RFQ?">
            <input type="hidden" name="rfqId" value={rfqId} />
            <Field id="reason" label="Reason"><Input id="reason" name="reason" placeholder="e.g. spam / duplicate of PM-XXXX / not a patch request" required /></Field>
          </ActionForm>
        </div>
      </div>
    </Card>
  );
}
