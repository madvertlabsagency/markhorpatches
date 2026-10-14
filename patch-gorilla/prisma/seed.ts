/**
 * Idempotent seed. Safe to re-run: catalog rows are upserted by code/slug.
 * Prices are DEMO placeholders — "Demo market pricing — verify production economics before launch."
 *
 * Does NOT create: real customers, real reviews, production statistics, certifications or ratings.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_SETTINGS } from "../src/lib/settings-schema";
import { BACKINGS, BORDERS, EXTRAS, PATCH_TYPES, PRODUCTS, QUANTITY_TIERS, SIZE_TIERS, seedPriceCents } from "./seed-catalog";
import { ARTICLES, ARTICLE_CATEGORIES, GENERAL_FAQS, PRODUCT_FAQS } from "./seed-content";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

export async function seed(db: PrismaClient = prisma, opts: { sampleContent?: boolean; log?: boolean } = {}) {
  const log = opts.log === false ? () => {} : console.log;
  const sampleContent = opts.sampleContent ?? process.env.NODE_ENV !== "production";

  // ── Tiers
  const sizeTiers = [];
  for (const max of SIZE_TIERS) {
    sizeTiers.push(await db.sizeTier.upsert({ where: { maxSizeIn: max }, create: { maxSizeIn: max, label: `Up to ${max}"` }, update: {} }));
  }
  const qtyTiers = [];
  for (const min of QUANTITY_TIERS) {
    qtyTiers.push(await db.quantityTier.upsert({ where: { minQuantity: min }, create: { minQuantity: min }, update: {} }));
  }
  log(`✓ ${sizeTiers.length} size tiers, ${qtyTiers.length} quantity tiers`);

  // ── Options
  const backingIds: Record<string, string> = {};
  for (const [i, b] of BACKINGS.entries()) {
    const row = await db.backingOption.upsert({ where: { code: b.code }, create: { ...b, sortOrder: i }, update: {} });
    backingIds[b.code] = row.id;
  }
  const borderIds: Record<string, string> = {};
  for (const [i, b] of BORDERS.entries()) {
    const row = await db.borderOption.upsert({ where: { code: b.code }, create: { ...b, allowedShapes: [...b.allowedShapes], sortOrder: i }, update: {} });
    borderIds[b.code] = row.id;
  }
  const extraIds: Record<string, string> = {};
  for (const [i, e] of EXTRAS.entries()) {
    const row = await db.extraOption.upsert({ where: { code: e.code }, create: { ...e, sortOrder: i }, update: {} });
    extraIds[e.code] = row.id;
  }
  log("✓ backings, borders, extras");

  // ── Patch types + compatibility + price matrix
  const patchTypeIds: Record<string, string> = {};
  for (const [i, pt] of PATCH_TYPES.entries()) {
    const { backings, borders, extras, ...data } = pt;
    const row = await db.patchType.upsert({
      where: { code: pt.code },
      create: { ...data, sortOrder: i, imageUrl: null },
      update: {},
    });
    patchTypeIds[pt.code] = row.id;
    for (const c of backings) await db.patchTypeBacking.upsert({ where: { patchTypeId_backingOptionId: { patchTypeId: row.id, backingOptionId: backingIds[c] } }, create: { patchTypeId: row.id, backingOptionId: backingIds[c] }, update: {} });
    for (const c of borders) await db.patchTypeBorder.upsert({ where: { patchTypeId_borderOptionId: { patchTypeId: row.id, borderOptionId: borderIds[c] } }, create: { patchTypeId: row.id, borderOptionId: borderIds[c] }, update: {} });
    for (const c of extras) await db.patchTypeExtra.upsert({ where: { patchTypeId_extraOptionId: { patchTypeId: row.id, extraOptionId: extraIds[c] } }, create: { patchTypeId: row.id, extraOptionId: extraIds[c] }, update: {} });

    const existing = await db.priceMatrix.count({ where: { patchTypeId: row.id } });
    if (existing === 0) {
      const cells = [];
      for (const st of sizeTiers) {
        if (st.maxSizeIn < pt.minSizeIn || st.maxSizeIn > pt.maxSizeIn + 0.001) continue;
        for (const qt of qtyTiers) {
          if (qt.minQuantity < pt.minQuantity) continue;
          cells.push({ patchTypeId: row.id, sizeTierId: st.id, quantityTierId: qt.id, unitPriceCents: seedPriceCents(pt.code, st.maxSizeIn, qt.minQuantity) });
        }
      }
      await db.priceMatrix.createMany({ data: cells });
    }
  }
  log(`✓ ${PATCH_TYPES.length} patch types with demo price matrices`);

  // ── Products (marketing pages)
  const productIds: Record<string, string> = {};
  for (const [i, p] of PRODUCTS.entries()) {
    const { patchTypeCode, ...data } = p;
    const row = await db.product.upsert({
      where: { slug: p.slug },
      create: { ...data, sortOrder: i, patchTypeId: patchTypeCode ? patchTypeIds[patchTypeCode] : null },
      update: {},
    });
    productIds[p.slug] = row.id;
  }
  log(`✓ ${PRODUCTS.length} product pages`);

  // ── FAQs (only when empty, so admin edits are never overwritten)
  if ((await db.fAQ.count()) === 0) {
    await db.fAQ.createMany({
      data: GENERAL_FAQS.map((f, i) => ({ question: f.q, answer: f.a, category: f.category, showOnHome: !!f.home, sortOrder: i })),
    });
    for (const [slug, faqs] of Object.entries(PRODUCT_FAQS)) {
      await db.fAQ.createMany({ data: faqs.map((f, i) => ({ question: f.q, answer: f.a, category: "Product", productId: productIds[slug], sortOrder: i })) });
    }
    log("✓ FAQs");
  }

  // ── Articles
  const catIds: Record<string, string> = {};
  for (const c of ARTICLE_CATEGORIES) catIds[c.slug] = (await db.articleCategory.upsert({ where: { slug: c.slug }, create: c, update: {} })).id;
  for (const [i, a] of ARTICLES.entries()) {
    await db.article.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug, title: a.title, excerpt: a.excerpt, body: a.body, readingMinutes: a.minutes,
        categoryId: catIds[a.category], published: true, publishedAt: new Date(Date.UTC(2026, 0, 5 + i * 3)),
        seoTitle: `${a.title} | Markhor Patches`, seoDescription: a.excerpt,
      },
      update: {},
    });
  }
  log(`✓ ${ARTICLES.length} articles`);

  // ── Settings defaults
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.siteSetting.upsert({ where: { key }, create: { key, value: value as object }, update: {} });
  }
  log("✓ site settings");

  // ── Coupon example (inactive by default)
  await db.coupon.upsert({ where: { code: "WELCOME10" }, create: { code: "WELCOME10", type: "PERCENT", value: 1000, minSubtotalCents: 10000, active: false }, update: {} });

  // ── Development-only placeholder content, clearly labeled
  if (sampleContent) {
    if ((await db.galleryItem.count()) === 0) {
      const g = [
        { title: "Sample — grizzly embroidered patch", img: "bear", type: "EMBROIDERED", industry: "streetwear", shape: "SHIELD", size: '3.5"', backing: "Iron-On", w: 203, h: 245 },
        { title: "Sample — mountain woven patch", img: "explore", type: "WOVEN", industry: "clubs", shape: "CIRCLE", size: '3"', backing: "Hook & Loop", w: 540, h: 540 },
        { title: "Sample — smiley chenille-style patch", img: "smiley", type: "CHENILLE", industry: "events", shape: "CIRCLE", size: '3"', backing: "Iron-On", w: 165, h: 175 },
        { title: "Sample — astronaut woven patch", img: "astronaut", type: "WOVEN", industry: "creators", shape: "CIRCLE", size: '3"', backing: "Sew-On", w: 194, h: 215 },
      ] as const;
      await db.galleryItem.createMany({
        data: g.map((x, i) => ({
          title: x.title, imageUrl: `/placeholders/sample-${x.img}.webp`, alt: `${x.title} (placeholder image)`, width: x.w, height: x.h,
          patchTypeId: patchTypeIds[x.type], industry: x.industry, shape: x.shape, sizeLabel: x.size, backingLabel: x.backing,
          isPlaceholder: true, featured: true, sortOrder: i,
        })),
      });
      log("✓ placeholder gallery (replace before launch)");
    }
    if ((await db.review.count()) === 0) {
      await db.review.createMany({
        data: [
          { customerName: "Sample Reviewer", rating: 5, title: "Sample review — replace before launch", body: "Sample review — replace before launch. This placeholder shows how a real customer review will look once published from the admin panel.", patchTypeId: patchTypeIds.EMBROIDERED, isSample: true, published: true },
          { customerName: "Sample Reviewer", company: "Sample Company", rating: 5, title: "Sample review — replace before launch", body: "Sample review — replace before launch. Real reviews are collected after delivery and only appear once an admin publishes them.", patchTypeId: patchTypeIds.PVC, isSample: true, published: true },
          { customerName: "Sample Reviewer", rating: 4, title: "Sample review — replace before launch", body: "Sample review — replace before launch. Delete these from /admin/reviews before going live.", patchTypeId: patchTypeIds.WOVEN, isSample: true, published: true },
        ],
      });
      log("✓ sample reviews (labeled — replace before launch)");
    }
  }

  // ── Super admin
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.user.upsert({ where: { email }, create: { email, name: "Super Admin", role: "SUPER_ADMIN", passwordHash, emailVerified: new Date() }, update: {} });
    log(`✓ super admin ${email}`);
  }
}

const isDirectRun = process.argv[1]?.endsWith("seed.ts");
if (isDirectRun) {
  seed()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
