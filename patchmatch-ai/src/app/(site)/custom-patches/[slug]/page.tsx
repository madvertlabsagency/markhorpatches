import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingTemplate } from "@/components/marketing/LandingTemplate";
import { USE_CASES } from "@/content/landing";

export const dynamicParams = false;
export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = USE_CASES.find((u) => u.slug === slug);
  return c ? { title: c.metaTitle, description: c.description, alternates: { canonical: `/custom-patches/${c.slug}` } } : {};
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = USE_CASES.find((u) => u.slug === slug);
  if (!c) notFound();
  return <LandingTemplate c={c} />;
}
