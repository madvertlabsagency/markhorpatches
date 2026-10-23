"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Select, Textarea } from "@/components/ui/fields";
import { verificationDecisionAction } from "@/app/admin/actions";
import { VERIFICATION_TRANSITIONS } from "@/lib/state-machines";

const LABEL: Record<string, string> = { VERIFIED: "Approve (verified)", INFO_REQUIRED: "Request more information", REJECTED: "Reject", SUSPENDED: "Suspend", PENDING_REVIEW: "Return to review" };

export function VerificationDecisionForm({ sellerId, status }: { sellerId: string; status: keyof typeof VERIFICATION_TRANSITIONS }) {
  const options = VERIFICATION_TRANSITIONS[status].filter((s) => s !== "UNVERIFIED");
  if (!options.length) return <p className="text-sm text-muted">No decisions available in this state.</p>;
  return (
    <ActionForm action={verificationDecisionAction} submitLabel="Record decision" confirm="Record this verification decision?">
      <input type="hidden" name="sellerId" value={sellerId} />
      <Field id="decision" label="Decision"><Select id="decision" name="decision">{options.map((o) => <option key={o} value={o}>{LABEL[o] ?? o}</option>)}</Select></Field>
      <Field id="reason" label="Reason / information requested" hint="Required for rejection, suspension and information requests."><Textarea id="reason" name="reason" rows={3} /></Field>
    </ActionForm>
  );
}
