import "server-only";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { getCatalogFresh } from "@/lib/catalog";
import { quoteConfiguration } from "@/lib/pricing/quote";
import { configurationInclude, createConfiguration, cloneConfiguration, describeConfiguration, type FullConfiguration } from "./configurations";

export async function findCartByToken(token: string | undefined | null) {
  if (!token) return null;
  return prisma.cart.findUnique({ where: { tokenHash: sha256(token) } });
}

export async function createCart(customerId?: string | null) {
  const token = randomToken();
  const cart = await prisma.cart.create({ data: { tokenHash: sha256(token), customerId: customerId ?? null } });
  return { cart, token };
}

export interface Owner {
  customerId?: string | null;
  anonOwnerId?: string | null;
}

export async function addToCart(cartId: string, rawConfig: unknown, owner: Owner) {
  return prisma.$transaction(async (tx) => {
    const config = await createConfiguration(rawConfig, owner, tx);
    return tx.cartItem.create({
      data: { cartId, configurationId: config.id, unitPriceSnapshotCents: config.unitPriceCents ?? 0, totalSnapshotCents: config.subtotalCents ?? 0 },
    });
  });
}

async function ownedItem(cartId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
  if (!item) throw new Error("Cart item not found");
  return item;
}

export async function updateCartItem(cartId: string, itemId: string, rawConfig: unknown, owner: Owner) {
  const item = await ownedItem(cartId, itemId);
  return prisma.$transaction(async (tx) => {
    const config = await createConfiguration(rawConfig, owner, tx);
    await tx.cartItem.update({
      where: { id: item.id },
      data: { configurationId: config.id, unitPriceSnapshotCents: config.unitPriceCents ?? 0, totalSnapshotCents: config.subtotalCents ?? 0 },
    });
    await tx.patchConfiguration.deleteMany({ where: { id: item.configurationId, orderItems: { none: {} }, quoteItems: { none: {} }, isSaved: false } });
    return config;
  });
}

export async function duplicateCartItem(cartId: string, itemId: string) {
  const item = await ownedItem(cartId, itemId);
  return prisma.$transaction(async (tx) => {
    const clone = await cloneConfiguration(item.configurationId, { isSaved: false }, tx);
    return tx.cartItem.create({ data: { cartId, configurationId: clone.id, unitPriceSnapshotCents: item.unitPriceSnapshotCents, totalSnapshotCents: item.totalSnapshotCents } });
  });
}

export async function removeCartItem(cartId: string, itemId: string) {
  const item = await ownedItem(cartId, itemId);
  await prisma.cartItem.delete({ where: { id: item.id } });
  await prisma.patchConfiguration.deleteMany({ where: { id: item.configurationId, orderItems: { none: {} }, quoteItems: { none: {} }, isSaved: false } });
}

export async function setSavedForLater(cartId: string, itemId: string, saved: boolean) {
  const item = await ownedItem(cartId, itemId);
  await prisma.cartItem.update({ where: { id: item.id }, data: { savedForLater: saved } });
}

export interface CartLine {
  id: string;
  configurationId: string;
  savedForLater: boolean;
  config: FullConfiguration;
  description: ReturnType<typeof describeConfiguration>;
  unitPriceCents: number;
  totalCents: number;
  priceChanged: boolean;
  invalidReason: string | null;
}

/** Loads the cart and RE-PRICES every line against the live catalog. */
export async function loadCart(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { orderBy: { createdAt: "asc" }, include: { configuration: { include: configurationInclude } } } },
  });
  if (!cart) return null;
  const { catalog, tables } = await getCatalogFresh();

  const lines: CartLine[] = [];
  for (const item of cart.items) {
    const c = item.configuration;
    const q = quoteConfiguration(catalog, tables, {
      patchTypeId: c.patchTypeId, widthIn: c.widthIn, heightIn: c.heightIn, quantity: c.quantity, shape: c.shape,
      backingId: c.backingOptionId, borderId: c.borderOptionId, extraIds: c.extras.map((e) => e.extraOptionId),
    });
    const unit = q.ok ? q.line.unitPriceCents : item.unitPriceSnapshotCents;
    const total = q.ok ? q.line.lineSubtotalCents : item.totalSnapshotCents;
    const changed = q.ok && total !== item.totalSnapshotCents;
    if (changed) await prisma.cartItem.update({ where: { id: item.id }, data: { unitPriceSnapshotCents: unit, totalSnapshotCents: total } });
    lines.push({
      id: item.id, configurationId: c.id, savedForLater: item.savedForLater, config: c, description: describeConfiguration(c),
      unitPriceCents: unit, totalCents: total, priceChanged: changed,
      invalidReason: q.ok ? null : q.pricingError ?? q.violations.map((v) => v.message).join(" "),
    });
  }
  const active = lines.filter((l) => !l.savedForLater);
  return {
    cart,
    lines,
    activeLines: active,
    savedLines: lines.filter((l) => l.savedForLater),
    subtotalCents: active.reduce((s, l) => s + l.totalCents, 0),
    itemCount: active.length,
    hasInvalid: active.some((l) => l.invalidReason),
  };
}

export type LoadedCart = NonNullable<Awaited<ReturnType<typeof loadCart>>>;

export async function cartItemCount(cartId: string) {
  return prisma.cartItem.count({ where: { cartId, savedForLater: false } });
}

/** Merge an anonymous cart into a signed-in customer's cart. */
export async function attachCartToCustomer(cartId: string, customerId: string) {
  await prisma.cart.update({ where: { id: cartId }, data: { customerId } });
  await prisma.artworkFile.updateMany({ where: { anonOwnerId: cartId, customerId: null }, data: { customerId } });
}
