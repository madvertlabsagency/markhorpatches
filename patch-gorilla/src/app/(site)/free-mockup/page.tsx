import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { ownerContext } from "@/lib/cart-session";
import { storage } from "@/lib/services/storage";
import { ARTWORK_TYPES } from "@/lib/services/storage/validation";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/Section";
import { MockupForm } from "@/components/forms/MockupForm";
import { Crown, BrushUnderline } from "@/components/brand/marks";
import { StickerBadge } from "@/components/brand/StickerBadge";

export const metadata: Metadata = pageMetadata({ title: "Get a Free Custom Patch Mockup | Patch Gorilla", description: "Upload your artwork and get a free digital patch mockup. No payment, no obligation — nothing goes into production until you approve it.", path: "/free-mockup" });

export default async function FreeMockupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [{ catalog }, settings] = await Promise.all([getCatalog(), getSettings()]);
  let artwork = null;
  if (sp.artwork) {
    const owner = await ownerContext();
    const f = await prisma.artworkFile.findUnique({ where: { id: sp.artwork } });
    if (f && f.status === "UPLOADED" && ((owner.anonOwnerId && f.anonOwnerId === owner.anonOwnerId) || (owner.customerId && f.customerId === owner.customerId))) {
      artwork = { id: f.id, filename: f.originalFilename, sizeBytes: f.sizeBytes, previewUrl: ARTWORK_TYPES[f.extension]?.previewable ? await storage().getDownloadUrl(f.storageKey, { inline: true, expiresIn: 3600 }) : null };
    }
  }
  const promise = settings.promises.mockup24HourPromise;
  return (
    <section data-header-theme="dark" className="theme-dark relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--header-h)+2.5rem)]">
      <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="pointer-events-none absolute -left-40 top-40 h-[480px] w-[480px] rounded-full bg-patch/30 blur-[140px]" aria-hidden />
      <Container size="2xl" className="relative">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="mb-4 flex items-center gap-3"><Crown className="h-6 text-turquoise" /><span className="eyebrow text-white/70">Free mockup</span></div>
            <h1 className="display text-[clamp(3rem,8vw,6rem)]">See it <span className="text-gradient">before</span> you buy it.</h1>
            <BrushUnderline className="mt-1 h-4 w-64" />
            <p className="mt-6 max-w-lg text-lg text-white/75">Send your artwork. Our designers create a digital mockup of your patch — free, with no obligation.</p>
            <ul className="mt-8 space-y-3">
              {[promise ? "Get your digital mockup within 24 hours" : "A real designer prepares your mockup", "Free artwork clean-up", "Transparent price with your mockup", "No payment details needed"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-white/85"><span className="grid h-7 w-7 place-items-center rounded-full bg-turquoise/15 text-turquoise"><Check className="h-4 w-4" aria-hidden /></span>{t}</li>
              ))}
            </ul>
            <StickerBadge variant="tape" rotate={-4} className="mt-10 text-lg">Not production-ready? That&apos;s our problem.</StickerBadge>
          </div>
          <div className="rounded-[2rem] bg-white p-6 text-navy shadow-2xl sm:p-10">
            <MockupForm patchTypes={catalog.patchTypes.map((p) => ({ id: p.id, name: p.name }))} maxUploadMb={settings.uploads.maxUploadMb} defaults={{ type: sp.type, size: sp.size?.replace("x", " x "), qty: sp.qty, notes: sp.notes, artwork }} />
          </div>
        </div>
      </Container>
    </section>
  );
}
