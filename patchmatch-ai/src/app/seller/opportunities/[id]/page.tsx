import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Download, FileText, Globe, Lock, Mail, MessagesSquare, Phone, Receipt, ShieldAlert, User } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { sellerRfqView } from "@/lib/domain/access";
import { Alert, Badge, Card, CardHeader, KeyValue, PageHeader } from "@/components/ui/primitives";
import { UnlockPanel } from "@/components/seller/UnlockPanel";
import { QuoteBuilder } from "@/components/seller/QuoteBuilder";
import { PreviewTracker } from "@/components/seller/PreviewTracker";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { patchTypeName, labelFor, INTENDED_USES, BACKINGS, BORDERS, countryName } from "@/lib/catalog";
import { statusTone } from "@/lib/ui-status";
import { cardCheckoutAvailable } from "@/lib/services/payments";
import { featureEnabled } from "@/lib/domain/rfq";
import type { FactorScore } from "@/lib/matching/engine";
import { marketplaceSettings } from "@/lib/settings";
import { BuyerReadiness, QualityPolicyNote } from "@/components/seller/BuyerReadiness";
import { ProjectTracker } from "@/components/rfq/ProjectTracker";

export const metadata: Metadata = { title: "Opportunity" };

export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { seller, org, role } = await requireSeller(`/seller/opportunities/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const result = await sellerRfqView(seller.id, id);
  if (!result) notFound();
  const { view, access } = result;
  const s = view.spec;
  const [readiness, project, settings] = await Promise.all([
    prisma.rfq.findUniqueOrThrow({ where: { id }, select: { emailVerifiedAt: true, phoneVerifiedAt: true, intentStatus: true, intentConfirmedAt: true, buyingStage: true, artworkHelpRequested: true, disclosureMode: true, isDemo: true, _count: { select: { artwork: true } } } }),
    prisma.project.findUnique({ where: { rfqId: id }, include: { events: { orderBy: { createdAt: "asc" } } } }),
    marketplaceSettings(),
  ]);
  const [wallet, qual, quote, conversation] = await Promise.all([
    prisma.wallet.findUnique({ where: { orgId: org.id } }),
    prisma.rfqQualification.findFirst({ where: { rfqId: id, isCurrent: true }, select: { tier: true, missingFields: true, clarificationQuestions: true } }),
    prisma.quote.findUnique({ where: { rfqId_sellerId: { rfqId: id, sellerId: seller.id } }, include: { attachments: true } }),
    prisma.conversation.findUnique({ where: { rfqId_sellerId: { rfqId: id, sellerId: seller.id } } }),
  ]);
  const opp = access.opportunity!;
  const match = access.match;
  const breakdown = (match?.breakdown ?? null) as Record<string, FactorScore> | null;
  const cardEnabled = cardCheckoutAvailable() && (await featureEnabled("card_payments") || process.env.PAYMENTS_PROVIDER === "sandbox");
  const canBuy = role === "OWNER" || role === "ADMIN";

  return (
    <div className="space-y-6">
      <PreviewTracker rfqId={id} />
      <PageHeader
        eyebrow={`RFQ ${view.publicRef}`}
        title={`${s.quantity.toLocaleString()} × ${patchTypeName(view.patchType)} patches`}
        description={`${labelFor(INTENDED_USES, view.intendedUse)} · posted ${formatDate(view.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {qual?.tier && <Badge tone={statusTone("tier", qual.tier)}>Tier {qual.tier}</Badge>}
            <Badge tone={statusTone("opp", opp.status)}>{opp.status.replace("_", " ").toLowerCase()}</Badge>
            {view.locked ? <Badge tone="dark"><Lock className="h-3 w-3" /> Locked</Badge> : <Badge tone="green">Unlocked</Badge>}
          </div>
        }
      />
      <BuyerReadiness r={readiness} pricingTier={opp.pricingTier} mode={opp.distributionMode} slots={opp.maxUnlocks - opp.unlockCount} max={opp.maxUnlocks} />
      {view.locked && <QualityPolicyNote claimWindowDays={settings.claimWindowDays} />}
      {!view.locked && project && project.sellerId === seller.id && <ProjectTracker project={{ ...project, rfqId: id }} audience="seller" />}
      {sp.payment === "cancelled" && <Alert tone="warning" title="Payment cancelled">You were not charged and the RFQ remains locked. Your reservation will be released shortly.</Alert>}
      {sp.payment === "failed" && <Alert tone="error" title="Payment failed">Your payment did not go through. The RFQ remains locked and you were not charged.</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {!view.locked && view.contact && (
            <Card className="border-success/40">
              <CardHeader title="Buyer details" description={view.contact.messagingOnly ? "This buyer chose PatchMatch messaging only — email and phone are not shared." : "Released under the buyer's consent. Use only to respond to this request."} action={conversation && <Link href={`/seller/messages?c=${conversation.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-electric"><MessagesSquare className="h-4 w-4" /> Message buyer</Link>} />
              <div className="p-5">
                <KeyValue items={[
                  { label: "Name", value: <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted" />{view.contact.name}</span> },
                  { label: "Company", value: view.contact.company ?? "—" },
                  { label: "Email", value: view.contact.email ? <a href={`mailto:${view.contact.email}`} className="flex items-center gap-1.5 text-electric"><Mail className="h-3.5 w-3.5" />{view.contact.email}</a> : "Hidden (messaging only)" },
                  { label: "Phone", value: view.contact.phone ? <a href={`tel:${view.contact.phone}`} className="flex items-center gap-1.5 text-electric"><Phone className="h-3.5 w-3.5" />{view.contact.phone}</a> : view.contact.messagingOnly ? "Hidden (messaging only)" : "—" },
                  { label: "Website", value: view.contact.website ? <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted" />{view.contact.website}</span> : "—" },
                  { label: "Preferred contact", value: view.contact.preferredContact.toLowerCase() },
                ]} />
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="Specifications" description={view.locked ? "Anonymised — buyer identity, postal code and contact details are hidden until unlock." : undefined} />
            <div className="p-5">
              {s.aiSummary && <p className="mb-5 rounded-xl bg-electric/5 px-4 py-3 text-sm"><span className="font-semibold">Summary: </span>{s.aiSummary}</p>}
              <KeyValue cols={3} items={[
                { label: "Size", value: s.width && s.height ? `${s.width} × ${s.height} ${s.unit.toLowerCase()}` : "Not specified" },
                { label: "Shape", value: s.shape ?? "—" },
                { label: "Quantity", value: `${s.quantity.toLocaleString()}${s.minQuantity ? ` (min ${s.minQuantity.toLocaleString()})` : ""}` },
                { label: "Backing", value: labelFor(BACKINGS, s.backing) + (s.backingOther ? ` (${s.backingOther})` : "") },
                { label: "Border", value: labelFor(BORDERS, s.borderType) },
                { label: "Colours", value: s.colorCount ?? "—" },
                { label: "Material", value: s.material ?? "—" },
                { label: "Finishes", value: s.specialFinishing.join(", ") || "—" },
                { label: "Repeat orders", value: s.repeatPotential ? "Likely" : "Not indicated" },
                { label: "Ships to", value: [s.destinationState, countryName(s.destinationCountry), s.destinationPostal].filter(Boolean).join(", ") },
                { label: "Needed by", value: s.requiredBy ? formatDate(s.requiredBy) : "Flexible" },
                { label: "Rush / sample", value: [s.rush && "Rush", s.sampleBeforeProduction && "Sample first", s.sampleRequired && "Physical sample"].filter(Boolean).join(" · ") || "—" },
                { label: "Budget", value: s.budgetUndisclosed ? "Undisclosed" : [s.budgetTotalMinor && formatMoney(s.budgetTotalMinor), s.targetUnitMinor && `${formatMoney(s.targetUnitMinor)}/pc`, s.budgetFlexibility?.toLowerCase().replace("_", " ")].filter(Boolean).join(" · ") || "—" },
              ]} />
              {(s.notes || s.artworkNotes) && (
                <div className="mt-5 space-y-3 text-sm">
                  {s.artworkNotes && <p><span className="font-semibold">Artwork notes: </span><span className="whitespace-pre-line text-muted">{s.artworkNotes}</span></p>}
                  {s.notes && <p><span className="font-semibold">Notes: </span><span className="whitespace-pre-line text-muted">{s.notes}</span></p>}
                </div>
              )}
              {qual?.missingFields?.length ? <p className="mt-4 text-xs text-muted">Missing details flagged by review: {qual.missingFields.join(", ")}</p> : null}
            </div>
          </Card>
          <Card>
            <CardHeader title="Artwork" description={view.locked ? "Blurred preview — originals are released after unlock." : "Original files — keep confidential."} />
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              {view.artwork.length === 0 && <p className="col-span-full text-sm text-muted">No artwork uploaded by the buyer.</p>}
              {view.artwork.map((a) => (
                <div key={a.id} className="overflow-hidden rounded-xl border border-line">
                  {a.url ? (
                     
                    <img src={a.url} alt={view.locked ? "Blurred artwork preview" : a.name} className="aspect-square w-full bg-surface-2 object-contain" />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-surface-2"><FileText className="h-8 w-8 text-muted" /></div>
                  )}
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                    <span className="truncate text-muted">{view.locked ? `${a.type} file` : a.name}</span>
                    {a.downloadUrl && <a href={a.downloadUrl} className="text-electric" aria-label={`Download ${a.name}`}><Download className="h-3.5 w-3.5" /></a>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          {!view.locked && (
            <Card id="quote">
              <CardHeader title={quote && quote.status !== "DRAFT" ? `Your quotation (v${quote.version} · ${quote.status.toLowerCase().replace("_", " ")})` : "Build your quotation"} description="Itemise every fee. The buyer compares quotes side by side." />
              <div className="p-5">
                <QuoteBuilder rfqId={id} defaultQuantity={s.quantity} existing={quote ? { id: quote.id, status: quote.status, quantity: quote.quantity, unitPrice: quote.unitPriceMinor / 100, setupFee: quote.setupFeeMinor / 100, sampleFee: quote.sampleFeeMinor / 100, toolingFee: quote.toolingFeeMinor / 100, artworkFee: quote.artworkFeeMinor / 100, shipping: quote.shippingMinor / 100, productionDays: quote.productionDays, deliveryEstimate: quote.deliveryEstimate ?? "", moq: quote.moq ?? undefined, samplePolicy: quote.samplePolicy ?? "", paymentTerms: quote.paymentTerms ?? "", revisionPolicy: quote.revisionPolicy ?? "", includedBacking: quote.includedBacking ?? "", inclusions: quote.inclusions ?? "", exclusions: quote.exclusions ?? "", notes: quote.notes ?? "" } : null} />
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {view.locked ? (
            <UnlockPanel
              rfqId={id}
              priceMinor={opp.priceMinor}
              currency={opp.currency}
              balanceMinor={wallet?.balanceMinor ?? 0}
              purchasable={access.purchasable}
              unavailableReason={opp.status === "SOLD_OUT" ? "This RFQ has already been purchased." : opp.status !== "AVAILABLE" ? "This opportunity is not currently available." : seller.availability !== "ACTIVE" ? "Your account is paused. Resume it in Settings." : null}
              cardEnabled={cardEnabled}
              canBuy={canBuy}
              messagingOnly={view.contact === null && false}
              mode={opp.distributionMode}
              maxUnlocks={opp.maxUnlocks}
            />
          ) : (
            <Card className="p-5">
              <p className="flex items-center gap-2 font-semibold"><BadgeCheck className="h-5 w-5 text-success" /> You have access</p>
              {access.unlock && (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-muted">Unlocked {formatDate(access.unlock.createdAt)} · {formatMoney(access.unlock.priceMinor, access.unlock.currency)} · {access.unlock.method.toLowerCase()}</p>
                  <Link href={`/seller/transactions/${access.unlock.id}`} className="flex items-center gap-1.5 font-semibold text-electric"><Receipt className="h-4 w-4" /> Receipt {access.unlock.receiptNumber}</Link>
                  <Link href={`/seller/quality-claims?unlock=${access.unlock.id}`} className="flex items-center gap-1.5 font-semibold text-electric"><ShieldAlert className="h-4 w-4" /> Report a quality problem</Link>
                </div>
              )}
            </Card>
          )}
          {match && (
            <Card>
              <CardHeader title={`Match score ${match.score}`} description="Why this RFQ was matched to you." />
              <div className="space-y-3 p-5">
                {match.explanation && <p className="text-sm text-muted">{match.explanation}</p>}
                {breakdown && Object.entries(breakdown).map(([k, f]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs"><span className="font-medium capitalize">{k}</span><span className="tabular text-muted">{f.points} / {f.weight}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-electric" style={{ width: `${Math.round(f.value * 100)}%` }} /></div>
                    <p className="mt-0.5 text-[11px] text-muted">{f.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
