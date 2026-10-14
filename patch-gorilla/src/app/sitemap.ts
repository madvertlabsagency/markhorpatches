import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { INDUSTRIES } from "@/content/industries";

export const revalidate = 3600;

const STATIC = ["/", "/custom-patches", "/build-your-patch", "/free-mockup", "/pricing", "/gallery", "/how-it-works", "/reviews", "/patch-finder", "/size-guide", "/industries", "/resources", "/about", "/faq", "/contact", "/support", "/track-order", "/privacy", "/terms", "/refund-policy", "/shipping-policy", "/accessibility"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let products: { slug: string; updatedAt: Date }[] = [];
  let articles: { slug: string; updatedAt: Date }[] = [];
  try {
    [products, articles] = await Promise.all([
      prisma.product.findMany({ where: { active: true, patchTypeId: { not: null } }, select: { slug: true, updatedAt: true } }),
      prisma.article.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    ]);
  } catch {
    // Database unavailable at build time — static entries only.
  }
  return [
    ...STATIC.map((p) => ({ url: siteUrl(p), lastModified: now, changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: siteUrl(`/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...INDUSTRIES.map((i) => ({ url: siteUrl(`/industries/${i.slug}`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...articles.map((a) => ({ url: siteUrl(`/resources/${a.slug}`), lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
