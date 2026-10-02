"use client";
/** Provider-neutral analytics. Pushes to dataLayer (GTM/GA4) and PostHog when configured. */

export type AnalyticsEvent =
  | "view_product" | "start_configurator" | "select_patch_type" | "upload_artwork" | "select_size" | "select_quantity"
  | "complete_configurator" | "request_mockup" | "add_to_cart" | "begin_checkout" | "purchase" | "open_whatsapp"
  | "submit_support" | "view_proof" | "approve_proof" | "request_revision";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    posthog?: { capture: (e: string, p?: Record<string, unknown>) => void };
  }
}

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const payload = { ...props, ...readUtm() };
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...payload });
  window.gtag?.("event", event, payload);
  window.posthog?.capture(event, payload);
  if (process.env.NODE_ENV === "development") console.debug("[analytics]", event, payload);
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export const UTM_COOKIE = "pg_utm";

/** First-touch UTM persistence (30 days) in a first-party cookie readable by the server. */
export function captureUtm() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) found[k] = v.slice(0, 120);
  }
  if (!Object.keys(found).length || readUtm().utm_source) return;
  found.landing_page = window.location.pathname;
  document.cookie = `${UTM_COOKIE}=${encodeURIComponent(JSON.stringify(found))}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function readUtm(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${UTM_COOKIE}=`));
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw.split("=").slice(1).join("=")));
  } catch {
    return {};
  }
}
