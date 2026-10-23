import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui/primitives";
import { ActionButton, ActionForm } from "@/components/ui/client";
import { Input, Textarea } from "@/components/ui/fields";
import { formatDateTime } from "@/lib/utils";
import { adminMessageAction, hideMessageAction, lockConversationAction, resolveReportAction } from "../actions";

export const metadata: Metadata = { title: "Messages & moderation" };

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await requireAdmin("messages:moderate");
  const { c } = await searchParams;
  const [reports, conversations, flagged] = await Promise.all([
    prisma.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" } }),
    prisma.conversation.findMany({ include: { rfq: { select: { publicRef: true } }, seller: { select: { legalName: true } }, _count: { select: { messages: true } } }, orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } }, take: 50 }),
    prisma.message.findMany({ where: { redacted: true }, include: { conversation: { include: { rfq: { select: { publicRef: true } } } } }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const selected = c ? await prisma.conversation.findUnique({ where: { id: c }, include: { messages: { orderBy: { createdAt: "asc" } }, rfq: { select: { publicRef: true } }, seller: { select: { legalName: true } } } }) : null;
  return (
    <>
      <PageHeader title="Messages & moderation" description="Reports, contact-masking events and conversation oversight. All moderation actions are audit-logged." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card><CardHeader title={`Open reports (${reports.length})`} />
            <ul className="divide-y divide-line">{reports.length === 0 && <li className="px-5 py-3 text-sm text-muted">No open reports.</li>}{reports.map((r) => (
              <li key={r.id} className="space-y-2 px-5 py-3 text-sm"><p><Badge tone="amber">{r.entityType}</Badge> <b>{r.reason}</b></p><p className="text-muted">{r.details}</p><p className="text-xs text-muted">{formatDateTime(r.createdAt)} · entity {r.entityId.slice(0, 8)}</p>
                <ActionForm action={resolveReportAction} submitLabel="Resolve" submitSize="sm" className="space-y-2"><input type="hidden" name="reportId" value={r.id} /><select name="status" className="h-9 rounded-lg border border-line bg-surface px-2 text-sm" aria-label="Outcome"><option value="ACTIONED">Actioned</option><option value="DISMISSED">Dismissed</option></select><Input name="resolution" placeholder="Resolution note" required className="h-9" /></ActionForm>
              </li>))}</ul>
          </Card>
          <Card><CardHeader title="Recent contact-masking events" description="Messages where contact details were hidden (platform-messaging-only RFQs)." />
            <ul className="divide-y divide-line text-xs">{flagged.map((m) => <li key={m.id} className="px-5 py-2"><span className="font-semibold">{m.conversation.rfq.publicRef}</span> · {m.side.toLowerCase()} · {formatDateTime(m.createdAt)}<p className="text-muted">{m.body.slice(0, 120)}</p></li>)}</ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Conversations" />
            <ul className="max-h-80 divide-y divide-line overflow-y-auto text-sm">{conversations.map((x) => <li key={x.id}><a href={`/admin/messages?c=${x.id}`} className="flex justify-between px-5 py-2 hover:bg-surface-2/60"><span>{x.rfq.publicRef} · {x.seller.legalName}</span><span className="text-xs text-muted">{x._count.messages} msgs{x.lockedAt ? " · locked" : ""}</span></a></li>)}</ul>
          </Card>
          {selected && (
            <Card><CardHeader title={`${selected.rfq.publicRef} · ${selected.seller.legalName}`} action={<ActionButton variant={selected.lockedAt ? "secondary" : "danger"} action={lockConversationAction.bind(null, selected.id, !selected.lockedAt)}>{selected.lockedAt ? "Unlock" : "Lock conversation"}</ActionButton>} />
              <ol className="max-h-96 space-y-2 overflow-y-auto p-5 text-sm">{selected.messages.map((m) => (
                <li key={m.id} className={m.hiddenAt ? "rounded-lg bg-danger/5 p-2 opacity-60" : "rounded-lg bg-surface-2/60 p-2"}><p className="text-xs text-muted">{m.side.toLowerCase()} · {formatDateTime(m.createdAt)}{m.redacted ? " · masked" : ""}{m.hiddenAt ? " · hidden" : ""}</p><p className="whitespace-pre-wrap">{m.body}</p>{!m.hiddenAt && <ActionButton variant="ghost" confirm="Hide this message from both parties?" action={hideMessageAction.bind(null, m.id)}>Hide</ActionButton>}</li>
              ))}</ol>
              <div className="border-t border-line p-5"><ActionForm action={adminMessageAction} submitLabel="Post as PatchMatch team" resetOnSuccess><input type="hidden" name="conversationId" value={selected.id} /><Textarea name="body" rows={2} required aria-label="Message" /></ActionForm></div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
