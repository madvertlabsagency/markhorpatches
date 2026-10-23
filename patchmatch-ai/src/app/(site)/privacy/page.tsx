import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { LEGAL } from "@/content/legal";

const doc = LEGAL["privacy"];
export const metadata: Metadata = { title: doc.title, description: doc.summary, alternates: { canonical: "/privacy" } };

export default function Page() {
  return <LegalPage doc={doc} />;
}
