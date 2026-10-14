import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";

export const SITE_NAME = "Markhor Patches";
export const DEFAULT_DESCRIPTION =
  "Custom patches for bold brands. Embroidered, PVC, woven, chenille, leather, printed and 3D puff patches with transparent pricing, free artwork support and a digital proof before production.";

export function pageMetadata(opts: { title: string; description?: string; path: string; image?: string; noindex?: boolean; type?: "website" | "article" }): Metadata {
  const url = siteUrl(opts.path);
  const description = opts.description ?? DEFAULT_DESCRIPTION;
  const image = opts.image ?? "/opengraph-image";
  return {
    title: opts.title,
    description,
    alternates: { canonical: url },
    robots: opts.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { title: opts.title, description, url, siteName: SITE_NAME, type: opts.type ?? "website", locale: "en_US", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: opts.title, description, images: [image] },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl(it.path) })),
  };
}

export function organizationJsonLd(opts: { email?: string; sameAs?: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl("/"),
    logo: siteUrl("/brand/markhor-badge-800.png"),
    slogan: "Custom patches for brands that don’t follow the herd.",
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl("/"),
    potentialAction: { "@type": "SearchAction", target: `${siteUrl("/search")}?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}
