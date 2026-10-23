"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface LiveEvent {
  id: string;
  kind: "RFQ_POSTED" | "SELLER_APPLIED" | "SELLER_VERIFIED" | "RFQ_UNLOCKED" | "QUOTE_SENT" | "SELLER_SELECTED" | "PREVIEW_VIEWED" | "OFFER_NUDGE";
  title: string;
  detail: string | null;
  patchType: string | null;
  quantity: number | null;
  valueMinor: number | null;
  region: string | null;
  createdAt: string;
}
export interface LiveStats {
  rfqs24h: number;
  quotes24h: number;
  unlocks24h: number;
  verifiedSellers: number;
  openOpportunities: number;
  applications24h: number;
}
export interface LiveNotification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
}

/**
 * Polls /api/live every few seconds (paused while the tab is hidden). New events are merged on
 * top and flagged in `fresh` for a short entrance animation.
 */
export function useLiveFeed(opts: { scope?: "public" | "admin"; minUsd?: number; intervalMs?: number; max?: number; onNotification?: (n: LiveNotification) => void } = {}) {
  const { scope = "public", minUsd = 0, intervalMs = 4000, max = 40 } = opts;
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [demo, setDemo] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const lastEvent = useRef<string | null>(null);
  const lastNotif = useRef<string | null>(null);
  const reset = useRef(true);
  const onNotif = useRef(opts.onNotification);
  useEffect(() => {
    onNotif.current = opts.onNotification;
  });

  const poll = useCallback(async () => {
    const qs = new URLSearchParams({ scope });
    if (minUsd) qs.set("min", String(minUsd));
    if (lastEvent.current) qs.set("after", lastEvent.current);
    if (onNotif.current) qs.set("notifAfter", lastNotif.current ?? new Date().toISOString());
    try {
      const res = await fetch(`/api/live?${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { demo: boolean; now: string; events: LiveEvent[]; stats: LiveStats; notifications: LiveNotification[] };
      setDemo(data.demo);
      setStats(data.stats);
      setNow(Date.parse(data.now) || Date.now());
      if (reset.current) {
        reset.current = false;
        setEvents(data.events.slice(0, max));
        if (data.events.length) lastEvent.current = data.events[0].createdAt;
      } else if (data.events.length) {
        const first = !lastEvent.current;
        lastEvent.current = data.events[0].createdAt;
        setEvents((prev) => {
          const seen = new Set(prev.map((e) => e.id));
          const incoming = data.events.filter((e) => !seen.has(e.id));
          return [...incoming, ...prev].slice(0, max);
        });
        if (!first) {
          const ids = new Set(data.events.map((e) => e.id));
          setFresh(ids);
          setTimeout(() => setFresh(new Set()), 2500);
        }
      }
      if (!lastNotif.current) lastNotif.current = data.now;
      if (data.notifications.length) {
        lastNotif.current = data.notifications[0].createdAt;
        for (const n of [...data.notifications].reverse()) onNotif.current?.(n);
      }
    } catch {
      /* offline — try again next tick */
    }
  }, [scope, minUsd, max]);

  useEffect(() => {
    lastEvent.current = null;
    reset.current = true;
    const first = setTimeout(() => void poll(), 0);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, intervalMs);
    const clock = setInterval(() => setNow((n) => n + 1000), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      clearInterval(clock);
    };
  }, [poll, intervalMs]);

  return { events, stats, demo, fresh, now };
}

export function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
