import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { emailSendingEnabled, isDemoMode } from "@/lib/env";
import { storageDriver } from "@/lib/services/storage";

export const metadata: Metadata = { title: "Setup status", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Launch checklist for the site owner: what is switched on in this deployment. Shows yes/no only — never secrets. */
export default async function SetupPage() {
  const [admins, demoRfqs, demoVersion] = await Promise.all([
    prisma.user.count({ where: { platformRole: { in: ["SUPER_ADMIN", "ADMIN"] } } }).catch(() => -1),
    prisma.rfq.count({ where: { isDemo: true } }).catch(() => 0),
    prisma.platformSetting.findUnique({ where: { key: "demo.version" } }).catch(() => null),
  ]);
  const demo = isDemoMode();
  const rows: { ok: boolean; title: string; fix: string }[] = [
    { ok: admins !== -1, title: "Database connected", fix: "Connect Neon under Vercel → Storage, then redeploy." },
    { ok: admins > 0, title: "Admin account exists", fix: "Add SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in Vercel → Settings → Environment Variables, then Redeploy. Sign in at /login and open /admin." },
    { ok: storageDriver() !== "local", title: "File uploads (Vercel Blob)", fix: "Vercel → Storage → create a Blob store (Private) and connect it to this project, then redeploy." },
    { ok: emailSendingEnabled(), title: "Emails are sent", fix: "Create a Resend account, verify your domain, then add EMAIL_PROVIDER=resend, RESEND_API_KEY and EMAIL_FROM (e.g. PatchMatch <hello@yourdomain.com>), then redeploy." },
    { ok: !!process.env.CRON_SECRET, title: "Scheduled jobs secret", fix: "Add CRON_SECRET (any long random text)." },
  ];
  const demoRows: { ok: boolean; title: string; fix: string }[] = [
    { ok: demo, title: "Demo mode on (DEMO_MODE=true)", fix: "Only for the demo/review site: add DEMO_MODE=true, PAYMENTS_PROVIDER=sandbox, ALLOW_SANDBOX_PAYMENTS=true, ADMIN_MFA_REQUIRED=false, then Redeploy." },
    { ok: demoRfqs > 0, title: `Demo data loaded${demoRfqs ? ` (${demoRfqs} requests)` : ""}`, fix: "Created automatically on the next deploy once DEMO_MODE=true." },
  ];
  const Row = ({ r }: { r: { ok: boolean; title: string; fix: string } }) => (
    <li className="flex gap-3 px-5 py-4">
      {r.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
      <div>
        <p className="font-semibold">{r.title}</p>
        {!r.ok && <p className="mt-1 text-sm text-muted">{r.fix}</p>}
      </div>
    </li>
  );
  return (
    <div className="container-page max-w-3xl py-14">
      <p className="eyebrow">Site owner</p>
      <h1 className="mt-2 text-3xl font-bold">Setup status</h1>
      <p className="mt-2 text-sm text-muted">Version {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}. After changing any setting in Vercel, use Deployments → ⋯ → Redeploy.</p>
      <h2 className="mt-8 font-display text-lg font-bold">Launch essentials</h2>
      <ul className="card mt-3 divide-y divide-line">{rows.map((r) => <Row key={r.title} r={r} />)}</ul>
      <h2 className="mt-8 font-display text-lg font-bold">Demo / review site</h2>
      <ul className="card mt-3 divide-y divide-line">{demoRows.map((r) => <Row key={r.title} r={r} />)}</ul>
      {demo && (
        <p className="mt-6 text-sm">
          Demo is on: open <Link href="/demo" className="font-semibold text-electric hover:underline">/demo</Link> or the admin <Link href="/demo/admin" className="font-semibold text-electric hover:underline">Demo control center</Link>.
          {!demoVersion && " Demo data will appear after the next deploy."}
        </p>
      )}
      <p className="mt-6 text-sm text-muted">Admin panel: sign in at <Link href="/login" className="font-semibold text-electric hover:underline">/login</Link> with the admin account, then open <code className="font-mono">/admin</code>.</p>
    </div>
  );
}
