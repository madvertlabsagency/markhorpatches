"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";

const COOKIE = "pm_analytics_consent";

function readConsent(): "granted" | "denied" | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=(granted|denied)`));
  return (m?.[1] as "granted" | "denied" | undefined) ?? null;
}

/**
 * Tag loaders — rendered only when the corresponding ID is configured AND the visitor has
 * opted in. Nothing loads before consent. Events sent to ad platforms carry no buyer PII and
 * never artwork.
 */
export function Analytics() {
  const ga = process.env.NEXT_PUBLIC_GA4_ID;
  const gtm = process.env.NEXT_PUBLIC_GTM_ID;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const configured = !!(ga || gtm || pixel);
  const [consent, setConsent] = useState<"granted" | "denied" | null | undefined>(undefined);

  useEffect(() => {
    // Cookie is only readable after mount; the banner must not render during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (configured) setConsent(readConsent());
  }, [configured]);

  if (!configured || consent === undefined) return null;

  const choose = (value: "granted" | "denied") => {
    document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setConsent(value);
  };

  if (consent === null) {
    return (
      <div role="dialog" aria-label="Analytics cookies" className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-xl rounded-2xl border border-line bg-surface p-4 text-sm shadow-[var(--shadow-lift)] sm:inset-x-auto sm:right-4">
        <p className="text-fg">We use optional analytics and advertising cookies to measure how visitors find PatchMatch AI. They are off unless you allow them.</p>
        <p className="mt-1 text-muted">See our <Link href="/privacy" className="underline">privacy policy</Link>.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => choose("granted")} className="rounded-xl bg-electric px-3.5 py-2 font-semibold text-[var(--pm-primary-fg)]">Allow analytics</button>
          <button type="button" onClick={() => choose("denied")} className="rounded-xl border border-line px-3.5 py-2 font-semibold">Decline</button>
        </div>
      </div>
    );
  }
  if (consent !== "granted") return null;

  return (
    <>
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtm)});`}
        </Script>
      )}
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(ga)},{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixel)});fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
