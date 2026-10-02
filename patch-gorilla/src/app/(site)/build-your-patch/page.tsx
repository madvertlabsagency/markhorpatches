import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { currentCart } from "@/lib/cart-session";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/lib/services/storage";
import { ARTWORK_TYPES } from "@/lib/services/storage/validation";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/Section";
import { Crown } from "@/components/brand/marks";
import { PatchConfigurator, type ConfiguratorProps } from "@/components/configurator/PatchConfigurator";
import type { Shape } from "@/generated/prisma/enums";

export const metadata: Metadata = pageMetadata({
  title: "Build Your Custom Patch — Instant Pricing | Patch Gorilla",
  description: "Design your custom patch in minutes: choose type, size, quantity, shape, backing and extras with live pricing. Free digital proof before production.",
  path: "/build-your-patch",
});

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : undefined);

export default async function BuildYourPatchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [{ catalog, tables }, settings] = await Promise.all([getCatalog(), getSettings()]);

  let initial: ConfiguratorProps["initial"] = {};
  let initialArtwork: ConfiguratorProps["initialArtwork"] = null;

  // Edit an existing cart item (only from the visitor's own cart), or load a saved design
  const edit = one(sp.edit);
  const savedId = one(sp.saved);
  const editItem = edit ? await loadCartItem(edit) : null;
  const editItemId: string | null = editItem?.id ?? null;
  const source = editItem ? editItem.configuration : savedId ? await loadSavedDesign(savedId) : null;

  if (source) {
    initial = {
      patchTypeId: source.patchTypeId, widthIn: source.widthIn, heightIn: source.heightIn, quantity: source.quantity, shape: source.shape,
      backingId: source.backingOptionId, borderId: source.borderOptionId, extraIds: source.extras.map((e) => e.extraOptionId),
      artworkStatus: source.artworkStatus, notes: source.notes ?? "",
    };
    if (source.artworkFile && source.artworkFile.status === "UPLOADED") {
      const f = source.artworkFile;
      initialArtwork = { id: f.id, filename: f.originalFilename, sizeBytes: f.sizeBytes, previewUrl: ARTWORK_TYPES[f.extension]?.previewable ? await storage().getDownloadUrl(f.storageKey, { inline: true, expiresIn: 3600 }) : null };
    }
  } else {
    const typeParam = one(sp.type)?.toUpperCase();
    const pt = catalog.patchTypes.find((p) => p.code === typeParam || p.id === one(sp.type));
    const size = num(one(sp.size));
    const backing = one(sp.backing);
    initial = {
      patchTypeId: pt?.id ?? null,
      widthIn: num(one(sp.w)) ?? size ?? 3,
      heightIn: num(one(sp.h)) ?? size ?? 3,
      quantity: Math.round(num(one(sp.qty)) ?? 100),
      shape: (one(sp.shape)?.toUpperCase() as Shape | undefined) ?? null,
      backingId: backing && catalog.backings.some((b) => b.id === backing) ? backing : null,
      notes: one(sp.name) ? "Name patches — please list each name below:\n" : "",
    };
  }

  return (
    <section data-header-theme="light" className="min-h-screen bg-offwhite pb-16 pt-[calc(var(--header-h)+1.5rem)]">
      <Container size="2xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2"><Crown className="h-5 text-electric" /><span className="eyebrow text-slate">Patch builder</span></div>
            <h1 className="display text-[clamp(2.6rem,6vw,4.5rem)]">{editItemId ? "Edit your patch." : <>Make it <span className="text-gradient">yours.</span></>}</h1>
          </div>
          <p className="max-w-sm text-sm text-slate">Live pricing from our real price list. Nothing goes into production until you approve a proof.</p>
        </div>
        <PatchConfigurator
          catalog={catalog}
          tables={tables}
          maxUploadMb={settings.uploads.maxUploadMb}
          transit={{ min: settings.shipping.standardTransitMin, max: settings.shipping.standardTransitMax }}
          whatsappNumber={settings.brand.whatsappNumber}
          initial={initial}
          initialArtwork={initialArtwork}
          editItemId={editItemId}
          initialStep={source ? "review" : undefined}
        />
      </Container>
    </section>
  );
}

async function loadCartItem(id: string) {
  const cart = await currentCart();
  if (!cart) return null;
  return prisma.cartItem.findFirst({ where: { id, cartId: cart.id }, include: { configuration: { include: { extras: true, artworkFile: true } } } });
}

async function loadSavedDesign(id: string) {
  const user = await getCurrentUser();
  if (!user?.customer) return null;
  return prisma.patchConfiguration.findFirst({ where: { id, customerId: user.customer.id, isSaved: true }, include: { extras: true, artworkFile: true } });
}
