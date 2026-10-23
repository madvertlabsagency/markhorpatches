import Link from "next/link";
import { MessagesSquare, Paperclip, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState, Badge, Avatar } from "@/components/ui/primitives";
import { formatDateTime, relativeTime, cn } from "@/lib/utils";
import { Composer } from "./Composer";
import { MarkRead } from "./MarkRead";
import type { ActionState } from "@/lib/action-state";

/**
 * Two-pane inbox shared by buyer and seller portals. The caller passes the conversation filter
 * that encodes authorization (buyer org, or seller with unlock).
 */
export async function Inbox({ side, where, selectedId, rfqFilter, basePath, sendAction, markRead }: {
  side: "BUYER" | "SELLER";
  where: object;
  selectedId?: string;
  rfqFilter?: string;
  basePath: string;
  sendAction: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  markRead: (conversationId: string) => Promise<void>;
}) {
  const conversations = await prisma.conversation.findMany({
    where: { ...where, ...(rfqFilter ? { rfqId: rfqFilter } : {}) },
    include: { rfq: { select: { publicRef: true, patchType: true, contactName: true, disclosureMode: true, isDemo: true } }, seller: { select: { legalName: true, tradingName: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 100,
  });
  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const messages = selected
    ? await prisma.message.findMany({ where: { conversationId: selected.id, hiddenAt: null }, include: { attachments: true, sender: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 300 })
    : [];
  const otherName = (c: (typeof conversations)[number]) => (side === "BUYER" ? c.seller.tradingName ?? c.seller.legalName : c.rfq.disclosureMode === "FULL_CONTACT" ? c.rfq.contactName : `Buyer · ${c.rfq.publicRef}`);
  if (!conversations.length) return <EmptyState icon={MessagesSquare} title="No conversations yet" description={side === "BUYER" ? "Conversations open when a manufacturer is approved to contact you." : "Conversations open after you unlock an RFQ."} />;
  const readAt = selected ? (side === "BUYER" ? selected.buyerReadAt : selected.sellerReadAt) : null;
  return (
    <div className="card grid min-h-[70vh] overflow-hidden md:grid-cols-[300px_1fr]">
      <ul className={cn("divide-y divide-line overflow-y-auto border-line md:border-r", selectedId && "hidden md:block")}>
        {conversations.map((c) => {
          const last = c.messages[0];
          const unread = last && last.side !== side && (!(side === "BUYER" ? c.buyerReadAt : c.sellerReadAt) || last.createdAt > (side === "BUYER" ? c.buyerReadAt! : c.sellerReadAt!));
          return (
            <li key={c.id}>
              <Link href={`${basePath}?c=${c.id}`} className={cn("flex gap-3 px-4 py-3.5 hover:bg-surface-2/60", c.id === selected?.id && "bg-electric/5")}>
                <Avatar name={otherName(c)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", unread ? "font-bold" : "font-medium")}>{otherName(c)}</p>
                    {last && <span className="shrink-0 text-[11px] text-muted">{relativeTime(last.createdAt)}</span>}
                  </div>
                  <p className="truncate text-xs text-muted">{c.rfq.publicRef} · {last?.body ?? "No messages yet"}</p>
                </div>
                {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-electric" aria-label="Unread" />}
              </Link>
            </li>
          );
        })}
      </ul>
      {selected && (
        <section className={cn("flex min-w-0 flex-col", !selectedId && "hidden md:flex")} aria-label="Conversation">
          <MarkRead conversationId={selected.id} action={markRead} />
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
            <div>
              <Link href={basePath} className="mr-2 text-sm text-electric md:hidden">←</Link>
              <span className="font-semibold">{otherName(selected)}</span>
              <span className="ml-2 text-xs text-muted">{selected.rfq.publicRef}</span>
            </div>
            {selected.rfq.disclosureMode === "PLATFORM_MESSAGING_ONLY" && <Badge tone="blue"><ShieldCheck className="h-3 w-3" /> Contact details hidden by buyer choice</Badge>}
          </header>
          <ol className="flex-1 space-y-3 overflow-y-auto px-5 py-5" aria-live="polite">
            {messages.length === 0 && <li className="text-center text-sm text-muted">Start the conversation.</li>}
            {messages.map((m) => {
              const mine = m.side === side;
              return (
                <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", m.side === "ADMIN" || m.side === "SYSTEM" ? "border border-line bg-surface-2 text-muted" : mine ? "bg-electric text-[var(--pm-primary-fg)]" : "bg-surface-2")}>
                    {m.side === "ADMIN" && <p className="mb-1 text-[11px] font-semibold">PatchMatch team</p>}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    {m.attachments.map((a) => (
                      <a key={a.id} href={`/api/files/${a.id}`} className="mt-1.5 flex items-center gap-1 text-xs font-semibold underline"><Paperclip className="h-3 w-3" /> {a.originalFilename}</a>
                    ))}
                    <p className={cn("mt-1 text-[10px]", mine ? "text-navy/60" : "text-muted")}>
                      {formatDateTime(m.createdAt)}
                      {m.redacted && " · contact details hidden"}
                      {mine && readAt === null ? "" : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {selected.lockedAt ? <p className="border-t border-line px-5 py-4 text-sm text-muted">This conversation was locked by moderation.</p> : <Composer conversationId={selected.id} action={sendAction} />}
        </section>
      )}
    </div>
  );
}
