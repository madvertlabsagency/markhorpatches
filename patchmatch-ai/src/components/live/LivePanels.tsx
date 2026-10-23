"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BellRing, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveDot, LiveFeedList } from "./LiveFeed";
import { useLiveFeed, type LiveEvent, type LiveNotification } from "./useLiveFeed";

function DemoTag({ demo, dark }: { demo: boolean; dark?: boolean }) {
  if (!demo) return null;
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase", dark ? "bg-white/10 text-gold" : "bg-gold/25 text-[#7A5A22] dark:bg-white/10 dark:text-gold")}>Demo simulation · fictional</span>;
}

/** Homepage hero card: the five most recent anonymised marketplace events. */
export function LiveHeroPanel() {
  const { events, stats, demo, fresh, now } = useLiveFeed({ max: 6 });
  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-navy/70 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <LiveDot dark label="Live marketplace" />
        <DemoTag demo={demo} dark />
      </div>
      <LiveFeedList events={events.slice(0, 5)} fresh={fresh} now={now} dark compact />
      <div className="grid grid-cols-3 border-t border-white/10 text-center">
        {[
          ["Requests 24h", stats?.rfqs24h],
          ["Offers 24h", stats?.quotes24h],
          ["Verified makers", stats?.verifiedSellers],
        ].map(([k, v]) => (
          <div key={k as string} className="px-2 py-3">
            <p className="tabular font-display text-xl font-bold text-white">{v ?? "—"}</p>
            <p className="text-[10px] font-medium tracking-wide text-white/55 uppercase">{k}</p>
          </div>
        ))}
      </div>
      <Link href="/live" className="flex items-center justify-center gap-1.5 border-t border-white/10 py-2.5 text-xs font-semibold text-gold hover:bg-white/5">
        Open the live board <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

const VALUE_FILTERS = [
  { label: "Any value", min: 0 },
  { label: "$300+", min: 300 },
  { label: "$1,000+", min: 1000 },
  { label: "$5,000+", min: 5000 },
];
const KIND_FILTERS: { label: string; kinds: LiveEvent["kind"][] | null }[] = [
  { label: "Everything", kinds: null },
  { label: "Buyer requests", kinds: ["RFQ_POSTED"] },
  { label: "Offers & claims", kinds: ["RFQ_UNLOCKED", "QUOTE_SENT", "SELLER_SELECTED"] },
  { label: "Manufacturers", kinds: ["SELLER_APPLIED", "SELLER_VERIFIED"] },
];
const TYPES = ["EMBROIDERED", "PVC", "CHENILLE", "WOVEN", "SUBLIMATED", "LEATHER", "PRINTED"];

/** Full live board with value / activity / patch-type filters. */
export function LiveBoard({ scope = "public", title = "Live marketplace" }: { scope?: "public" | "admin"; title?: string }) {
  const [min, setMin] = useState(0);
  const [kind, setKind] = useState(0);
  const [type, setType] = useState<string | null>(null);
  const { events, stats, demo, fresh, now } = useLiveFeed({ scope, minUsd: min, max: 60 });
  const shown = useMemo(() => events.filter((e) => (!KIND_FILTERS[kind].kinds || KIND_FILTERS[kind].kinds!.includes(e.kind)) && (!type || e.patchType === type)), [events, kind, type]);
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", active ? "border-navy bg-navy text-white dark:border-white dark:bg-white dark:text-navy" : "border-line bg-surface hover:border-orange/50");
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-3">
            <LiveDot label={title} />
            <DemoTag demo={demo} />
          </div>
          <span className="text-xs text-muted">Updates every few seconds · buyer identities are never shown</span>
        </div>
        <div className="space-y-2 border-b border-line px-4 py-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Estimated order value">
            {VALUE_FILTERS.map((f) => (
              <button key={f.min} type="button" onClick={() => setMin(f.min)} className={chip(min === f.min)} aria-pressed={min === f.min}>{f.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Activity type">
            {KIND_FILTERS.map((f, i) => (
              <button key={f.label} type="button" onClick={() => setKind(i)} className={chip(kind === i)} aria-pressed={kind === i}>{f.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Patch type">
            <button type="button" onClick={() => setType(null)} className={chip(!type)} aria-pressed={!type}>All types</button>
            {TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={chip(type === t)} aria-pressed={type === t}>{t === "PVC" ? "PVC" : t.charAt(0) + t.slice(1).toLowerCase()}</button>
            ))}
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <LiveFeedList events={shown} fresh={fresh} now={now} empty="Nothing matches these filters yet — new activity appears here automatically." />
        </div>
      </section>
      <aside className="space-y-4">
        {[
          { k: "Buyer requests · 24h", v: stats?.rfqs24h, c: "from-orange to-[#FF8A3D]" },
          { k: "Offers sent · 24h", v: stats?.quotes24h, c: "from-green to-[#2FA36F]" },
          { k: "Requests claimed · 24h", v: stats?.unlocks24h, c: "from-navy to-deep" },
          { k: "Open opportunities", v: stats?.openOpportunities, c: "from-[#B93C0A] to-orange" },
          { k: "Verified manufacturers", v: stats?.verifiedSellers, c: "from-[#17573C] to-green" },
          { k: "New applications · 24h", v: stats?.applications24h, c: "from-[#A27B3E] to-gold" },
        ].map((s) => (
          <div key={s.k} className={cn("rounded-2xl bg-gradient-to-br p-4 text-white shadow-[var(--shadow-card)]", s.c)}>
            <p className="text-xs font-semibold tracking-wide text-white/85 uppercase">{s.k}</p>
            <p className="tabular mt-1 font-display text-3xl font-bold">{s.v ?? "—"}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}

/** Compact feed for dashboards (admin command center, seller dashboard). */
export function LiveFeedCard({ scope = "public", title = "Live marketplace", max = 8, footer }: { scope?: "public" | "admin"; title?: string; max?: number; footer?: React.ReactNode }) {
  const { events, demo, fresh, now } = useLiveFeed({ scope, max: 30 });
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <LiveDot label={title} />
        <DemoTag demo={demo} />
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <LiveFeedList events={events.slice(0, max)} fresh={fresh} now={now} compact />
      </div>
      {footer && <div className="border-t border-line px-4 py-2.5 text-sm">{footer}</div>}
    </section>
  );
}

/** Pops a toast for each new in-app notification of the signed-in user (e.g. new matching RFQ). */
export function LiveToaster() {
  const [toasts, setToasts] = useState<LiveNotification[]>([]);
  useLiveFeed({
    intervalMs: 5000,
    max: 1,
    onNotification: (n) => setToasts((t) => [n, ...t.filter((x) => x.id !== n.id)].slice(0, 3)),
  });
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((x) => x.slice(0, -1)), 9000);
    return () => clearTimeout(t);
  }, [toasts]);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-[80] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((n) => (
        <div key={n.id} className="pointer-events-auto animate-slide-in rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-lift)]">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange/15 text-[#B93C0A] dark:text-[#FF8A5B]"><BellRing className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
              {n.link && <Link href={n.link} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-electric">Open <ArrowRight className="h-3 w-3" /></Link>}
            </div>
            <button type="button" onClick={() => setToasts((t) => t.filter((x) => x.id !== n.id))} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
