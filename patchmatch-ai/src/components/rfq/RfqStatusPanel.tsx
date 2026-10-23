import Link from "next/link";
import { BadgeCheck, FileText, Lock, MessageSquare, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/services/storage";
import { Badge, Card, CardHeader, KeyValue, Alert } from "@/components/ui/primitives";
import { Timeline } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import { patchTypeName, labelFor, INTENDED_USES, BACKINGS, BORDERS, countryName } from "@/lib/catalog";
import { RFQ_STATUS_LABEL } from "@/lib/state-machines";
import { buyerStatusMessage } from "@/lib/domain/rfq";
import { statusTone } from "@/lib/ui-status";
import { MatchingProgress } from "./MatchingProgress";
import { QuoteActions } from "./QuoteActions";
import { cn } from "@/lib/utils";

/** Buyer-facing view of an RFQ. Callers MUST have verified ownership (account or guest token). */
export async function RfqStatusPanel({ rfqId, audience }: { rfqId: string; audience: "buyer" | "guest" }) {
  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: rfqId },
    include: {
      spec: true,
      artwork: { include: { attachment: true }, orderBy: { sortOrder: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      qualifications: { where: { isCurrent: true } },
      quotes: { where: { status: { not: "DRAFT" } }, include: { seller: true, lineItems: { orderBy: { sortOrder: "asc" } } }, orderBy: { totalMinor: "asc" } },
      conversations: { select: { id: true, sellerId: true } },
      opportunity: true,
    },
  });
  const s = rfq.spec!;
  const eligible = await prisma.rfqMatch.count({ where: { rfqId, eligible: true } });
  const notified = await prisma.rfqMatch.count({ where: { rfqId, status: "NOTIFIED" } });
  const unlocks = await prisma.rfqUnlock.count({ where: { rfqId, status: "ACTIVE" } });
  const artwork = await Promise.all(
    rfq.artwork.filter((a) => a.attachment.status === "READY").map(async (a) => ({ id: a.attachmentId, name: a.attachment.originalFilename, preview: a.attachment.previewKey ? await storage().getDownloadUrl(a.attachment.previewKey, { inline: true, expiresIn: 900 }) : null })),
  );
  const q = rfq.qualifications[0];
  const questions = rfq.status === "CLARIFICATION_REQUIRED" && Array.isArray(q?.clarificationQuestions) ? (q!.clarificationQuestions as string[]) : [];
  const convBySeller = new Map(rfq.conversations.map((c) => [c.sellerId, c.id]));
  const selectable = audience === "buyer" && !["SELLER_SELECTED", "CLOSED", "CANCELLED", "EXPIRED"].includes(rfq.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Request {rfq.publicRef}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {s.quantity.toLocaleString()} × {patchTypeName(rfq.patchType)} patches
          </h1>
          <p className="mt-1 text-sm text-muted">Submitted {formatDateTime(rfq.submittedAt ?? rfq.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {rfq.isDemo && <Badge tone="violet">Fictional demo</Badge>}
          <Badge tone={statusTone("rfq", rfq.status)} dot>
            {RFQ_STATUS_LABEL[rfq.status]}
          </Badge>
        </div>
      </div>

      <MatchingProgress status={rfq.status} message={buyerStatusMessage(rfq.status)} eligible={eligible} notified={notified} unlocks={unlocks} quotes={rfq.quotes.length} />

      {questions.length > 0 && (
        <Alert tone="warning" title="Manufacturers need a few more details">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {questions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          {audience === "guest" && <p className="mt-2">Create an account (or sign in) with your request email to answer.</p>}
        </Alert>
      )}

      {/* Quotes */}
      <Card id="quotes">
        <CardHeader title={`Quotations (${rfq.quotes.length})`} description="Itemised quotes from manufacturers, lowest total first. Agreements are made directly with the manufacturer." />
        {rfq.quotes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No quotes yet. You'll be notified when a manufacturer sends one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Quote comparison</caption>
              <thead className="border-b border-line text-left text-xs text-muted uppercase">
                <tr>
                  <th className="px-5 py-3">Manufacturer</th>
                  <th className="px-3 py-3 text-right">Unit</th>
                  <th className="px-3 py-3 text-right">Fees</th>
                  <th className="px-3 py-3 text-right">Shipping</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3">Production</th>
                  <th className="px-3 py-3">MOQ / sample</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-line align-top">
                {rfq.quotes.map((qt, i) => {
                  const fees = qt.setupFeeMinor + qt.sampleFeeMinor + qt.toolingFeeMinor + qt.artworkFeeMinor;
                  return (
                    <tr key={qt.id} className={cn(qt.status === "ACCEPTED" && "bg-success/5")}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold">{qt.seller.tradingName ?? qt.seller.legalName}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <BadgeCheck className="h-3.5 w-3.5 text-success" /> Verified · {countryName(qt.seller.country)}
                        </p>
                        {i === 0 && rfq.quotes.length > 1 && <Badge tone="green" className="mt-1">Lowest total</Badge>}
                        {qt.shortlisted && <Badge tone="blue" className="mt-1 ml-1">Shortlisted</Badge>}
                      </td>
                      <td className="px-3 py-3.5 text-right">{formatMoney(qt.unitPriceMinor, qt.currency)}</td>
                      <td className="px-3 py-3.5 text-right">{formatMoney(fees, qt.currency)}</td>
                      <td className="px-3 py-3.5 text-right">{formatMoney(qt.shippingMinor, qt.currency)}</td>
                      <td className="px-3 py-3.5 text-right font-semibold">{formatMoney(qt.totalMinor, qt.currency)}</td>
                      <td className="px-3 py-3.5">
                        {qt.productionDays} days
                        {qt.deliveryEstimate && <span className="block text-xs text-muted">{qt.deliveryEstimate}</span>}
                      </td>
                      <td className="px-3 py-3.5 text-xs">
                        {qt.moq ? `MOQ ${qt.moq.toLocaleString()}` : "—"}
                        <span className="block text-muted">{qt.samplePolicy ?? "Sample policy not stated"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={statusTone("quote", qt.status)}>{qt.status.replace(/_/g, " ").toLowerCase()}</Badge>
                        {qt.version > 1 && <span className="ml-1 text-xs text-muted">v{qt.version}</span>}
                        {audience === "buyer" && (
                          <QuoteActions rfqId={rfq.id} quoteId={qt.id} status={qt.status} shortlisted={qt.shortlisted} selectable={selectable} conversationId={convBySeller.get(qt.sellerId) ?? null} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {rfq.quotes.some((x) => x.notes || x.paymentTerms) && (
          <div className="grid gap-3 border-t border-line p-5 md:grid-cols-2">
            {rfq.quotes.map((qt) => (
              <div key={qt.id} className="rounded-xl bg-surface-2/60 p-3 text-sm">
                <p className="font-semibold">{qt.seller.tradingName ?? qt.seller.legalName}</p>
                {qt.paymentTerms && <p className="mt-1 text-muted"><span className="font-medium text-fg">Payment terms:</span> {qt.paymentTerms}</p>}
                {qt.revisionPolicy && <p className="mt-1 text-muted"><span className="font-medium text-fg">Revisions:</span> {qt.revisionPolicy}</p>}
                {qt.notes && <p className="mt-1 whitespace-pre-line text-muted">{qt.notes}</p>}
                {qt.validUntil && <p className="mt-1 text-xs text-muted">Valid until {formatDate(qt.validUntil)}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Specifications" />
          <div className="p-5">
            <KeyValue
              items={[
                { label: "Patch type", value: patchTypeName(rfq.patchType) },
                { label: "Use", value: labelFor(INTENDED_USES, rfq.intendedUse) },
                { label: "Size", value: s.width && s.height ? `${s.width} × ${s.height} ${s.unit.toLowerCase()}${s.shape ? ` · ${s.shape}` : ""}` : "Not specified" },
                { label: "Quantity", value: `${s.quantity.toLocaleString()}${s.minQuantity ? ` (min ${s.minQuantity.toLocaleString()})` : ""}` },
                { label: "Backing", value: labelFor(BACKINGS, s.backing) },
                { label: "Border", value: labelFor(BORDERS, s.borderType) },
                { label: "Colours", value: s.colorCount ?? "—" },
                { label: "Finishes", value: s.specialFinishing.join(", ") || "—" },
                { label: "Destination", value: [s.destinationState, countryName(s.destinationCountry), s.destinationPostal].filter(Boolean).join(", ") },
                { label: "Needed by", value: s.requiredBy ? formatDate(s.requiredBy) : "Flexible" },
                { label: "Budget", value: s.budgetUndisclosed ? "Not disclosed" : [s.budgetTotalMinor && formatMoney(s.budgetTotalMinor), s.targetUnitMinor && `${formatMoney(s.targetUnitMinor)}/patch`].filter(Boolean).join(" · ") || "—" },
                { label: "Contact sharing", value: rfq.disclosureMode === "FULL_CONTACT" ? "Share contact details with approved manufacturer" : "PatchMatch messaging only" },
              ]}
            />
            {s.notes && (
              <div className="mt-5 rounded-xl bg-surface-2/60 p-3 text-sm">
                <p className="text-xs font-semibold text-muted uppercase">Notes</p>
                <p className="mt-1 whitespace-pre-line">{s.notes}</p>
              </div>
            )}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Artwork" description="Private — never public." />
            <div className="grid grid-cols-2 gap-3 p-5">
              {artwork.length === 0 && <p className="col-span-2 text-sm text-muted">No artwork uploaded.</p>}
              {artwork.map((a) => (
                <a key={a.id} href={`/api/files/${a.id}`} className="group block overflow-hidden rounded-xl border border-line">
                  {a.preview ? (
                     
                    <img src={a.preview} alt={a.name} className="aspect-square w-full bg-surface-2 object-contain" />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-surface-2">
                      <FileText className="h-8 w-8 text-muted" />
                    </div>
                  )}
                  <p className="truncate px-2 py-1.5 text-xs text-muted group-hover:text-electric">{a.name}</p>
                </a>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Activity" />
            <div className="p-5">
              <Timeline
                items={rfq.statusHistory
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((e, i) => ({ title: RFQ_STATUS_LABEL[e.to], time: formatDateTime(e.createdAt), body: e.note && audience === "buyer" ? sanitizeNote(e.note) : undefined, tone: i === 0 ? ("active" as const) : ("done" as const) }))}
              />
            </div>
          </Card>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Lock className="h-3.5 w-3.5" /> Manufacturers saw only an anonymised summary before purchasing access. <ShieldCheck className="ml-2 h-3.5 w-3.5" /> Every disclosure is logged.
      </p>
      {audience === "buyer" && rfq.conversations.length > 0 && (
        <Link href={`/buyer/messages?rfq=${rfq.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-electric">
          <MessageSquare className="h-4 w-4" /> Open conversations ({rfq.conversations.length})
        </Link>
      )}
    </div>
  );
}

/** Internal status notes can mention reviewer reasoning; only show buyer-safe ones. */
function sanitizeNote(note: string) {
  if (/^(Rejected|Auto-qualified|Tier)/.test(note)) return undefined;
  return note.length > 160 ? `${note.slice(0, 160)}…` : note;
}
