import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/primitives";
import { PortfolioManager } from "@/components/seller/PortfolioManager";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const { seller } = await requireSeller("/seller/portfolio");
  const items = await prisma.sellerPortfolioItem.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Portfolio" description="Photos of real patches you've produced. Public items appear on your profile once you're verified. Metadata is stripped from previews." />
      <PortfolioManager items={items.map((i) => ({ id: i.id, title: i.title, isPublic: i.isPublic, attachmentId: i.attachmentId, patchType: i.patchType }))} />
    </>
  );
}
