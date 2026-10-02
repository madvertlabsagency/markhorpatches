import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getCatalogFresh, type CatalogBundle } from "@/lib/catalog";
import { quoteConfiguration } from "@/lib/pricing/quote";
import { configurationInput, type ConfigurationInput } from "@/lib/configurator/schema";
import { formatInches } from "@/lib/utils";
import { titleShape } from "@/lib/configurator/rules";

export class ConfigurationError extends Error {
  constructor(message: string, public fields: string[] = []) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/** Validates + prices a configuration on the server. Throws ConfigurationError on any rule violation. */
export async function priceConfiguration(raw: unknown, bundle?: CatalogBundle) {
  const input = configurationInput.parse(raw);
  const { catalog, tables } = bundle ?? (await getCatalogFresh());
  const result = quoteConfiguration(catalog, tables, {
    patchTypeId: input.patchTypeId, widthIn: input.widthIn, heightIn: input.heightIn, quantity: input.quantity,
    shape: input.shape, backingId: input.backingId, borderId: input.borderId, extraIds: input.extraIds,
  });
  if (!result.ok) throw new ConfigurationError(result.pricingError ?? result.violations.map((v) => v.message).join(" "), result.violations.map((v) => v.field));
  return { input, quote: result, catalog };
}

export async function createConfiguration(
  raw: unknown,
  owner: { customerId?: string | null; anonOwnerId?: string | null },
  tx: Prisma.TransactionClient = prisma,
) {
  const { input, quote } = await priceConfiguration(raw);
  const artworkFileId = await resolveArtwork(input, owner, tx);
  return tx.patchConfiguration.create({
    data: {
      patchTypeId: input.patchTypeId, widthIn: input.widthIn, heightIn: input.heightIn, quotedSizeIn: quote.line.quotedSizeIn,
      quantity: input.quantity, shape: input.shape, backingOptionId: input.backingId, borderOptionId: input.borderId,
      artworkStatus: artworkFileId ? "UPLOADED" : input.artworkStatus === "UPLOADED" ? "SEND_LATER" : input.artworkStatus,
      artworkFileId, notes: input.notes || null, name: input.name || null, customerId: owner.customerId ?? null,
      unitPriceCents: quote.line.unitPriceCents, subtotalCents: quote.line.lineSubtotalCents, estimatedDeliveryDays: quote.productionDays,
      extras: { create: input.extraIds.map((extraOptionId) => ({ extraOptionId })) },
    },
  });
}

/** Artwork can only be attached by its owner (customer or same anonymous browser). */
async function resolveArtwork(input: ConfigurationInput, owner: { customerId?: string | null; anonOwnerId?: string | null }, tx: Prisma.TransactionClient) {
  if (!input.artworkFileId) return null;
  const file = await tx.artworkFile.findUnique({ where: { id: input.artworkFileId } });
  if (!file || file.status !== "UPLOADED") return null;
  const owns = (owner.customerId && file.customerId === owner.customerId) || (owner.anonOwnerId && file.anonOwnerId === owner.anonOwnerId);
  return owns ? file.id : null;
}

export const configurationInclude = {
  patchType: true,
  backingOption: true,
  borderOption: true,
  artworkFile: true,
  extras: { include: { extraOption: true } },
} satisfies Prisma.PatchConfigurationInclude;

export type FullConfiguration = Prisma.PatchConfigurationGetPayload<{ include: typeof configurationInclude }>;

export function describeConfiguration(c: FullConfiguration) {
  const extras = c.extras.map((e) => e.extraOption.name);
  return {
    patchType: c.patchType.name,
    size: `${formatInches(c.widthIn)} × ${formatInches(c.heightIn)}`,
    quotedSize: formatInches(c.quotedSizeIn),
    quantity: c.quantity,
    shape: titleShape(c.shape),
    backing: c.backingOption?.name ?? "—",
    border: c.borderOption?.name ?? (c.patchType.code === "PVC" ? "Molded edge" : "—"),
    extras,
    artwork: c.artworkFile?.originalFilename ?? (c.artworkStatus === "NEEDS_DESIGN_HELP" ? "Design help requested" : "Sending later"),
    notes: c.notes ?? "",
  };
}

export function specLine(c: FullConfiguration) {
  const d = describeConfiguration(c);
  return [d.size, d.shape, d.backing, d.border !== "—" ? d.border : null, ...d.extras].filter(Boolean).join(" · ");
}

/** Configs referenced by an order are immutable: editing clones them. */
export async function cloneConfiguration(id: string, overrides: Partial<Prisma.PatchConfigurationUncheckedCreateInput> = {}, tx: Prisma.TransactionClient = prisma) {
  const c = await tx.patchConfiguration.findUniqueOrThrow({ where: { id }, include: { extras: true } });
  const { id: _id, createdAt: _c, updatedAt: _u, extras, ...rest } = c;
  void _id; void _c; void _u;
  return tx.patchConfiguration.create({ data: { ...rest, ...overrides, extras: { create: extras.map((e) => ({ extraOptionId: e.extraOptionId })) } } });
}
