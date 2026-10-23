import Link from "next/link";
import { CheckCheck, FileImage, MessagesSquare, Paperclip, Search, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState, Badge, Avatar } from "@/components/ui/primitives";
import { formatDateTime, formatDate, relativeTime, cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { patchTypeName, labelFor, BACKINGS } from "@/lib/catalog";
import { contactReleased, PRIVACY_LABEL } from "@/lib/rfq/disclosure";
import { PROJECT_STEPS } from "@/lib/domain/projects";
import { AutoRefresh } from "@/components/live/AutoRefresh";
import { Composer } from "./Composer";
import { MarkRead } from "./MarkRead";
import { ConversationTools } from "./ConversationTools";
import type { ActionState } from "@/lib/action-state";

const KIND_BADGE: Record<string, { label: string; tone: "blue" | "amber" | "green" | "neutral" | "red" }> = {
  QUOTE: { label: "Quotation", tone: "green" },
  PROOF: { label: "Artwork proof", tone: "blue" },
  PROOF_APPROVED: { label: "Proof approved", tone: "green" },
  PROOF_CHANGES: { label: "Proof changes requested", tone: "amber" },
  REVISION_REQUEST: { label: "Revision requested", tone: "amber" },
  CLARIFICATION_REQUEST: { label: "Clarification", tone: "blue" },
  CONTACT_SHARED: { label: "Contact details shared", tone: "green" },
};

/**
 * Three-pane inbox shared by buyer and seller portals: conversations · active chat · RFQ & quote
 * details. The caller passes the conversation filter that encodes authorization (buyer ownership,
 * or seller with an unlock). Refreshes every few seconds while open (near-real-time).
 */
export async function Inbox({ side, where, selectedId, rfqFilter, query, basePath, sendAction, markRead }: {
  side: "BUYER" | "SELLER";
  where: object;
  selectedId?: string;
  rfqFilter?: string;
  query?: string;
  basePath: string;
  sendAction: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  markRead: (conversationId: string) => Promise<void>;
}) {
  const q = query?.trim().slice(0, 80);
  const conversations = await prisma.conversation.findMany({
    where: {
      ...where,
      ...(rfqFilter ? { rfqId: rfqFilter } : {}),
      ...(q ? { OR: [{ rfq: { publicRef: { contains: q, mode: "insensitive" } } }, { seller: { tradingName: { contains: q, mode: "insensitive" } } }, { messages: { some: { body: { contains: q, mode: "insensitive" }, hiddenAt: null } } }] } : {}),
    },
    include: {
      rfq: { select: { id: true, publicRef: true, patchType: true, contactName: true, disclosureMode: true, isDemo: true, status: true, spec: { select: { quantity: true, width: true, height: true, unit: true, backing: true, destinationState: true, destinationCountry: true, requiredBy: true } }, project: true } },
      seller: { select: { id: true, legalName: true, tradingName: true, city: true, country: true, verificationStatus: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 100,
  });
  if (!conversations.length) {
    return q ? (
      <div className="space-y-4"><SearchBox basePath={basePath} q={q} /><EmptyState icon={Search} title="No conversations match" description="Try an RFQ reference such as PM-1042 or a manufacturer name." /></div>
    ) : (
      <EmptyState icon={MessagesSquare} title="No conversations yet" description={side === "BUYER" ? "Conversations open when a manufacturer takes your request." : "Conversations open after you unlock an RFQ."} />
    );
  }
  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const [messages, quote, unreadByConv] = await Promise.all([
    prisma.message.findMany({ where: { conversationId: selected.id, hiddenAt: null }, include: { attachments: true, sender: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 300 }),
    prisma.quote.findUnique({ where: { rfqId_sellerId: { rfqId: selected.rfqId, sellerId: selected.sellerId } } }),
    Promise.all(
      conversations.map(async (c) => {
        const readAt = side === "BUYER" ? c.buyerReadAt : c.sellerReadAt;
        const n = c.lastMessageAt && (!readAt || c.lastMessageAt > readAt) ? await prisma.message.count({ where: { conversationId: c.id, hiddenAt: null, side: { not: side }, ...(readAt ? { createdAt: { gt: readAt } } : {}) } }) : 0;
        return [c.id, n] as const;
      }),
    ).then((x) => new Map(x)),
  ]);
  const shared = contactReleased(selected.rfq.disclosureMode, !!selected.contactSharedAt);
  const otherName = (c: (typeof conversations)[number]) => (side === "BUYER" ? c.seller.tradingName ?? c.seller.legalName : contactReleased(c.rfq.disclosureMode, !!c.contactSharedAt) ? c.rfq.contactName : `${c.rfq.contactName.split(" ")[0]} · ${c.rfq.publicRef}`);
  const otherReadAt = side === "BUYER" ? selected.sellerReadAt : selected.buyerReadAt;
  const lastMine = [...messages].reverse().find((m) => m.side === side);
  const s = selected.rfq.spec;
  const detail = side === "BUYER" ? `/buyer/rfqs/${selected.rfqId}` : `/seller/opportunities/${selected.rfqId}`;
  const sel = `${basePath}?c=${selected.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="card grid min-h-[72vh] overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_300px] md:grid-cols-[280px_minmax(0,1fr)]">
      <AutoRefresh everyMs={6000} />
      {/* Conversations */}
      <aside className={cn("flex min-w-0 flex-col border-line md:border-r", selectedId && "hidden md:flex")}>
        <div className="border-b border-line p-3"><SearchBox basePath={basePath} q={q} /></div>
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {conversations.map((c) => {
            const last = c.messages[0];
            const unread = unreadByConv.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link href={`${basePath}?c=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("flex gap-3 px-4 py-3.5 hover:bg-surface-2/60", c.id === selected.id && "bg-electric/5")}>
                  <Avatar name={otherName(c)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-sm", unread ? "font-bold" : "font-medium")}>{otherName(c)}</p>
                      {last && <span className="shrink-0 text-[11px] text-muted">{relativeTime(last.createdAt)}</span>}
                    </div>
                    <p className="truncate text-xs text-muted">{c.rfq.publicRef} · {last ? (KIND_BADGE[last.kind]?.label ?? last.body) : "No messages yet"}</p>
                  </div>
                  {unread > 0 && <span className="tabular mt-1 grid h-5 min-w-5 place-items-center rounded-full bg-electric px-1 text-[10px] font-bold text-[var(--pm-primary-fg)]" aria-label={`${unread} unread`}>{unread}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Active conversation */}
      <section className={cn("flex min-w-0 flex-col", !selectedId && "hidden md:flex")} aria-label="Conversation">
        <MarkRead conversationId={selected.id} action={markRead} />
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <Link href={basePath} className="mr-2 text-sm text-electric md:hidden">←</Link>
            <span className="font-semibold">{otherName(selected)}</span>
            <span className="ml-2 text-xs text-muted">{selected.rfq.publicRef}</span>
            {selected.rfq.isDemo && <Badge tone="violet" className="ml-2">Simulated</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!shared && <Badge tone="blue"><ShieldCheck className="h-3 w-3" /> Contact details private</Badge>}
            <details className="lg:hidden"><summary className="cursor-pointer text-xs font-semibold text-electric">Request details</summary><div className="absolute right-4 z-20 mt-2 w-72 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-lift)]"><DetailsPanel /></div></details>
          </div>
        </header>
        <ol className="flex-1 space-y-3 overflow-y-auto px-5 py-5" aria-live="polite">
          {messages.length === 0 && <li className="text-center text-sm text-muted">Start the conversation — introduce yourself and confirm the key details.</li>}
          {messages.map((m) => {
            const mine = m.side === side;
            const system = m.side === "ADMIN" || m.side === "SYSTEM";
            const badge = KIND_BADGE[m.kind];
            return (
              <li key={m.id} className={cn("flex", system ? "justify-center" : mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[82%] rounded-2xl px-4 py-2.5 text-sm", system ? "border border-line bg-surface-2 text-muted" : mine ? "bg-electric text-[var(--pm-primary-fg)]" : "bg-surface-2")}>
                  {m.side === "ADMIN" && <p className="mb-1 text-[11px] font-semibold">PatchMatch team</p>}
                  {badge && <Badge tone={badge.tone} className="mb-1.5">{badge.label}</Badge>}
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  {m.attachments.map((a) => (
                    <a key={a.id} href={`/api/files/${a.id}`} className="mt-1.5 flex items-center gap-1 text-xs font-semibold underline">
                      {m.kind === "PROOF" ? <FileImage className="h-3.5 w-3.5" /> : <Paperclip className="h-3 w-3" />} {a.originalFilename}
                    </a>
                  ))}
                  <p className={cn("mt-1 text-[10px]", mine && !system ? "opacity-75" : "text-muted")}>
                    {formatDateTime(m.createdAt)}
                    {m.redacted && " · contact details hidden"}
                    {mine && lastMine?.id === m.id && otherReadAt && otherReadAt >= m.createdAt && <span className="ml-1 inline-flex items-center gap-0.5"><CheckCheck className="h-3 w-3" /> Seen</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        {selected.lockedAt ? (
          <p className="border-t border-line px-5 py-4 text-sm text-muted">This conversation was locked by moderation.</p>
        ) : (
          <>
            <ConversationTools side={side} conversationId={selected.id} rfqId={selected.rfqId} sellerId={selected.sellerId} privacy={selected.rfq.disclosureMode} contactShared={!!selected.contactSharedAt} reported={!!selected.reportedAt} hasProof={messages.some((m) => m.kind === "PROOF")} detailHref={detail} />
            <Composer conversationId={selected.id} action={sendAction} side={side} />
          </>
        )}
      </section>

      {/* RFQ + quotation summary */}
      <aside className="hidden min-w-0 border-l border-line p-5 lg:block"><DetailsPanel /></aside>
    </div>
  );

  function DetailsPanel() {
    const project = selected.rfq.project;
    return (
      <div className="space-y-5 text-sm">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Request</p>
          <p className="mt-1 font-semibold">{s ? `${s.quantity.toLocaleString()} × ${patchTypeName(selected.rfq.patchType)}` : patchTypeName(selected.rfq.patchType)}</p>
          {s && (
            <dl className="mt-2 space-y-1 text-muted">
              {s.width && s.height && <div>Size: {s.width}×{s.height} {s.unit.toLowerCase()}</div>}
              {s.backing && <div>Backing: {labelFor(BACKINGS, s.backing)}</div>}
              <div>Delivery: {[s.destinationState, s.destinationCountry].filter(Boolean).join(", ")}{s.requiredBy ? ` · by ${formatDate(s.requiredBy)}` : ""}</div>
            </dl>
          )}
          <p className="mt-2 text-xs text-muted">Privacy: {PRIVACY_LABEL[selected.rfq.disclosureMode]}</p>
          <Link href={detail} className="mt-2 inline-block text-xs font-semibold text-electric">Open full request →</Link>
        </div>
        <div className="border-t border-line pt-4">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Quotation</p>
          {quote && quote.status !== "DRAFT" ? (
            <div className="mt-1 space-y-1">
              <p className="tabular font-display text-xl font-bold">{formatMoney(quote.totalMinor)}</p>
              <p className="text-muted">{formatMoney(quote.unitPriceMinor)} / patch · {quote.productionDays} production days</p>
              <Badge tone={quote.status === "ACCEPTED" ? "green" : quote.status === "REJECTED" ? "red" : "blue"}>{quote.status.toLowerCase().replace(/_/g, " ")}</Badge>
              {quote.revisionNote && <p className="text-xs text-[#9A5B00]">Revision asked: {quote.revisionNote}</p>}
              <p className="text-[11px] text-muted">Estimates — final terms are agreed between buyer and manufacturer.</p>
            </div>
          ) : (
            <p className="mt-1 text-muted">{side === "SELLER" ? "No quote sent yet." : "No quotation yet."}</p>
          )}
          <Link href={detail} className="mt-2 inline-block text-xs font-semibold text-electric">{side === "SELLER" ? (quote && quote.status !== "DRAFT" ? "Revise quote →" : "Build quote →") : "Compare quotes →"}</Link>
        </div>
        {project && (
          <div className="border-t border-line pt-4">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Project</p>
            <p className="mt-1 font-semibold">{PROJECT_STEPS.find((p) => p.status === project.status)?.label ?? project.status}</p>
          </div>
        )}
        {side === "BUYER" && (
          <div className="border-t border-line pt-4 text-xs text-muted">
            Manufacturer in {[selected.seller.city, selected.seller.country].filter(Boolean).join(", ")} · {selected.seller.verificationStatus === "VERIFIED" ? "verified" : "verification pending"}
          </div>
        )}
      </div>
    );
  }
}

function SearchBox({ basePath, q }: { basePath: string; q?: string }) {
  return (
    <form action={basePath} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
      <label htmlFor="inbox-q" className="sr-only">Search conversations</label>
      <input id="inbox-q" name="q" defaultValue={q} placeholder="Search RFQ, name or message" className="h-10 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm focus:border-electric focus:outline-none" />
    </form>
  );
}
