"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/client";
import { Field, Select, Textarea } from "@/components/ui/fields";
import { FileUploader, type UploadedFile } from "@/components/forms/FileUploader";
import { fileClaimAction } from "@/app/actions/seller";

export function ClaimForm({ unlocks, defaultUnlock }: { unlocks: { id: string; label: string }[]; defaultUnlock?: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  return (
    <ActionForm action={fileClaimAction} submitLabel="Submit claim" resetOnSuccess>
      {files.map((f) => <input key={f.id} type="hidden" name="evidenceIds" value={f.id} />)}
      <Field id="unlockId" label="Purchase"><Select id="unlockId" name="unlockId" defaultValue={defaultUnlock}>{unlocks.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</Select></Field>
      <Field id="reason" label="Reason">
        <Select id="reason" name="reason">
          <option value="INVALID_CONTACT">Invalid contact details</option>
          <option value="DUPLICATE">Duplicate of an RFQ I already bought</option>
          <option value="SPAM_OR_FRAUD">Spam or fraudulent</option>
          <option value="NOT_AS_DESCRIBED">Materially different from the preview</option>
          <option value="BUYER_ALREADY_SOURCED">Buyer had already sourced elsewhere</option>
          <option value="OTHER">Other</option>
        </Select>
      </Field>
      <Field id="description" label="What happened?" hint="Include dates of contact attempts, bounce messages, etc."><Textarea id="description" name="description" rows={5} required minLength={20} /></Field>
      <div><p className="mb-2 text-sm font-medium">Evidence <span className="font-normal text-muted">(screenshots, bounce emails)</span></p><FileUploader purpose="DISPUTE_EVIDENCE" value={files} onChange={setFiles} compact /></div>
    </ActionForm>
  );
}
