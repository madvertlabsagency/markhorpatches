"use client";

type Gtag = (...args: unknown[]) => void;

/** Fires a funnel event to configured browser tags. Never pass PII or artwork here. */
export function trackClient(name: string, params: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: Gtag; fbq?: Gtag; dataLayer?: unknown[] };
  w.gtag?.("event", name, params);
  w.dataLayer?.push({ event: name, ...params });
  const fbMap: Record<string, string> = { RFQSubmitted: "Lead", SellerRegistered: "CompleteRegistration", RFQUnlocked: "Purchase" };
  if (w.fbq) fbMap[name] ? w.fbq("track", fbMap[name], params) : w.fbq("trackCustom", name, params);
}
