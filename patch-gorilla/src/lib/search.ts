import "server-only";
import { prisma } from "@/lib/db";

export interface SearchResult { type: "product" | "faq" | "article"; title: string; href: string; snippet: string }

/** Lightweight search over products, FAQs and articles (case-insensitive contains). Swap for Postgres FTS / Algolia at scale. */
export async function search(q: string): Promise<SearchResult[]> {
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return [];
  const ci = { contains: term, mode: "insensitive" as const };
  const [products, faqs, articles] = await Promise.all([
    prisma.product.findMany({ where: { active: true, OR: [{ name: ci }, { shortDescription: ci }, { description: ci }, { bestFor: { has: term } }] }, take: 6 }),
    prisma.fAQ.findMany({ where: { published: true, OR: [{ question: ci }, { answer: ci }] }, take: 6 }),
    prisma.article.findMany({ where: { published: true, OR: [{ title: ci }, { excerpt: ci }, { body: ci }] }, take: 6 }),
  ]);
  return [
    ...products.map((p) => ({ type: "product" as const, title: p.name, href: `/${p.slug}`, snippet: p.shortDescription })),
    ...articles.map((a) => ({ type: "article" as const, title: a.title, href: `/resources/${a.slug}`, snippet: a.excerpt })),
    ...faqs.map((f) => ({ type: "faq" as const, title: f.question, href: `/faq`, snippet: f.answer })),
  ];
}
