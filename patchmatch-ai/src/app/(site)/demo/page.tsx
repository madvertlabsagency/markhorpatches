import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Factory, ShieldCheck, ShoppingBag } from "lucide-react";
import { isDemoMode } from "@/lib/env";
import { DEMO_ACCOUNTS, DEMO_PASSWORD_DEFAULT } from "@/lib/demo/catalog";
import { DemoLoginButton } from "@/components/demo/DemoLogin";

export const metadata: Metadata = { title: "Demo accounts", robots: { index: false } };

const ROLES = [
  {
    key: "admin" as const, icon: ShieldCheck, next: "/admin", tone: "bg-navy text-white", btn: "bg-navy text-white hover:bg-deep dark:bg-white dark:text-navy",
    tries: ["Watch new requests arrive in the command center", "Review & qualify a request, run matching, publish it", "Verify a new manufacturer application", "See which manufacturers viewed which request"],
  },
  {
    key: "seller" as const, icon: Factory, next: "/seller/opportunities", tone: "bg-green text-white", btn: "bg-green text-white hover:bg-[#17573C]",
    tries: ["Filter open requests by value ($300+) and patch type", "Unlock an exclusive request with demo credits", "See buyer details appear, then send a quote", "Get “no offers yet — be first” reminders"],
  },
  {
    key: "buyer" as const, icon: ShoppingBag, next: "/buyer/dashboard", tone: "bg-electric text-white", btn: "bg-electric text-white hover:bg-[#B93C0A]",
    tries: ["Track requests from verified to quoted", "Compare itemised quotes side by side", "Message a manufacturer, shortlist and select", "Post a new request with the 11-step wizard"],
  },
];

export default function DemoPage() {
  if (!isDemoMode()) notFound();
  const password = process.env.DEMO_PASSWORD ?? DEMO_PASSWORD_DEFAULT;
  return (
    <div className="container-page py-14">
      <p className="font-display text-xs font-semibold tracking-[0.28em] text-electric uppercase">Demo environment</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Pick a role and explore.</h1>
      <p className="mt-3 max-w-2xl text-muted">Three ready-made accounts with fictional data. The marketplace keeps moving on its own — new buyer requests, manufacturer applications and offers arrive every few seconds while someone is watching.</p>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {ROLES.map((r) => {
          const acc = DEMO_ACCOUNTS[r.key];
          return (
            <section key={r.key} className="card flex flex-col overflow-hidden">
              <div className={`flex items-center gap-3 px-5 py-4 ${r.tone}`}>
                <r.icon className="h-6 w-6" />
                <div>
                  <p className="font-display text-lg font-bold">{acc.label}</p>
                  <p className="text-xs opacity-85">{acc.name}{"company" in acc ? ` · ${acc.company}` : ""}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-5">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted">Email</dt>
                  <dd className="font-mono text-xs break-all select-all">{acc.email}</dd>
                  <dt className="text-muted">Password</dt>
                  <dd className="font-mono text-xs select-all">{password}</dd>
                </dl>
                <ul className="space-y-1.5 text-sm">
                  {r.tries.map((t) => (
                    <li key={t} className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />{t}</li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <DemoLoginButton email={acc.email} password={password} next={r.next} label={`Enter as ${acc.label}`} className={r.btn} />
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-muted">
        Prefer to watch first? Open the <Link href="/live" className="font-semibold text-electric hover:underline">live marketplace board</Link>. New here? Read the <Link href="/guide/buyers" className="font-semibold text-electric hover:underline">buyer guide</Link> or the <Link href="/guide/sellers" className="font-semibold text-electric hover:underline">manufacturer guide</Link>.
      </p>
    </div>
  );
}
