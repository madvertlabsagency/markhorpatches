import { storageDriver } from "@/lib/services/storage";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge, Alert } from "@/components/ui/primitives";
import { ActionButton } from "@/components/ui/client";
import { BankSettingsForm } from "@/components/admin/BankSettingsForm";
import { allProviders, paymentProvider } from "@/lib/services/payments";
import { aiProviderName } from "@/lib/services/ai";
import { adminMfaRequired, isDemoMode } from "@/lib/env";
import { toggleFlagAction } from "../actions";
import { marketplaceSettings } from "@/lib/settings";
import { MarketplaceSettingsForm } from "@/components/admin/MarketplaceSettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requireAdmin("settings:manage");
  const [flags, bank, market] = await Promise.all([prisma.featureFlag.findMany({ orderBy: { key: "asc" } }), prisma.platformSetting.findUnique({ where: { key: "bankTransfer" } }), marketplaceSettings()]);
  const integrations: [string, boolean, string][] = [
    ["Payments", paymentProvider().configured && paymentProvider().name !== "sandbox", `${paymentProvider().displayName}. Pakistani gateways (${allProviders().filter((p) => !p.configured).map((p) => p.displayName).join(", ")}) need merchant approval + official API docs.`],
    ["Object storage", storageDriver() !== "local", storageDriver() === "s3" ? `S3 bucket ${process.env.S3_BUCKET}` : storageDriver() === "vercel-blob" ? "Vercel Blob (private access when the store supports it)" : "Local disk (development only)"],
    ["Email", !!process.env.EMAIL_PROVIDER && process.env.EMAIL_PROVIDER !== "console", process.env.EMAIL_PROVIDER ?? "console (emails logged, not sent)"],
    ["AI", aiProviderName() === "anthropic", aiProviderName() === "anthropic" ? "Claude via Anthropic API" : "Deterministic rules (no external AI)"],
    ["Google login", !!process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_ID ? "Configured" : "GOOGLE_CLIENT_ID/SECRET not set"],
    ["Malware scanning", !!process.env.MALWARE_SCANNER, process.env.MALWARE_SCANNER ? process.env.MALWARE_SCANNER : "No scanner configured — uploads are type/magic-byte validated only"],
    ["Cron secret", !!process.env.CRON_SECRET, process.env.CRON_SECRET ? "Set" : "CRON_SECRET not set — cron endpoints reject all calls"],
    ["Admin MFA enforced", adminMfaRequired(), adminMfaRequired() ? "Yes" : "No (development)"],
  ];
  return (
    <>
      <PageHeader title="Settings" />
      {isDemoMode() && <Alert tone="warning" className="mb-6" title="Demo mode">DEMO_MODE=true — this environment shows fictional data.</Alert>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader title="Feature flags" />
          <ul className="divide-y divide-line">{flags.map((f) => <li key={f.key} className="flex items-start gap-3 px-5 py-3 text-sm"><div className="flex-1"><p className="font-mono text-xs font-semibold">{f.key}</p><p className="text-muted">{f.description}</p></div><Badge tone={f.enabled ? "green" : "neutral"}>{f.enabled ? "on" : "off"}</Badge><ActionButton variant="ghost" confirm={`Turn ${f.enabled ? "off" : "on"} ${f.key}?`} action={toggleFlagAction.bind(null, f.key)}>{f.enabled ? "Disable" : "Enable"}</ActionButton></li>)}</ul>
        </Card>
        <Card><CardHeader title="Integrations & external blockers" />
          <ul className="divide-y divide-line">{integrations.map(([k, okk, d]) => <li key={k} className="flex items-start gap-3 px-5 py-3 text-sm"><Badge tone={okk ? "green" : "amber"}>{okk ? "ready" : "action needed"}</Badge><div><p className="font-semibold">{k}</p><p className="text-muted">{d}</p></div></li>)}</ul>
        </Card>
        <Card><CardHeader title="Marketplace operations" description="Pilot parameters. Unlock prices are set under Pricing." /><div className="p-5"><MarketplaceSettingsForm value={market} /></div></Card>
        <Card><CardHeader title="Bank transfer details (shown on invoices)" /><div className="p-5"><BankSettingsForm value={(bank?.value ?? {}) as Record<string, string>} /></div></Card>
      </div>
    </>
  );
}
