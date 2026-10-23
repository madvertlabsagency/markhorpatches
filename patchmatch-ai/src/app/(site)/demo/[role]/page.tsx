import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { DEMO_ACCOUNTS, DEMO_PASSWORD_DEFAULT } from "@/lib/demo/catalog";
import { DemoLoginButton } from "@/components/demo/DemoLogin";

export const metadata: Metadata = { title: "Demo sign-in", robots: { index: false } };

const ROLE = {
  buyer: { key: "buyer", next: "/buyer/dashboard" },
  manufacturer: { key: "seller", next: "/seller/opportunities" },
  admin: { key: "admin", next: "/admin/demo" },
} as const;

/** /demo/buyer · /demo/manufacturer · /demo/admin — one-click persona switch (demo deployments only). */
export default async function DemoRolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isDemoMode() || !(role in ROLE)) notFound();
  const r = ROLE[role as keyof typeof ROLE];
  const acc = DEMO_ACCOUNTS[r.key];
  return (
    <div className="container-page grid min-h-[50vh] place-items-center py-16">
      <div className="card w-full max-w-sm space-y-4 p-6 text-center">
        <p className="font-display text-xs font-semibold tracking-[0.28em] text-electric uppercase">Demo mode</p>
        <h1 className="text-2xl font-extrabold">Signing in as the demo {acc.label.toLowerCase()}…</h1>
        <p className="text-sm text-muted">{acc.name}{"company" in acc ? ` · ${acc.company}` : ""} — a fictional account.</p>
        <DemoLoginButton auto email={acc.email} password={process.env.DEMO_PASSWORD ?? DEMO_PASSWORD_DEFAULT} next={r.next} label="Continue" className="bg-electric text-primary-foreground" />
      </div>
    </div>
  );
}
