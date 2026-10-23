"use client";

import { useActionState, useState, useTransition } from "react";
import { Save, Send, Sparkles, Wand2 } from "lucide-react";
import { saveQuoteAction, copilotAction, withdrawQuoteAction } from "@/app/actions/seller";
import { computeQuoteTotals } from "@/lib/quote-math";
import { formatMoney } from "@/lib/money";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/client";
import { FileUploader, type UploadedFile } from "@/components/forms/FileUploader";

type Existing = {
  id: string; status: string; quantity: number; unitPrice: number; setupFee: number; sampleFee: number; toolingFee: number; artworkFee: number; shipping: number; productionDays: number;
  deliveryEstimate: string; moq?: number; samplePolicy: string; paymentTerms: string; revisionPolicy: string; notes: string;
};

export function QuoteBuilder({ rfqId, defaultQuantity, existing }: { rfqId: string; defaultQuantity: number; existing: Existing | null }) {
  const [state, action] = useActionState(saveQuoteAction, null);
  const [v, setV] = useState({
    quantity: String(existing?.quantity ?? defaultQuantity), unitPrice: existing ? String(existing.unitPrice) : "", setupFee: String(existing?.setupFee ?? ""), sampleFee: String(existing?.sampleFee ?? ""),
    toolingFee: String(existing?.toolingFee ?? ""), artworkFee: String(existing?.artworkFee ?? ""), shipping: String(existing?.shipping ?? ""), notes: existing?.notes ?? "",
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [copilot, setCopilot] = useState<{ coverMessage: string; checklist: string[]; warnings: string[] } | null>(null);
  const [aiPending, startAi] = useTransition();
  const [wdPending, startWd] = useTransition();
  const n = (s: string) => (Number.isFinite(Number(s)) && s !== "" ? Number(s) : 0);
  const totals = computeQuoteTotals({ quantity: n(v.quantity), unitPrice: n(v.unitPrice), setupFee: n(v.setupFee), sampleFee: n(v.sampleFee), toolingFee: n(v.toolingFee), artworkFee: n(v.artworkFee), shipping: n(v.shipping), currency: "USD" });
  const locked = existing && ["ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"].includes(existing.status);
  const submitted = existing && existing.status !== "DRAFT";
  const money = (k: keyof typeof v, label: string, optional = true) => (
    <Field id={k} label={label} optional={optional}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">$</span>
        <Input id={k} name={k} inputMode="decimal" className="tabular pl-7" value={v[k]} onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value.replace(/[^\d.]/g, "") }))} disabled={!!locked} />
      </div>
    </Field>
  );

  if (locked) return <p className="text-sm text-muted">This quote is {existing!.status.toLowerCase()} and can no longer be edited.</p>;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="rfqId" value={rfqId} />
      {files.map((f) => <input key={f.id} type="hidden" name="attachmentIds" value={f.id} />)}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="quantity" label="Quantity"><Input id="quantity" name="quantity" inputMode="numeric" className="tabular" value={v.quantity} onChange={(e) => setV((s) => ({ ...s, quantity: e.target.value.replace(/\D/g, "") }))} required /></Field>
        {money("unitPrice", "Unit price", false)}
        <Field id="productionDays" label="Production days"><Input id="productionDays" name="productionDays" inputMode="numeric" defaultValue={existing?.productionDays ?? ""} required /></Field>
        {money("setupFee", "Setup fee")}
        {money("sampleFee", "Sample fee")}
        {money("toolingFee", "Tooling / mould")}
        {money("artworkFee", "Artwork / digitising")}
        {money("shipping", "Shipping")}
        <Field id="moq" label="MOQ" optional><Input id="moq" name="moq" inputMode="numeric" defaultValue={existing?.moq ?? ""} /></Field>
        <Field id="deliveryEstimate" label="Delivery estimate" optional className="sm:col-span-2"><Input id="deliveryEstimate" name="deliveryEstimate" defaultValue={existing?.deliveryEstimate} placeholder="e.g. 5–7 business days by DHL after dispatch" /></Field>
        <Field id="validDays" label="Valid for (days)" optional><Input id="validDays" name="validDays" inputMode="numeric" defaultValue="30" /></Field>
      </div>
      <div className="rounded-2xl border border-line bg-surface-2/50 p-4">
        <table className="tabular w-full text-sm">
          <tbody>
            {totals.lines.map((l) => (
              <tr key={l.label}><td className="py-1 text-muted">{l.label}{l.quantity > 1 ? ` (${l.quantity.toLocaleString()} × ${formatMoney(l.unitMinor)})` : ""}</td><td className="py-1 text-right">{formatMoney(l.totalMinor)}</td></tr>
            ))}
            <tr className="border-t border-line font-semibold"><td className="pt-2">Total</td><td className="pt-2 text-right text-lg">{formatMoney(totals.totalMinor)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="samplePolicy" label="Sample policy" optional><Textarea id="samplePolicy" name="samplePolicy" rows={2} defaultValue={existing?.samplePolicy} /></Field>
        <Field id="paymentTerms" label="Payment terms" optional><Textarea id="paymentTerms" name="paymentTerms" rows={2} defaultValue={existing?.paymentTerms} placeholder="e.g. 50% deposit, 50% before shipping" /></Field>
        <Field id="revisionPolicy" label="Revision policy" optional><Textarea id="revisionPolicy" name="revisionPolicy" rows={2} defaultValue={existing?.revisionPolicy} /></Field>
      </div>
      <Field id="notes" label="Message to the buyer" optional>
        <Textarea id="notes" name="notes" rows={5} value={v.notes} onChange={(e) => setV((s) => ({ ...s, notes: e.target.value }))} maxLength={3000} />
      </Field>
      <div className="rounded-2xl border border-dashed border-electric/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-electric" /> Seller copilot</p>
          <Button type="button" size="sm" variant="secondary" loading={aiPending} onClick={() => startAi(async () => { const r = await copilotAction(rfqId, v.notes); if (r.ok) setCopilot(r.draft); })}>
            <Wand2 className="h-4 w-4" /> Draft response
          </Button>
        </div>
        {copilot && (
          <div className="mt-3 space-y-3 text-sm">
            {copilot.warnings.length > 0 && <ul className="space-y-1 rounded-xl bg-warning/10 p-3 text-fg">{copilot.warnings.map((w) => <li key={w}>⚠ {w}</li>)}</ul>}
            <ul className="list-disc space-y-1 pl-5 text-muted">{copilot.checklist.map((c) => <li key={c}>{c}</li>)}</ul>
            <div className="rounded-xl bg-surface p-3 whitespace-pre-line">{copilot.coverMessage}</div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setV((s) => ({ ...s, notes: copilot.coverMessage }))}>Use as message (edit the [placeholders])</Button>
            <p className="text-[11px] text-muted">The copilot never sets prices — every figure in your quote is yours.</p>
          </div>
        )}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Attachments <span className="font-normal text-muted">(optional — spec sheet, mockup)</span></p>
        <FileUploader purpose="QUOTE_ATTACHMENT" value={files} onChange={setFiles} compact />
      </div>
      {submitted && <Field id="revisionNote" label="What changed in this revision?" optional><Input id="revisionNote" name="revisionNote" maxLength={300} /></Field>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" name="intent" value="submit"><Send className="h-4 w-4" /> {submitted ? "Send revision" : "Send quote to buyer"}</Button>
        {!submitted && <Button type="submit" name="intent" value="draft" variant="secondary"><Save className="h-4 w-4" /> Save draft</Button>}
        {submitted && existing && (
          <Button type="button" variant="ghost" className="text-danger" loading={wdPending} onClick={() => window.confirm("Withdraw this quote?") && startWd(async () => { await withdrawQuoteAction(existing.id); })}>Withdraw quote</Button>
        )}
        <FormMessage state={state} />
      </div>
    </form>
  );
}
