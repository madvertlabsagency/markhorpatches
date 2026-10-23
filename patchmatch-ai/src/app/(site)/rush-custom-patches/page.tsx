import type { Metadata } from "next";
import { LandingTemplate } from "@/components/marketing/LandingTemplate";
import { CAMPAIGN_PAGES } from "@/content/landing";

const c = CAMPAIGN_PAGES["rush-custom-patches"];
export const metadata: Metadata = { title: c.metaTitle, description: c.description, alternates: { canonical: "/rush-custom-patches" } };

export default function Page() {
  return <LandingTemplate c={c} />;
}
