"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { OrderStatus, Shape } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { assertStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { verifyPayload } from "@/lib/crypto";
import { verifyStoredObject } from "@/lib/uploads";
import { addShipment, OrderError, transitionOrder } from "@/lib/domain/orders";
import { createProofVersion, sendProof, ProofError } from "@/lib/domain/proofs";
import { configurationInclude, describeConfiguration, priceConfiguration } from "@/lib/domain/configurations";
import { invalidateCatalog } from "@/lib/catalog";
import { saveSetting, settingsSchemas, type SettingsKey } from "@/lib/settings";
import { processCrmEvent, processCrmQueue } from "@/lib/services/crm";
import { hashPassword } from "@/lib/auth/password";

const back = (path: string, msg: { ok?: string; error?: string }) => {
  const q = new URLSearchParams(msg as Record<string, string>).toString();
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
};
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const cents = (v: string) => Math.round(Number(v.replace(/[^0-9.\-]/g, "")) * 100);

/* ─────────── Orders ─────────── */

export async function transitionOrderAdmin(fd: FormData) {
  const user = await assertStaff("orders:fulfil").catch(() => assertStaff("orders:write"));
  const orderId = str(fd, "orderId");
  const to = str(fd, "to") as OrderStatus;
  try {
    await transitionOrder(orderId, to, { actorId: user.id, note: str(fd, "note") || undefined });
    await audit(user.id, "order.transition", "Order", orderId, { to });
  } catch (e) {
    if (e instanceof OrderError) back(`/admin/orders/${orderId}`, { error: e.message });
    throw e;
  }
  back(`/admin/orders/${orderId}`, { ok: `Moved to ${to.replace(/_/g, " ").toLowerCase()}.` });
}

export async function addShipmentAdmin(fd: FormData) {
  const user = await assertStaff("orders:fulfil");
  const orderId = str(fd, "orderId");
  const carrier = str(fd, "carrier");
  const trackingNumber = str(fd, "trackingNumber");
  if (!carrier || !trackingNumber) back(`/admin/orders/${orderId}`, { error: "Carrier and tracking number are required." });
  try {
    await addShipment(orderId, { carrier, trackingNumber, service: str(fd, "service"), actorId: user.id });
    await audit(user.id, "order.ship", "Order", orderId, { carrier, trackingNumber });
  } catch (e) {
    if (e instanceof OrderError) back(`/admin/orders/${orderId}`, { error: e.message });
    throw e;
  }
  back(`/admin/orders/${orderId}`, { ok: "Shipment added and customer notified." });
}

export async function saveInternalNotes(fd: FormData) {
  const user = await assertStaff("orders:write");
  const orderId = str(fd, "orderId");
  await prisma.order.update({ where: { id: orderId }, data: { internalNotes: str(fd, "internalNotes").slice(0, 5000) } });
  await audit(user.id, "order.notes", "Order", orderId);
  back(`/admin/orders/${orderId}`, { ok: "Notes saved." });
}

/** Designer finalises the production spec of an order item (before proofing). Re-prices via the engine and updates order totals. */
export async function updateItemSpec(fd: FormData) {
  const user = await assertStaff("proofs:write");
  const itemId = str(fd, "itemId");
  const item = await prisma.orderItem.findUniqueOrThrow({ where: { id: itemId }, include: { order: true, proofs: true, configuration: true } });
  const path = `/admin/orders/${item.orderId}`;
  if (item.order.paymentStatus === "PAID" && item.order.source === "CHECKOUT") back(path, { error: "This item was paid at checkout — its spec can't be re-priced. Add notes for production instead." });
  if (item.proofs.some((p) => p.status === "APPROVED")) back(path, { error: "This item has an approved proof. Specs are locked." });

  const raw = {
    patchTypeId: str(fd, "patchTypeId"), widthIn: str(fd, "widthIn"), heightIn: str(fd, "heightIn"), quantity: str(fd, "quantity"), shape: str(fd, "shape") as Shape,
    backingId: str(fd, "backingId") || null, borderId: str(fd, "borderId") || null, extraIds: fd.getAll("extraIds").map(String), artworkStatus: item.configuration.artworkStatus,
  };
  let priced;
  try {
    priced = await priceConfiguration(raw);
  } catch (e) {
    back(path, { error: e instanceof Error ? e.message : "Invalid spec." });
    return;
  }
  const { input, quote } = priced;
  const config = await prisma.patchConfiguration.update({
    where: { id: item.configurationId },
    data: {
      patchTypeId: input.patchTypeId, widthIn: input.widthIn, heightIn: input.heightIn, quotedSizeIn: quote.line.quotedSizeIn, quantity: input.quantity, shape: input.shape,
      backingOptionId: input.backingId, borderOptionId: input.borderId, unitPriceCents: quote.line.unitPriceCents, subtotalCents: quote.line.lineSubtotalCents, estimatedDeliveryDays: quote.productionDays,
      extras: { deleteMany: {}, create: input.extraIds.map((extraOptionId) => ({ extraOptionId })) },
    },
    include: configurationInclude,
  });
  await prisma.orderItem.update({ where: { id: itemId }, data: { productName: config.patchType.name, quantity: input.quantity, unitPriceCents: quote.line.unitPriceCents, totalCents: quote.line.lineSubtotalCents, specSnapshot: describeConfiguration(config) as object } });
  const items = await prisma.orderItem.findMany({ where: { orderId: item.orderId } });
  const subtotal = items.reduce((s, i) => s + i.totalCents, 0);
  await prisma.order.update({ where: { id: item.orderId }, data: { subtotalCents: subtotal, totalCents: subtotal - item.order.discountCents + item.order.shippingCents + item.order.taxCents } });
  await audit(user.id, "order.item.spec", "OrderItem", itemId, raw);
  back(path, { ok: `Spec saved · ${quote.line.unitPriceCents / 100} USD/ea.` });
}

export async function createProofAdmin(fd: FormData) {
  const user = await assertStaff("proofs:write");
  const itemId = str(fd, "itemId");
  const item = await prisma.orderItem.findUniqueOrThrow({ where: { id: itemId } });
  const path = `/admin/orders/${item.orderId}`;
  const token = verifyPayload<{ key: string; ext: string; mime: string; by: string }>(str(fd, "proofToken"));
  if (!token || token.by !== user.id) back(path, { error: "Upload expired — please upload the proof again." });
  const check = await verifyStoredObject(token!.key, token!.ext, 100 * 1_048_576);
  if (!check.ok) back(path, { error: check.reason });
  try {
    const proof = await createProofVersion({ orderItemId: itemId, fileKey: token!.key, fileMimeType: token!.mime, designerNotes: str(fd, "designerNotes"), uploadedById: user.id, send: fd.get("send") === "on" });
    await audit(user.id, "proof.create", "Proof", proof.id, { version: proof.version, sent: fd.get("send") === "on" });
    back(path, { ok: `Proof V${proof.version} ${fd.get("send") === "on" ? "sent to customer" : "saved as draft"}.` });
  } catch (e) {
    if (e instanceof ProofError || e instanceof OrderError) back(path, { error: e.message });
    throw e;
  }
}

export async function sendProofAdmin(fd: FormData) {
  const user = await assertStaff("proofs:write");
  const proofId = str(fd, "proofId");
  const proof = await prisma.proof.findUniqueOrThrow({ where: { id: proofId }, include: { orderItem: true } });
  try {
    await sendProof(proofId);
    await audit(user.id, "proof.send", "Proof", proofId);
  } catch (e) {
    if (e instanceof ProofError || e instanceof OrderError) back(`/admin/orders/${proof.orderItem.orderId}`, { error: e.message });
    throw e;
  }
  back(`/admin/orders/${proof.orderItem.orderId}`, { ok: `Proof V${proof.version} sent.` });
}

export async function updateMockupStatus(fd: FormData) {
  const user = await assertStaff("mockups:write");
  const id = str(fd, "id");
  const status = z.enum(["NEW", "IN_DESIGN", "PROOF_SENT", "CONVERTED", "CLOSED"]).parse(str(fd, "status"));
  await prisma.mockupRequest.update({ where: { id }, data: { status } });
  await audit(user.id, "mockup.status", "MockupRequest", id, { status });
  back("/admin/mockups", { ok: "Status updated." });
}

/* ─────────── Catalog ─────────── */

export async function updatePatchType(fd: FormData) {
  const user = await assertStaff("catalog:write");
  const id = str(fd, "id");
  const data = {
    name: str(fd, "name"), shortName: str(fd, "shortName"), shortDescription: str(fd, "shortDescription"), bestUse: str(fd, "bestUse"),
    imageUrl: str(fd, "imageUrl") || null, minSizeIn: Number(str(fd, "minSizeIn")), maxSizeIn: Number(str(fd, "maxSizeIn")),
    minQuantity: parseInt(str(fd, "minQuantity")), productionDays: parseInt(str(fd, "productionDays")), rushProductionDays: parseInt(str(fd, "rushProductionDays")),
    active: fd.get("active") === "on", sortOrder: parseInt(str(fd, "sortOrder") || "0"),
    allowedShapes: fd.getAll("allowedShapes").map(String) as Shape[],
  };
  const v = z.object({ name: z.string().min(2), minSizeIn: z.number().positive(), maxSizeIn: z.number().positive(), minQuantity: z.number().int().positive(), productionDays: z.number().int().positive(), rushProductionDays: z.number().int().positive() }).safeParse(data);
  if (!v.success || data.minSizeIn > data.maxSizeIn) back(`/admin/products/${id}`, { error: "Check the numbers — min/max size, quantity and days must be positive." });
  const backings = fd.getAll("backings").map(String);
  const borders = fd.getAll("borders").map(String);
  const extras = fd.getAll("extras").map(String);
  await prisma.$transaction([
    prisma.patchType.update({ where: { id }, data }),
    prisma.patchTypeBacking.deleteMany({ where: { patchTypeId: id } }),
    prisma.patchTypeBacking.createMany({ data: backings.map((backingOptionId) => ({ patchTypeId: id, backingOptionId })) }),
    prisma.patchTypeBorder.deleteMany({ where: { patchTypeId: id } }),
    prisma.patchTypeBorder.createMany({ data: borders.map((borderOptionId) => ({ patchTypeId: id, borderOptionId })) }),
    prisma.patchTypeExtra.deleteMany({ where: { patchTypeId: id } }),
    prisma.patchTypeExtra.createMany({ data: extras.map((extraOptionId) => ({ patchTypeId: id, extraOptionId })) }),
  ]);
  await audit(user.id, "patchType.update", "PatchType", id, { ...data, backings, borders, extras });
  invalidateCatalog();
  back(`/admin/products/${id}`, { ok: "Patch type saved. Live immediately." });
}

export async function updateProductPage(fd: FormData) {
  const user = await assertStaff("catalog:write");
  const id = str(fd, "id");
  const lines = (k: string) => str(fd, k).split("\n").map((s) => s.trim()).filter(Boolean);
  const data = {
    h1: str(fd, "h1"), tagline: str(fd, "tagline") || null, shortDescription: str(fd, "shortDescription"), description: str(fd, "description"),
    bestFor: lines("bestFor"), canReproduce: lines("canReproduce"), highlights: lines("highlights"),
    heroImageUrl: str(fd, "heroImageUrl") || null, videoUrl: str(fd, "videoUrl") || null, videoPosterUrl: str(fd, "videoPosterUrl") || null,
    seoTitle: str(fd, "seoTitle") || null, seoDescription: str(fd, "seoDescription") || null, active: fd.get("active") === "on",
  };
  const p = await prisma.product.update({ where: { id }, data });
  const mediaUrl = str(fd, "mediaUrl");
  if (mediaUrl) await prisma.productMedia.create({ data: { productId: id, url: mediaUrl, alt: str(fd, "mediaAlt") || `${p.name} example`, type: str(fd, "mediaType") === "VIDEO" ? "VIDEO" : "IMAGE", sortOrder: 99 } });
  await audit(user.id, "product.update", "Product", id, data);
  invalidateCatalog();
  back(`/admin/products/${p.patchTypeId ?? ""}`.replace(/\/$/, "") || "/admin/products", { ok: "Product page saved." });
}

export async function deleteProductMedia(fd: FormData) {
  const user = await assertStaff("catalog:write");
  const m = await prisma.productMedia.delete({ where: { id: str(fd, "id") }, include: { product: true } });
  await audit(user.id, "product.media.delete", "ProductMedia", m.id);
  invalidateCatalog();
  back(`/admin/products/${m.product.patchTypeId ?? ""}`, { ok: "Media removed." });
}

export async function createPatchType(fd: FormData) {
  const user = await assertStaff("catalog:write");
  const code = str(fd, "code").toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const name = str(fd, "name");
  const slug = str(fd, "slug").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!code || !name || !slug) back("/admin/products", { error: "Code, name and slug are required." });
  const pt = await prisma.patchType.create({
    data: { code, name, slug, shortName: name.replace(/ Patches$/i, ""), shortDescription: "Describe this patch type.", bestUse: "Describe the best uses.", allowedShapes: ["CIRCLE", "SQUARE", "RECTANGLE", "SHIELD", "OVAL", "CUSTOM"], active: false, sortOrder: 99 },
  });
  await prisma.product.create({ data: { slug, name, h1: `Custom ${name}`, shortDescription: pt.shortDescription, description: pt.shortDescription, patchTypeId: pt.id, active: false } });
  await audit(user.id, "patchType.create", "PatchType", pt.id, { code, name, slug });
  invalidateCatalog();
  back(`/admin/products/${pt.id}`, { ok: "Created (inactive). Add options and prices, then activate." });
}

/* ─────────── Pricing ─────────── */

export async function savePriceMatrix(fd: FormData) {
  const user = await assertStaff("pricing:write");
  const patchTypeId = str(fd, "patchTypeId");
  const changes: { sizeTierId: string; quantityTierId: string; cents: number | null }[] = [];
  for (const [k, v] of fd.entries()) {
    const m = /^cell:([^:]+):([^:]+)$/.exec(k);
    if (!m) continue;
    const raw = String(v).trim();
    changes.push({ sizeTierId: m[1], quantityTierId: m[2], cents: raw === "" ? null : cents(raw) });
  }
  if (changes.some((c) => c.cents !== null && (!Number.isFinite(c.cents) || c.cents <= 0))) back(`/admin/pricing?type=${patchTypeId}`, { error: "Prices must be positive numbers (e.g. 2.95)." });
  await prisma.$transaction(
    changes.map((c) =>
      c.cents === null
        ? prisma.priceMatrix.deleteMany({ where: { patchTypeId, sizeTierId: c.sizeTierId, quantityTierId: c.quantityTierId } })
        : prisma.priceMatrix.upsert({
            where: { patchTypeId_sizeTierId_quantityTierId: { patchTypeId, sizeTierId: c.sizeTierId, quantityTierId: c.quantityTierId } },
            create: { patchTypeId, sizeTierId: c.sizeTierId, quantityTierId: c.quantityTierId, unitPriceCents: c.cents },
            update: { unitPriceCents: c.cents, active: true },
          }),
    ),
  );
  await audit(user.id, "pricing.matrix.save", "PatchType", patchTypeId, { cells: changes.length });
  invalidateCatalog();
  back(`/admin/pricing?type=${patchTypeId}`, { ok: `Saved ${changes.length} prices. Live immediately.` });
}

/** CSV columns: patch_type_code,size_max_in,min_quantity,unit_price_usd[,active] */
export async function importPricingCsv(fd: FormData) {
  const user = await assertStaff("pricing:write");
  const file = fd.get("csv");
  if (!(file instanceof File) || file.size === 0) back("/admin/pricing", { error: "Choose a CSV file." });
  if ((file as File).size > 1_000_000) back("/admin/pricing", { error: "CSV is too large (max 1 MB)." });
  const text = await (file as File).text();
  const rows = text.split(/\r?\n/).map((l) => l.split(",").map((c) => c.trim())).filter((r) => r.length >= 4 && r[0] && !/^patch_type/i.test(r[0]));
  const [types, sizes, qtys] = await Promise.all([prisma.patchType.findMany(), prisma.sizeTier.findMany(), prisma.quantityTier.findMany()]);
  const errors: string[] = [];
  const ops = [];
  for (const [i, r] of rows.entries()) {
    const pt = types.find((t) => t.code === r[0].toUpperCase());
    const st = sizes.find((s) => s.maxSizeIn === Number(r[1]));
    const qt = qtys.find((q) => q.minQuantity === Number(r[2]));
    const c = cents(r[3]);
    if (!pt || !st || !qt || !(c > 0)) {
      errors.push(`Row ${i + 2}: ${r.join(",")}`);
      continue;
    }
    const active = r[4] === undefined || r[4] === "" ? true : /^(1|true|yes)$/i.test(r[4]);
    ops.push(prisma.priceMatrix.upsert({ where: { patchTypeId_sizeTierId_quantityTierId: { patchTypeId: pt.id, sizeTierId: st.id, quantityTierId: qt.id } }, create: { patchTypeId: pt.id, sizeTierId: st.id, quantityTierId: qt.id, unitPriceCents: c, active }, update: { unitPriceCents: c, active } }));
  }
  if (errors.length) back("/admin/pricing", { error: `Nothing imported — fix ${errors.length} row(s): ${errors.slice(0, 3).join(" | ")}. Size and quantity must match existing tiers.` });
  await prisma.$transaction(ops);
  await audit(user.id, "pricing.csv.import", "PriceMatrix", null, { rows: ops.length });
  invalidateCatalog();
  back("/admin/pricing", { ok: `Imported ${ops.length} prices.` });
}

export async function addTier(fd: FormData) {
  const user = await assertStaff("pricing:write");
  const kind = str(fd, "kind");
  const value = Number(str(fd, "value"));
  if (!(value > 0)) back("/admin/pricing", { error: "Enter a positive value." });
  if (kind === "size") await prisma.sizeTier.upsert({ where: { maxSizeIn: value }, create: { maxSizeIn: value, label: `Up to ${value}"` }, update: { active: true } });
  else await prisma.quantityTier.upsert({ where: { minQuantity: Math.round(value) }, create: { minQuantity: Math.round(value) }, update: { active: true } });
  await audit(user.id, "pricing.tier.add", kind === "size" ? "SizeTier" : "QuantityTier", null, { value });
  invalidateCatalog();
  back("/admin/pricing", { ok: "Tier added. Fill in prices for it in each matrix." });
}

export async function toggleTier(fd: FormData) {
  const user = await assertStaff("pricing:write");
  const id = str(fd, "id");
  const active = fd.get("active") === "1";
  if (str(fd, "kind") === "size") await prisma.sizeTier.update({ where: { id }, data: { active } });
  else await prisma.quantityTier.update({ where: { id }, data: { active } });
  await audit(user.id, "pricing.tier.toggle", "Tier", id, { active });
  invalidateCatalog();
  back("/admin/pricing", { ok: active ? "Tier activated." : "Tier deactivated." });
}

export async function saveOption(fd: FormData) {
  const user = await assertStaff("pricing:write");
  const kind = z.enum(["backing", "border", "extra"]).parse(str(fd, "kind"));
  const id = str(fd, "id");
  const modifierType = z.enum(["FIXED", "PER_UNIT", "PERCENT"]).parse(str(fd, "modifierType"));
  const rawValue = str(fd, "modifierValue");
  const modifierValue = modifierType === "PERCENT" ? Math.round(Number(rawValue) * 100) : cents(rawValue || "0");
  if (!Number.isFinite(modifierValue) || modifierValue < 0) back("/admin/pricing#options", { error: "Modifier must be zero or more." });
  const data = { name: str(fd, "name"), description: str(fd, "description"), modifierType, modifierValue, active: fd.get("active") === "on" };
  if (kind === "backing") await prisma.backingOption.update({ where: { id }, data });
  if (kind === "border") await prisma.borderOption.update({ where: { id }, data: { ...data, allowedShapes: fd.getAll("allowedShapes").map(String) as Shape[] } });
  if (kind === "extra") await prisma.extraOption.update({ where: { id }, data });
  await audit(user.id, "pricing.option.save", kind, id, data);
  invalidateCatalog();
  back("/admin/pricing#options", { ok: `${data.name} saved.` });
}

/* ─────────── Content ─────────── */

export async function saveReview(fd: FormData) {
  const user = await assertStaff("reviews:write");
  const id = str(fd, "id");
  if (fd.get("delete") === "1") {
    await prisma.review.delete({ where: { id } });
    await audit(user.id, "review.delete", "Review", id);
  } else if (id) {
    await prisma.review.update({ where: { id }, data: { published: fd.get("published") === "on", verified: fd.get("verified") === "on" } });
    await audit(user.id, "review.update", "Review", id, { published: fd.get("published") === "on" });
  } else {
    const d = z.object({ customerName: z.string().min(1), company: z.string(), rating: z.coerce.number().int().min(1).max(5), title: z.string(), body: z.string().min(5) }).parse(Object.fromEntries(fd.entries()));
    const r = await prisma.review.create({ data: { ...d, company: d.company || null, title: d.title || null, photoUrl: str(fd, "photoUrl") || null, published: fd.get("published") === "on", verified: false } });
    await audit(user.id, "review.create", "Review", r.id);
  }
  revalidateTag("reviews", "max");
  back("/admin/reviews", { ok: "Reviews updated." });
}

export async function saveGalleryItem(fd: FormData) {
  const user = await assertStaff("gallery:write");
  const id = str(fd, "id");
  if (fd.get("delete") === "1") {
    await prisma.galleryItem.delete({ where: { id } });
    await audit(user.id, "gallery.delete", "GalleryItem", id);
  } else {
    const data = {
      title: str(fd, "title"), imageUrl: str(fd, "imageUrl"), alt: str(fd, "alt") || str(fd, "title"), width: parseInt(str(fd, "width") || "800"), height: parseInt(str(fd, "height") || "800"),
      patchTypeId: str(fd, "patchTypeId") || null, industry: str(fd, "industry") || null, shape: (str(fd, "shape") || null) as Shape | null, sizeLabel: str(fd, "sizeLabel") || null,
      backingLabel: str(fd, "backingLabel") || null, published: fd.get("published") === "on", featured: fd.get("featured") === "on", isPlaceholder: fd.get("isPlaceholder") === "on",
    };
    if (!data.title || !/^(https:\/\/|\/)/.test(data.imageUrl)) back("/admin/gallery", { error: "Title and an image URL (https:// or /path) are required." });
    if (id) await prisma.galleryItem.update({ where: { id }, data });
    else await prisma.galleryItem.create({ data });
    await audit(user.id, id ? "gallery.update" : "gallery.create", "GalleryItem", id || null, data);
  }
  revalidateTag("gallery", "max");
  back("/admin/gallery", { ok: "Gallery updated." });
}

export async function saveFaq(fd: FormData) {
  const user = await assertStaff("content:write");
  const id = str(fd, "id");
  if (fd.get("delete") === "1") await prisma.fAQ.delete({ where: { id } });
  else {
    const data = { question: str(fd, "question"), answer: str(fd, "answer"), category: str(fd, "category") || "General", productId: str(fd, "productId") || null, showOnHome: fd.get("showOnHome") === "on", published: fd.get("published") === "on", sortOrder: parseInt(str(fd, "sortOrder") || "0") };
    if (!data.question || !data.answer) back("/admin/content", { error: "Question and answer are required." });
    if (id) await prisma.fAQ.update({ where: { id }, data });
    else await prisma.fAQ.create({ data });
  }
  await audit(user.id, "faq.save", "FAQ", id || null);
  revalidateTag("content", "max");
  back("/admin/content", { ok: "FAQs updated." });
}

export async function saveArticle(fd: FormData) {
  const user = await assertStaff("content:write");
  const id = str(fd, "id");
  const data = {
    title: str(fd, "title"), slug: str(fd, "slug").toLowerCase().replace(/[^a-z0-9-]/g, "-"), excerpt: str(fd, "excerpt"), body: String(fd.get("body") ?? ""),
    coverImageUrl: str(fd, "coverImageUrl") || null, readingMinutes: parseInt(str(fd, "readingMinutes") || "5"), seoTitle: str(fd, "seoTitle") || null, seoDescription: str(fd, "seoDescription") || null,
    published: fd.get("published") === "on", categoryId: str(fd, "categoryId") || null,
  };
  if (!data.title || !data.slug || !data.excerpt) back("/admin/content", { error: "Title, slug and excerpt are required." });
  const existing = id ? await prisma.article.findUnique({ where: { id } }) : null;
  const publishedAt = data.published ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null;
  const a = id ? await prisma.article.update({ where: { id }, data: { ...data, publishedAt } }) : await prisma.article.create({ data: { ...data, publishedAt } });
  await audit(user.id, "article.save", "Article", a.id);
  revalidateTag("content", "max");
  back(`/admin/content?article=${a.id}`, { ok: "Article saved." });
}

export async function saveCoupon(fd: FormData) {
  const user = await assertStaff("coupons:write");
  const id = str(fd, "id");
  if (fd.get("delete") === "1") {
    await prisma.coupon.delete({ where: { id } });
  } else {
    const type = z.enum(["PERCENT", "FIXED"]).parse(str(fd, "type"));
    const value = type === "PERCENT" ? Math.round(Number(str(fd, "value")) * 100) : cents(str(fd, "value"));
    const data = {
      code: str(fd, "code").toUpperCase(), type, value, minSubtotalCents: cents(str(fd, "minSubtotal") || "0"), maxRedemptions: str(fd, "maxRedemptions") ? parseInt(str(fd, "maxRedemptions")) : null,
      startsAt: str(fd, "startsAt") ? new Date(str(fd, "startsAt")) : null, endsAt: str(fd, "endsAt") ? new Date(str(fd, "endsAt")) : null, active: fd.get("active") === "on",
    };
    if (!/^[A-Z0-9_-]{3,30}$/.test(data.code) || !(value > 0)) back("/admin/coupons", { error: "Code (3–30 letters/numbers) and a positive value are required." });
    if (id) await prisma.coupon.update({ where: { id }, data });
    else await prisma.coupon.create({ data });
  }
  await audit(user.id, "coupon.save", "Coupon", id || null);
  back("/admin/coupons", { ok: "Coupons updated." });
}

/* ─────────── Settings & integrations ─────────── */

export async function saveSettingsAdmin(fd: FormData) {
  const user = await assertStaff("settings:write");
  const key = str(fd, "key") as SettingsKey;
  if (!(key in settingsSchemas)) back("/admin/settings", { error: "Unknown setting." });
  let value: unknown;
  try {
    value = JSON.parse(String(fd.get("value") ?? "{}"));
  } catch {
    back(`/admin/settings#${key}`, { error: "Invalid JSON." });
  }
  const parsed = settingsSchemas[key].safeParse(value);
  if (!parsed.success) back(`/admin/settings#${key}`, { error: `${key}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}` });
  await saveSetting(key, parsed.data as never);
  await audit(user.id, "settings.save", "SiteSetting", key, parsed.data);
  revalidatePath("/", "layout");
  back(`/admin/settings#${key}`, { ok: `${key} saved.` });
}

export async function retryCrmAdmin(fd: FormData) {
  const user = await assertStaff("integrations:read");
  const id = str(fd, "id");
  if (id) {
    await prisma.cRMEvent.update({ where: { id }, data: { status: "PENDING", nextAttemptAt: new Date() } });
    await processCrmEvent(id);
  } else await processCrmQueue();
  await audit(user.id, "crm.retry", "CRMEvent", id || null);
  back("/admin/integrations", { ok: "Retry attempted." });
}

export async function saveStaffUser(fd: FormData) {
  const user = await assertStaff("users:write");
  const email = str(fd, "email").toLowerCase();
  const role = z.enum(["SUPER_ADMIN", "ADMIN", "DESIGNER", "SUPPORT", "FULFILLMENT", "CUSTOMER"]).parse(str(fd, "role"));
  const password = str(fd, "password");
  if (!z.string().email().safeParse(email).success) back("/admin/settings#staff", { error: "Valid email required." });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) await prisma.user.update({ where: { email }, data: { role, disabled: fd.get("disabled") === "on", ...(password ? { passwordHash: await hashPassword(password) } : {}) } });
  else {
    if (password.length < 10) back("/admin/settings#staff", { error: "New staff need a password of at least 10 characters." });
    await prisma.user.create({ data: { email, role, name: str(fd, "name") || null, passwordHash: await hashPassword(password), emailVerified: new Date() } });
  }
  await audit(user.id, "staff.save", "User", email, { role });
  back("/admin/settings#staff", { ok: "Staff saved." });
}
