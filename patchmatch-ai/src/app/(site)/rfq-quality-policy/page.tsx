import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { LEGAL } from "@/content/legal";

const doc = LEGAL["rfq-quality-policy"];
export const metadata: Metadata = { title: doc.title, description: doc.summary, alternates: { canonical: "/rfq-quality-policy" } };

export default function Page() {
  return <LegalPage doc={doc} />;
}
