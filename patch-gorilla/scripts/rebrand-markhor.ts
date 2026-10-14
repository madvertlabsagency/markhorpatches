/**
 * One-off, idempotent data migration: Patch Gorilla → Markhor Patches.
 * Updates customer-facing COPY stored in the database (settings, product pages, FAQs, articles, gallery).
 * It never touches ids, orders, payments, proofs, customers or any schema. Safe to run repeatedly.
 *
 *   npm run db:rebrand            (uses DATABASE_URL)
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const TEXT: [RegExp, string][] = [
  [/Patch Gorilla/g, "Markhor Patches"],
  [/PATCH GORILLA/g, "MARKHOR PATCHES"],
  [/THE GORILLA QUALITY PROMISE\.?/g, "THE MARKHOR QUALITY PROMISE."],
  [/Gorilla Quality Promise/g, "Markhor Quality Promise"],
  [/in Gorilla hands/g, "in good hands"],
];
const REMOVED_IMAGES = ["/placeholders/hero-composition.webp", "/placeholders/sample-gorilla.webp", "/placeholders/macro-embroidered-p.webp", "/placeholders/sample-your-design.webp"];

const fix = (s: string | null) => (s == null ? s : TEXT.reduce((acc, [re, to]) => acc.replace(re, to), s));
const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

async function main() {
  let n = 0;

  for (const row of await prisma.siteSetting.findMany()) {
    const json = JSON.stringify(row.value);
    let next = fix(json)!.replaceAll("/placeholders/macro-embroidered-p.webp", "/placeholders/macro-patches.webp");
    if (row.key === "home") next = next.replace('"videoTitle":"Thread by thread."', '"videoTitle":"From artwork to something you can wear."');
    if (next !== json) {
      await prisma.siteSetting.update({ where: { key: row.key }, data: { value: JSON.parse(next) } });
      n++;
    }
  }

  for (const p of await prisma.product.findMany()) {
    const data = {
      name: fix(p.name)!, h1: fix(p.h1)!, tagline: p.tagline === "Any design. Any style." ? "Don’t follow the herd." : fix(p.tagline), shortDescription: fix(p.shortDescription)!,
      description: fix(p.description)!, seoTitle: fix(p.seoTitle), seoDescription: fix(p.seoDescription),
      heroImageUrl: p.heroImageUrl && REMOVED_IMAGES.includes(p.heroImageUrl) ? null : p.heroImageUrl,
      videoPosterUrl: p.videoPosterUrl && REMOVED_IMAGES.includes(p.videoPosterUrl) ? "/placeholders/macro-patches.webp" : p.videoPosterUrl,
    };
    if (changed(data, { name: p.name, h1: p.h1, tagline: p.tagline, shortDescription: p.shortDescription, description: p.description, seoTitle: p.seoTitle, seoDescription: p.seoDescription, heroImageUrl: p.heroImageUrl, videoPosterUrl: p.videoPosterUrl })) {
      await prisma.product.update({ where: { id: p.id }, data });
      n++;
    }
  }

  for (const f of await prisma.fAQ.findMany()) {
    const q = fix(f.question)!, a = fix(f.answer)!;
    if (q !== f.question || a !== f.answer) {
      await prisma.fAQ.update({ where: { id: f.id }, data: { question: q, answer: a } });
      n++;
    }
  }

  for (const a of await prisma.article.findMany()) {
    const data = { title: fix(a.title)!, excerpt: fix(a.excerpt)!, body: fix(a.body)!, authorName: fix(a.authorName)!, seoTitle: fix(a.seoTitle), seoDescription: fix(a.seoDescription) };
    if (changed(data, { title: a.title, excerpt: a.excerpt, body: a.body, authorName: a.authorName, seoTitle: a.seoTitle, seoDescription: a.seoDescription })) {
      await prisma.article.update({ where: { id: a.id }, data });
      n++;
    }
  }

  // Placeholder gallery rows whose images were removed with the old brand.
  const del = await prisma.galleryItem.deleteMany({ where: { isPlaceholder: true, imageUrl: { in: REMOVED_IMAGES } } });
  await prisma.galleryItem.updateMany({ where: { imageUrl: "/placeholders/sample-explore.webp" }, data: { width: 540, height: 540 } });
  await prisma.productMedia.deleteMany({ where: { url: { in: REMOVED_IMAGES } } });

  console.log(`✓ Rebrand complete: ${n} record(s) updated, ${del.count} old placeholder gallery item(s) removed.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
