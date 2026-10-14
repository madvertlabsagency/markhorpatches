import type { Metadata } from "next";
import { getGalleryItems } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section } from "@/components/ui/Section";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { FinalCTA } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ title: "Custom Patch Gallery | Markhor Patches", description: "Browse custom embroidered, PVC, woven, chenille and leather patches. Filter by patch type, industry and shape.", path: "/gallery" });

export default async function GalleryPage() {
  const items = await getGalleryItems({ take: 200 });
  return (
    <>
      <PageHero eyebrow="Gallery" title={<>Built for <span className="text-gradient">bold brands.</span></>} accent="Your design could be next." crumbs={[{ name: "Gallery", path: "/gallery" }]} />
      <Section tone="light" className="py-16 sm:py-20">
        <Container size="2xl">
          {items.length ? <GalleryGrid items={items} showSearch filters={["patchType", "industry", "shape"]} /> : <EmptyState title="Gallery coming soon." description="We're photographing our latest work." action={<ButtonLink href="/build-your-patch" arrow>Build your patch</ButtonLink>} />}
        </Container>
      </Section>
      <FinalCTA />
    </>
  );
}
