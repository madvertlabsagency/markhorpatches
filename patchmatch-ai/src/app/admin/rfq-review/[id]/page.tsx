import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/services/storage";
import { PageHeader, Card, CardHeader, Badge, KeyValue, Alert } from "@/components/ui/primitives";
import { Timeline } from "@/components/ui/data";
import { ActionButton } from "@/components/ui/client";
import { ReviewForms } from "@/components/admin/ReviewForms";
import { patchTypeName, labelFor, INTENDED_USES, BACKINGS, BORDERS, countryName } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import { RFQ_STATUS_LABEL } from "@/lib/state-machines";
import { statusTone } from "@/lib/ui-status";
import { rerunQualificationAction } from "../../actions";

export const metadata: Metadata = { title: "Review RFQ" };

export default async function ReviewRfq({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin("rfq:review");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const rfq = await prisma.rfq.findUnique({
    where: { id },
    include: {
      spec: true, artwork: { include: { attachment: true } }, qualifications: { include: { signals: true }, orderBy: { createdAt: "desc" } }, statusHistory: { orderBy: { createdAt: "desc" } },
      consents: true, attribution: true, opportunity: true, disclosures: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!rfq) notFound();
  await audit(admin.id, "rfq.view_protected", "Rfq", rfq.id);
  const s = rfq.spec!;
  const q = rfq.qualifications[0];
  const ai = await prisma.aIExecution.findFirst({ where: { entityType: "Rfq", entityId: rfq.id, feature: "rfq_enrichment", status: "SUCCEEDED" }, orderBy: { createdAt: "desc" } });
  const aiOut = ai?.output as { suggestedTechniques?: { patchType: string; reason: string }[]; artworkConsiderations?: string; clarificationQuestions?: string[] } | null;
  const art = await Promise.all(rfq.artwork.map(async (a) => ({ id: a.attachmentId, name: a.attachment.originalFilename, preview: a.attachment.previewKey ? await storage().getDownloadUrl(a.attachment.previewKey, { inline: true }) : null, scan: a.attachment.scanStatus })));
  const decidable = rfq.status === "UNDER_REVIEW" || rfq.status === "CLARIFICATION_REQUIRED";
  return (
    <>
      <PageHeader eyebrow={rfq.publicRef} title={`${s.quantity.toLocaleString()} × ${patchTypeName(rfq.patchType)}`} description={`Submitted ${formatDateTime(rfq.submittedAt)}${rfq.duplicateOfId ? " · possible duplicate" : ""}`} actions={<><Badge tone={statusTone("rfq", rfq.status)}>{RFQ_STATUS_LABEL[rfq.status]}</Badge>{rfq.isDemo && <Badge tone="violet">demo</Badge>}<Link href={`/admin/matching/${rfq.id}`} className="text-sm font-semibold text-electric">Matching →</Link></>} />
      {!rfq.emailVerifiedAt && <Alert tone="warning" className="mb-4" title="Email not verified">This RFQ cannot be qualified or sold until the buyer confirms their email.</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {q && (
            <Card>
              <CardHeader title={`Qualification · Tier ${q.tier}`} description={`${q.source.toLowerCase()} decision · rules ${q.rulesVersion} · ${formatDateTime(q.createdAt)}`} action={decidable && <ActionButton action={rerunQualificationAction.bind(null, rfq.id)}>Re-run rules</ActionButton>} />
              <div className="grid gap-4 p-5 sm:grid-cols-4">
                {[["Completeness", q.completenessScore], ["Intent", q.intentScore], ["Risk", q.fraudScore], ["Overall", q.score]].map(([k, v]) => (
                  <div key={k as string}><p className="text-xs text-muted">{k}</p><p className="tabular font-display text-2xl font-semibold">{v}</p><div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className={k === "Risk" ? "h-full rounded-full bg-danger" : "h-full rounded-full bg-chart"} style={{ width: `${v}%` }} /></div></div>
                ))}
              </div>
              <div className="border-t border-line p-5">
                <p className="mb-2 text-xs font-semibold text-muted uppercase">Signals</p>
                <div className="flex flex-wrap gap-1.5">{q.signals.map((sg) => <Badge key={sg.id} tone={sg.category === "fraud" ? "red" : sg.category === "intent" ? "blue" : "neutral"}>{sg.code.toLowerCase().replace(/_/g, " ")} {sg.category === "fraud" ? "+" : ""}{sg.weight}{sg.detail ? ` · ${sg.detail}` : ""}</Badge>)}</div>
                {Array.isArray(q.reasons) && <ul className="mt-3 list-disc pl-5 text-sm text-muted">{(q.reasons as string[]).map((r) => <li key={r}>{r}</li>)}</ul>}
                {q.missingFields.length > 0 && <p className="mt-2 text-sm text-muted">Missing: {q.missingFields.join(", ")}</p>}
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="Buyer (protected)" description="Visible to authorised staff only. Viewing is audit-logged." />
            <div className="p-5"><KeyValue cols={3} items={[
              { label: "Name", value: rfq.contactName }, { label: "Company", value: rfq.contactCompany ?? "—" }, { label: "Email", value: rfq.contactEmail },
              { label: "Phone", value: rfq.contactPhone ?? "—" }, { label: "Website", value: rfq.contactWebsite ?? "—" }, { label: "Disclosure", value: rfq.disclosureMode === "FULL_CONTACT" ? "Share contact" : "Messaging only" },
              { label: "Max recipients", value: rfq.maxRecipients }, { label: "Submit IP", value: rfq.submitIp ?? "—" }, { label: "Source", value: rfq.attribution ? [rfq.attribution.utmSource, rfq.attribution.utmCampaign].filter(Boolean).join(" / ") || "—" : "Direct" },
            ]} /></div>
          </Card>
          <Card>
            <CardHeader title="Specification" />
            <div className="p-5">
              {s.aiSummary && <p className="mb-4 rounded-xl bg-electric/5 px-4 py-3 text-sm"><b>Summary:</b> {s.aiSummary}</p>}
              <KeyValue cols={3} items={[
                { label: "Use", value: labelFor(INTENDED_USES, rfq.intendedUse) }, { label: "Size", value: s.width && s.height ? `${s.width}×${s.height} ${s.unit.toLowerCase()}` : "—" }, { label: "Backing", value: labelFor(BACKINGS, s.backing) },
                { label: "Border", value: labelFor(BORDERS, s.borderType) }, { label: "Colours", value: s.colorCount ?? "—" }, { label: "Finishes", value: s.specialFinishing.join(", ") || "—" },
                { label: "Destination", value: [s.destinationState, countryName(s.destinationCountry), s.destinationPostal].filter(Boolean).join(", ") }, { label: "Needed by", value: formatDate(s.requiredBy) }, { label: "Budget", value: s.budgetUndisclosed ? "Undisclosed" : [s.budgetTotalMinor && formatMoney(s.budgetTotalMinor), s.targetUnitMinor && `${formatMoney(s.targetUnitMinor)}/pc`].filter(Boolean).join(" · ") || "—" },
              ]} />
              {s.artworkNotes && <p className="mt-4 text-sm"><b>Artwork notes:</b> {s.artworkNotes}</p>}
              {s.notes && <p className="mt-2 text-sm whitespace-pre-line"><b>Notes:</b> {s.notes}</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Artwork" />
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              {art.length === 0 && <p className="text-sm text-muted">None.</p>}
              {art.map((a) => <a key={a.id} href={`/api/files/${a.id}`} className="overflow-hidden rounded-xl border border-line">{a.preview ? <img src={a.preview} alt="" className="aspect-square w-full bg-surface-2 object-contain" /> : <div className="grid aspect-square place-items-center bg-surface-2 text-xs text-muted">{a.name.split(".").pop()?.toUpperCase()}</div>}<p className="truncate px-2 py-1 text-xs">{a.name}</p></a>)}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          {decidable && rfq.emailVerifiedAt && <ReviewForms rfqId={rfq.id} suggestedTier={q?.tier === "A" || q?.tier === "B" ? q.tier : "B"} suggestedPricing={q?.pricingTier ?? "STANDARD"} questions={[...(Array.isArray(q?.clarificationQuestions) ? (q!.clarificationQuestions as string[]) : []), ...(aiOut?.clarificationQuestions ?? [])]} />}
          {aiOut && (
            <Card>
              <CardHeader title="AI enrichment" description={`${ai!.provider} · ${ai!.model} · ${ai!.promptVersion} — advisory only`} />
              <div className="space-y-2 p-5 text-sm">
                {aiOut.suggestedTechniques?.map((t) => <p key={t.patchType}><b>{patchTypeName(t.patchType)}:</b> {t.reason}</p>)}
                {aiOut.artworkConsiderations && <p className="text-muted">{aiOut.artworkConsiderations}</p>}
              </div>
            </Card>
          )}
          <Card><CardHeader title="Consents" /><ul className="divide-y divide-line text-sm">{rfq.consents.map((c) => <li key={c.id} className="flex justify-between px-5 py-2"><span>{c.kind.toLowerCase().replace("_", " ")}</span><Badge tone={c.granted ? "green" : "neutral"}>{c.granted ? "granted" : "declined"} · {c.textVersion}</Badge></li>)}</ul></Card>
          <Card><CardHeader title="Disclosures" /><ul className="divide-y divide-line text-sm">{rfq.disclosures.length === 0 && <li className="px-5 py-3 text-muted">None yet.</li>}{rfq.disclosures.map((d) => <li key={d.id} className="px-5 py-2"><p>{d.reason} · {d.fields.join(", ")}</p><p className="text-xs text-muted">{formatDateTime(d.createdAt)}</p></li>)}</ul></Card>
          <Card><CardHeader title="History" /><div className="p-5"><Timeline items={rfq.statusHistory.map((e, i) => ({ title: RFQ_STATUS_LABEL[e.to], time: formatDateTime(e.createdAt), body: e.note ?? undefined, tone: i === 0 ? "active" : "done" }))} /></div></Card>
          {rfq.qualifications.length > 1 && <Card><CardHeader title="Qualification history" /><ul className="divide-y divide-line text-sm">{rfq.qualifications.map((x) => <li key={x.id} className="flex justify-between px-5 py-2"><span>Tier {x.tier} · {x.source.toLowerCase()}</span><span className="text-xs text-muted">{formatDateTime(x.createdAt)}</span></li>)}</ul></Card>}
        </div>
      </div>
    </>
  );
}
