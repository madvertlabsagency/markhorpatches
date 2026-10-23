"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Select, Textarea } from "@/components/ui/fields";
import { disputeDecisionAction } from "@/app/admin/actions";

export function DisputeDecisionForm({ disputeId, canRefund }: { disputeId: string; canRefund: boolean }) {
  return (
    <ActionForm action={disputeDecisionAction} submitLabel="Record decision" confirm="Record this decision? It updates the ledger and notifies the seller.">
      <input type="hidden" name="disputeId" value={disputeId} />
      <Field id="decision" label="Outcome">
        <Select id="decision" name="decision">
          <option value="CREDIT">Uphold — credit to prepaid balance</option>
          {canRefund && <option value="REFUND">Uphold — refund to original card</option>}
          <option value="REJECT">Not upheld</option>
        </Select>
      </Field>
      <Field id="note" label="Reason (shared with the seller)"><Textarea id="note" name="note" rows={3} required minLength={5} /></Field>
    </ActionForm>
  );
}
