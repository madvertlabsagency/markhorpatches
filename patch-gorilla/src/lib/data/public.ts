import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import { startingUnitPrice } from "@/lib/pricing/engine";
import type { PatchCardData } from "@/components/product/PatchCard";
import type { GalleryCardData } from "@/components/gallery/GalleryGrid";
import type { ReviewCardData } from "@/components/reviews/ReviewCard";

export async function getPatchCards(): Promise<PatchCardData[]> {
  const { catalog, tables } = await getCatalog();
  return catalog.patchTypes.map((p) => ({
    code: p.code, slug: p.slug, name: p.name, shortDescription: p.shortDescription, bestUse: p.bestUse, imageUrl: p.imageUrl, fromCents: startingUnitPrice(tables[p.id]),
  }));
}

export const getGalleryItems = unstable_cache(
  async (opts: { featured?: boolean; patchTypeId?: string; industry?: string; take?: number } = {}): Promise<GalleryCardData[]> => {
    const rows = await prisma.galleryItem.findMany({
      where: { published: true, ...(opts.featured ? { featured: true } : {}), ...(opts.patchTypeId ? { patchTypeId: opts.patchTypeId } : {}), ...(opts.industry ? { industry: opts.industry } : {}) },
      include: { patchType: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: opts.take ?? 60,
    });
    return rows.map((r) => ({
      id: r.id, title: r.title, imageUrl: r.imageUrl, alt: r.alt, width: r.width, height: r.height, patchType: r.patchType?.shortName ?? null, patchTypeCode: r.patchType?.code ?? null,
      industry: r.industry, shape: r.shape, sizeLabel: r.sizeLabel, backingLabel: r.backingLabel, isPlaceholder: r.isPlaceholder,
    }));
  },
  ["gallery"],
  { tags: ["gallery"], revalidate: 600 },
);

export const getPublishedReviews = unstable_cache(
  async (opts: { patchTypeId?: string; take?: number } = {}): Promise<ReviewCardData[]> => {
    const rows = await prisma.review.findMany({
      where: { published: true, ...(opts.patchTypeId ? { patchTypeId: opts.patchTypeId } : {}) },
      include: { patchType: true },
      orderBy: { createdAt: "desc" },
      take: opts.take ?? 30,
    });
    return rows.map((r) => ({
      id: r.id, customerName: r.customerName, company: r.company, rating: r.rating, title: r.title, body: r.body, photoUrl: r.photoUrl, verified: r.verified,
      patchType: r.patchType?.name ?? null, isSample: r.isSample,
    }));
  },
  ["reviews"],
  { tags: ["reviews"], revalidate: 600 },
);

/** AggregateRating only from real (non-sample) published reviews. Returns null when none exist. */
export async function getAggregateRating(patchTypeId?: string) {
  const agg = await prisma.review.aggregate({ where: { published: true, isSample: false, ...(patchTypeId ? { patchTypeId } : {}) }, _avg: { rating: true }, _count: true });
  if (!agg._count || !agg._avg.rating) return null;
  return { ratingValue: Math.round(agg._avg.rating * 10) / 10, reviewCount: agg._count };
}

export const getFaqs = unstable_cache(
  async (opts: { home?: boolean; productId?: string | null; general?: boolean } = {}) =>
    prisma.fAQ.findMany({
      where: { published: true, ...(opts.home ? { showOnHome: true } : {}), ...(opts.productId ? { productId: opts.productId } : {}), ...(opts.general ? { productId: null } : {}) },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
  ["faqs"],
  { tags: ["content"], revalidate: 600 },
);

export const getProductBySlug = unstable_cache(
  async (slug: string) =>
    prisma.product.findFirst({ where: { slug, active: true }, include: { patchType: true, media: { orderBy: { sortOrder: "asc" } } } }),
  ["product"],
  { tags: ["catalog"], revalidate: 600 },
);

export const getArticles = unstable_cache(
  async () => prisma.article.findMany({ where: { published: true }, include: { category: true }, orderBy: { publishedAt: "desc" } }),
  ["articles"],
  { tags: ["content"], revalidate: 600 },
);
