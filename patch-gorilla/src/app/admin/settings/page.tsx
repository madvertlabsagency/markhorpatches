import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { loadSettings, type SettingsKey } from "@/lib/settings";
import { saveSettingsAdmin, saveStaffUser } from "../actions";
import { AdminHeader, Card, Flash, btnCls, inputCls, Label } from "@/components/admin/ui";
import { titleCase } from "@/lib/utils";

const HELP: Record<SettingsKey, string> = {
  brand: "Support email, WhatsApp number (digits only, international, e.g. 15551234567 — leave empty to hide the WhatsApp button), phone, hours and social links.",
  promises: "mockup24HourPromise=true shows “Get your digital mockup within 24 hours.” Guarantee copy appears on the homepage and policy pages. manufacturingStatement is shown in the footer and About page.",
  trustMetrics: "Hidden unless enabled AND populated. Only use real, verifiable numbers.",
  uploads: "Maximum artwork upload size in MB.",
  shipping: "All amounts in cents. freeThresholdCents=0 disables free shipping.",
  tax: "mode: none | flat_by_state (ratesBps per state, e.g. {\"TX\": 825}) | stripe (use Stripe Tax). Confirm your tax obligations with an accountant.",
  home: "Homepage video section. Leave videoUrl empty to show the still image only (we never fake a video).",
  payments: "Payment badges shown in the footer. Only list methods that are actually enabled in your payment provider.",
};

export default async function AdminSettings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireStaff("settings:write");
  const sp = await searchParams;
  const settings = await loadSettings();
  const staff = can(user.role, "users:write") ? await prisma.user.findMany({ where: { role: { not: "CUSTOMER" } }, orderBy: { createdAt: "asc" } }) : [];
  return (
    <div className="space-y-6">
      <AdminHeader title="Site settings" description="Validated on save. Changes apply site-wide within seconds." />
      <Flash sp={sp} />
      {(Object.keys(settings) as SettingsKey[]).map((key) => (
        <Card key={key} title={titleCase(key)}>
          <div id={key} className="scroll-mt-6" />
          <p className="mb-3 text-sm text-slate">{HELP[key]}</p>
          <form action={saveSettingsAdmin} className="space-y-3">
            <input type="hidden" name="key" value={key} />
            <textarea name="value" defaultValue={JSON.stringify(settings[key], null, 2)} className={`${inputCls} h-56 py-2 font-mono text-xs`} aria-label={`${key} JSON`} spellCheck={false} />
            <button className={btnCls}>Save {key}</button>
          </form>
        </Card>
      ))}
      {can(user.role, "users:write") && (
        <Card title="Staff accounts">
          <div id="staff" className="scroll-mt-6" />
          <ul className="mb-4 divide-y divide-line text-sm">{staff.map((s) => <li key={s.id} className="flex justify-between py-2"><span>{s.email}{s.disabled && <span className="ml-2 text-danger">disabled</span>}</span><span className="text-slate">{titleCase(s.role)}</span></li>)}</ul>
          <form action={saveStaffUser} className="grid items-end gap-2 sm:grid-cols-5">
            <div><Label>Email</Label><input name="email" type="email" className={inputCls} required /></div>
            <div><Label>Name</Label><input name="name" className={inputCls} /></div>
            <div><Label>Role</Label><select name="role" className={inputCls}>{["ADMIN", "DESIGNER", "SUPPORT", "FULFILLMENT", "SUPER_ADMIN", "CUSTOMER"].map((r) => <option key={r}>{r}</option>)}</select></div>
            <div><Label>Password (new users / reset)</Label><input name="password" type="password" className={inputCls} /></div>
            <div className="flex items-center gap-2 text-sm"><label className="flex items-center gap-1"><input type="checkbox" name="disabled" />Disabled</label><button className={btnCls}>Save</button></div>
          </form>
        </Card>
      )}
    </div>
  );
}
