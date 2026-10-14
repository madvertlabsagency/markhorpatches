import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { retryCrmAdmin } from "../actions";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Card, Flash, Notice, Table, btnGhostCls } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

const TEMPLATES = ["mockup_received", "proof_ready", "revision_received", "proof_approved", "payment_confirmation", "production_started", "quality_check", "shipped", "delivered", "review_request", "abandoned_cart", "verify_email", "password_reset"];

export default async function AdminIntegrations({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("integrations:read");
  const sp = await searchParams;
  const [crm, logs, emails, counts] = await Promise.all([
    prisma.cRMEvent.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.integrationLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.emailEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.cRMEvent.groupBy({ by: ["status"], _count: true }),
  ]);
  const env = {
    payments: process.env.PAYMENTS_PROVIDER ?? "mock", storage: process.env.STORAGE_DRIVER ?? "local", email: process.env.EMAIL_PROVIDER ?? "console",
    ghl: process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID ? "configured" : "not configured", pipeline: process.env.GHL_PIPELINE_ID ? "set" : "not set",
  };
  return (
    <div className="space-y-6">
      <AdminHeader title="Integrations & logs" description="Provider status (secrets are never shown), CRM delivery queue, email log and template previews." actions={<form action={retryCrmAdmin}><button className={btnGhostCls}>Process CRM queue now</button></form>} />
      <Flash sp={sp} />
      {env.payments === "mock" && <Notice tone="warn">Payments are in MOCK mode. Configure Stripe before taking real orders.</Notice>}
      <div className="grid gap-4 sm:grid-cols-5">
        {Object.entries(env).map(([k, v]) => <Card key={k}><p className="text-xs uppercase tracking-wider text-slate">{k}</p><p className="mt-1 font-semibold">{v}</p></Card>)}
      </div>
      <Card title="GoHighLevel queue" actions={<span className="text-xs text-slate">{counts.map((c) => `${c.status}: ${c._count}`).join(" · ")}</span>}>
        <Table head={["Event", "Email", "Status", "Attempts", "Last error", "Created", ""]} empty={env.ghl === "configured" ? "No CRM events yet." : "GHL is not configured — events are skipped until GHL_API_KEY and GHL_LOCATION_ID are set."}>
          {crm.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-2 text-xs font-semibold">{e.type}</td><td className="px-4 py-2 text-xs">{e.email}</td>
              <td className="px-4 py-2"><Badge tone={e.status === "SENT" ? "success" : e.status === "PENDING" || e.status === "PROCESSING" ? "info" : "danger"}>{e.status}</Badge></td>
              <td className="px-4 py-2 text-xs">{e.attempts}</td><td className="max-w-xs truncate px-4 py-2 text-xs text-danger" title={e.lastError ?? ""}>{e.lastError}</td>
              <td className="px-4 py-2 text-xs text-slate">{formatDate(e.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
              <td className="px-4 py-2">{e.status !== "SENT" && <form action={retryCrmAdmin}><input type="hidden" name="id" value={e.id} /><button className="text-xs font-semibold text-patch">Retry</button></form>}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Integration log">
          <ul className="divide-y divide-line text-xs">{logs.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2"><span><strong>{l.provider}</strong> {l.operation} {l.statusCode ?? ""} {l.error && <span className="text-danger">{l.error}</span>}</span><span className="text-slate">{l.durationMs}ms · {formatDate(l.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></li>)}</ul>
          {!logs.length && <p className="text-sm text-slate">No calls logged yet.</p>}
        </Card>
        <Card title="Email log">
          <ul className="divide-y divide-line text-xs">{emails.map((e) => <li key={e.id} className="flex justify-between gap-3 py-2"><span><Badge tone={e.status === "SENT" ? "success" : e.status === "FAILED" ? "danger" : "neutral"}>{e.status}</Badge> {e.template} → {e.to}</span><span className="text-slate">{e.provider} · {formatDate(e.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></li>)}</ul>
          {!emails.length && <p className="text-sm text-slate">No emails yet.</p>}
        </Card>
      </div>
      <Card title="Email templates">
        <div className="flex flex-wrap gap-2">{TEMPLATES.map((t) => <a key={t} href={`/admin/api/email-preview?t=${t}`} target="_blank" className="rounded-full bg-offwhite px-3 py-1.5 text-xs font-semibold ring-1 ring-line hover:ring-navy">{t}</a>)}</div>
        <p className="mt-3 text-xs text-slate">Templates live in <code>src/lib/services/email/templates.ts</code>. Every email is triggered by a domain event and sent at most once per idempotency key.</p>
      </Card>
    </div>
  );
}
