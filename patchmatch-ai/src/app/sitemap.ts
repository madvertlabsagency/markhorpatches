import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { PATCH_TYPES } from "@/lib/catalog";
import { USE_CASES } from "@/content/landing";
import { ARTICLES } from "@/content/articles";
import { LEGAL } from "@/content/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/", "/how-it-works", "/get-quotes", "/manufacturers", "/patch-types", "/bulk-custom-patches", "/rush-custom-patches", "/become-a-seller", "/seller-pricing",
    "/verification", "/about", "/contact", "/help", "/blog",
    ...PATCH_TYPES.map((p) => `/patch-types/${p.slug}`),
    ...USE_CASES.map((u) => `/custom-patches/${u.slug}`),
    ...ARTICLES.map((a) => `/blog/${a.slug}`),
    ...Object.keys(LEGAL).map((k) => `/${k}`),
  ];
  return paths.map((p) => ({ url: siteUrl(p), changeFrequency: "weekly", priority: p === "/" ? 1 : p === "/get-quotes" ? 0.9 : 0.6 }));
}
