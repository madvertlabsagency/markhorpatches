import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { ActionButton } from "@/components/ui/client";
import { TemplateEditor } from "@/components/admin/TemplateEditor";
import { TEMPLATES } from "@/lib/services/email/templates";
import { formatDateTime } from "@/lib/utils";
import { retryJobAction, runJobsNowAction } from "../actions";

export const metadata: Metadata = { title: "Notifications & jobs" };

export default async function AdminNotifications() {
  await requireAdmin("notifications:manage");
  const [deliveries, jobs, overrides, jobStats] = await Promise.all([
    prisma.notificationDelivery.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.backgroundJob.findMany({ where: { status: { in: ["FAILED", "DEAD", "QUEUED", "RUNNING"] } }, orderBy: { runAt: "asc" }, take: 40 }),
    prisma.notificationTemplate.findMany(),
    prisma.backgroundJob.groupBy({ by: ["status"], _count: true }),
  ]);
  return (
    <>
      <PageHeader title="Notifications & jobs" description={`Email provider: ${process.env.EMAIL_PROVIDER ?? "console"} · WhatsApp/SMS: not integrated (feature-flagged). Emails are sent at most once per dedupe key.`} actions={<ActionButton action={runJobsNowAction}>Run queued jobs now</ActionButton>} />
      <div className="mb-6 flex flex-wrap gap-2">{jobStats.map((s) => <Badge key={s.status} tone={s.status === "DEAD" ? "red" : s.status === "SUCCEEDED" ? "green" : "neutral"}>{s.status.toLowerCase()}: {s._count}</Badge>)}</div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader title="Pending / failed jobs" />
          <DataTable rows={jobs} rowKey={(j) => j.id} dense empty={<p className="p-5 text-sm text-muted">Queue is empty.</p>} columns={[
            { key: "t", header: "Type", cell: (j) => j.type }, { key: "s", header: "Status", cell: (j) => <Badge tone={j.status === "DEAD" ? "red" : "neutral"}>{j.status.toLowerCase()}</Badge> },
            { key: "a", header: "Attempts", cell: (j) => `${j.attempts}/${j.maxAttempts}`, align: "right" }, { key: "e", header: "Error", cell: (j) => <span className="text-xs text-muted">{j.lastError?.slice(0, 80) ?? "—"}</span>, hideOnMobile: true },
            { key: "x", header: "", cell: (j) => (j.status === "DEAD" || j.status === "FAILED" ? <ActionButton variant="ghost" action={retryJobAction.bind(null, j.id)}>Retry</ActionButton> : null) },
          ]} />
        </Card>
        <Card><CardHeader title="Recent email deliveries" />
          <DataTable rows={deliveries} rowKey={(d) => d.id} dense empty={<p className="p-5 text-sm text-muted">None yet.</p>} columns={[
            { key: "t", header: "Template", cell: (d) => d.template }, { key: "r", header: "To", cell: (d) => d.recipient.replace(/(^.).*(@.*$)/, "$1•••$2") },
            { key: "s", header: "Status", cell: (d) => <Badge tone={d.status === "SENT" ? "green" : d.status === "FAILED" ? "red" : "neutral"}>{d.status.toLowerCase()}</Badge> }, { key: "d", header: "When", cell: (d) => formatDateTime(d.createdAt), hideOnMobile: true },
          ]} />
        </Card>
      </div>
      <Card className="mt-6"><CardHeader title="Email templates" description="Override subject/body with {{variable}} placeholders. Leave inactive to use the built-in branded template." />
        <div className="p-5"><TemplateEditor templates={Object.entries(TEMPLATES).map(([key, t]) => ({ key, description: t.description, variables: Object.keys(t.sample), override: overrides.find((o) => o.key === key) ?? null }))} /></div>
      </Card>
    </>
  );
}
