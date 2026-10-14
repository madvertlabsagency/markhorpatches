"use client";
import { useActionState, useState } from "react";
import { submitMockupAction } from "@/app/actions/leads";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";
import { ArtworkUploader, type UploadedArtwork } from "@/components/configurator/ArtworkUploader";
import { track } from "@/lib/analytics";

export function MockupForm({ patchTypes, maxUploadMb, defaults }: { patchTypes: { id: string; name: string }[]; maxUploadMb: number; defaults: { type?: string; size?: string; qty?: string; notes?: string; artwork?: UploadedArtwork | null } }) {
  const [state, action, pending] = useActionState(submitMockupAction, undefined);
  const [artwork, setArtwork] = useState<UploadedArtwork | null>(defaults.artwork ?? null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} onSubmit={() => track("request_mockup")} className="space-y-6" noValidate>
      {state?.error && <p role="alert" className="rounded-2xl bg-danger/5 p-4 text-sm font-medium text-danger">{state.error}</p>}
      <div>
        <p className="mb-2 text-sm font-semibold">Artwork <span className="font-normal text-slate">(optional — you can send it later)</span></p>
        <ArtworkUploader value={artwork} onChange={setArtwork} maxMb={maxUploadMb} compact />
        <input type="hidden" name="artworkFileId" value={artwork?.id ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="m-name" required error={fe.name}><Input id="m-name" name="name" autoComplete="name" required aria-invalid={!!fe.name} /></Field>
        <Field label="Email" htmlFor="m-email" required error={fe.email}><Input id="m-email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} /></Field>
        <Field label="Phone" htmlFor="m-phone"><Input id="m-phone" name="phone" type="tel" autoComplete="tel" /></Field>
        <Field label="Company" htmlFor="m-company"><Input id="m-company" name="company" autoComplete="organization" /></Field>
        <Field label="Patch type" htmlFor="m-type">
          <Select id="m-type" name="patchTypeId" defaultValue={defaults.type ?? ""}>
            <option value="">Not sure — recommend one</option>
            {patchTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Approximate size" htmlFor="m-size" hint='e.g. 3" or 3 x 2'><Input id="m-size" name="approxSize" defaultValue={defaults.size} placeholder='3"' /></Field>
        <Field label="Quantity" htmlFor="m-qty" error={fe.quantity}><Input id="m-qty" name="quantity" type="number" inputMode="numeric" min={1} defaultValue={defaults.qty} placeholder="100" /></Field>
        <Field label="Deadline" htmlFor="m-deadline"><Input id="m-deadline" name="deadline" type="date" /></Field>
      </div>
      <Field label="Notes" htmlFor="m-notes"><Textarea id="m-notes" name="notes" defaultValue={defaults.notes} placeholder="Colors, where the patch is going, anything we should know" /></Field>
      <div className="absolute left-[-9999px]" aria-hidden><label>Website<input name="company_website" tabIndex={-1} autoComplete="off" /></label></div>
      <Checkbox id="m-consent" name="marketingConsent" label="Send me occasional patch ideas and offers. Unsubscribe anytime." />
      <Button size="lg" className="w-full sm:w-auto" disabled={pending} arrow>{pending ? "Sending…" : "Create my free mockup"}</Button>
      <p className="text-xs text-slate">No payment. No obligation. Nothing goes into production until you approve it.</p>
    </form>
  );
}
