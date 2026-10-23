"use client";

import { BadgeCheck, BellRing, Eye, Factory, FilePlus2, Handshake, Send, Unlock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ago, type LiveEvent } from "./useLiveFeed";

const KIND: Record<LiveEvent["kind"], { icon: LucideIcon; label: string; cls: string }> = {
  RFQ_POSTED: { icon: FilePlus2, label: "New request", cls: "bg-orange/15 text-[#B93C0A] dark:text-[#FF8A5B]" },
  SELLER_APPLIED: { icon: Factory, label: "Manufacturer applied", cls: "bg-gold/25 text-[#7A5A22] dark:text-gold" },
  SELLER_VERIFIED: { icon: BadgeCheck, label: "Verified", cls: "bg-green/15 text-green dark:text-[#5FD39B]" },
  RFQ_UNLOCKED: { icon: Unlock, label: "Claimed", cls: "bg-navy/10 text-navy dark:bg-white/10 dark:text-white" },
  QUOTE_SENT: { icon: Send, label: "Offer sent", cls: "bg-green/15 text-green dark:text-[#5FD39B]" },
  SELLER_SELECTED: { icon: Handshake, label: "Deal", cls: "bg-orange/15 text-[#B93C0A] dark:text-[#FF8A5B]" },
  PREVIEW_VIEWED: { icon: Eye, label: "Viewed", cls: "bg-surface-2 text-muted" },
  OFFER_NUDGE: { icon: BellRing, label: "No offers yet", cls: "bg-warning/15 text-[#9A5B00] dark:text-warning" },
};

export function LiveFeedList({ events, fresh, now, dark, compact, empty = "Waiting for the first activity…" }: { events: LiveEvent[]; fresh: Set<string>; now: number; dark?: boolean; compact?: boolean; empty?: string }) {
  if (!events.length) return <p className={cn("px-4 py-8 text-center text-sm", dark ? "text-white/50" : "text-muted")}>{empty}</p>;
  return (
    <ul className="divide-y divide-line/70" aria-live="polite" aria-relevant="additions">
      {events.map((e) => {
        const k = KIND[e.kind];
        return (
          <li key={e.id} className={cn("flex items-start gap-3", compact ? "px-3 py-2.5" : "px-4 py-3", fresh.has(e.id) && "animate-slide-in bg-orange/5", dark && "border-white/10")}>
            <span className={cn("mt-0.5 grid shrink-0 place-items-center rounded-xl", compact ? "h-8 w-8" : "h-9 w-9", k.cls)}>
              <k.icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-semibold", dark && "text-white")}>{e.title}</p>
              {e.detail && <p className={cn("truncate text-xs", dark ? "text-white/60" : "text-muted")}>{e.detail}</p>}
            </div>
            <span className={cn("tabular shrink-0 text-[11px] whitespace-nowrap", dark ? "text-white/45" : "text-muted")}>{ago(e.createdAt, now)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function LiveDot({ label = "Live", dark }: { label?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase", dark ? "text-white" : "text-fg")}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange" />
      </span>
      {label}
    </span>
  );
}
