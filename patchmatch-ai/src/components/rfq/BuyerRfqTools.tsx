"use client";

import { ActionForm, Dialog } from "@/components/ui/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Card, CardHeader } from "@/components/ui/primitives";
import { cancelRfqAction, reportProblemAction, updateRfqAction } from "@/app/actions/buyer";

export function BuyerRfqTools({ rfqId, editable, closable, clarification, spec }: { rfqId: string; editable: boolean; closable: boolean; clarification: boolean; spec: { width: number | null; height: number | null; quantity: number; colorCount: number | null; requiredBy: string; destinationPostal: string } }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {editable && (
        <Card>
          <CardHeader title={clarification ? "Answer clarification questions" : "Update your request"} description="Changes are re-checked before your request is shared." />
          <div className="p-5">
            <ActionForm action={updateRfqAction} submitLabel={clarification ? "Send answers" : "Save changes"}>
              <input type="hidden" name="rfqId" value={rfqId} />
              <Field id="notes" label={clarification ? "Your answers" : "Add a note"}><Textarea id="notes" name="notes" rows={4} maxLength={2000} /></Field>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field id="width" label="Width"><Input id="width" name="width" inputMode="decimal" defaultValue={spec.width ?? ""} /></Field>
                <Field id="height" label="Height"><Input id="height" name="height" inputMode="decimal" defaultValue={spec.height ?? ""} /></Field>
                <Field id="quantity" label="Quantity"><Input id="quantity" name="quantity" inputMode="numeric" defaultValue={spec.quantity} /></Field>
                <Field id="colorCount" label="Colours"><Input id="colorCount" name="colorCount" inputMode="numeric" defaultValue={spec.colorCount ?? ""} /></Field>
                <Field id="requiredBy" label="Needed by"><Input id="requiredBy" name="requiredBy" type="date" defaultValue={spec.requiredBy} /></Field>
                <Field id="destinationPostal" label="ZIP / postal"><Input id="destinationPostal" name="destinationPostal" defaultValue={spec.destinationPostal} /></Field>
              </div>
              <Field id="backing" label="Backing">
                <Select id="backing" name="backing" defaultValue="">
                  <option value="">Keep current</option>
                  <option value="SEW_ON">Sew-on</option><option value="IRON_ON">Iron-on</option><option value="HOOK_AND_LOOP">Hook-and-loop</option><option value="ADHESIVE">Adhesive</option><option value="NONE">No backing</option>
                </Select>
              </Field>
            </ActionForm>
          </div>
        </Card>
      )}
      <Card>
        <CardHeader title="Manage request" />
        <div className="flex flex-wrap gap-3 p-5">
          <Dialog trigger={<Button variant="secondary">Report a problem</Button>} title="Report a problem" description="Tell us what went wrong. Our team reviews every report.">
            <ActionForm action={reportProblemAction} submitLabel="Send report" resetOnSuccess>
              <input type="hidden" name="rfqId" value={rfqId} />
              <Field id="reason" label="Reason">
                <Select id="reason" name="reason"><option>Manufacturer behaviour</option><option>Spam or unwanted contact</option><option>Quote problem</option><option>Privacy concern</option><option>Other</option></Select>
              </Field>
              <Field id="details" label="Details"><Textarea id="details" name="details" rows={4} required minLength={10} /></Field>
            </ActionForm>
          </Dialog>
          {closable && (
            <Dialog trigger={<Button variant="ghost" className="text-danger">Close request</Button>} title="Close this request?" description="Manufacturers will no longer be able to purchase or quote. This can't be undone.">
              <ActionForm action={cancelRfqAction} submitLabel="Close request" submitVariant="danger">
                <input type="hidden" name="rfqId" value={rfqId} />
                <Field id="reason" label="Reason (optional)"><Input id="reason" name="reason" maxLength={300} /></Field>
              </ActionForm>
            </Dialog>
          )}
        </div>
      </Card>
    </div>
  );
}
