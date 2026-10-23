import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { LEGAL } from "@/content/legal";

const doc = LEGAL["seller-terms"];
export const metadata: Metadata = { title: doc.title, description: doc.summary, alternates: { canonical: "/seller-terms" } };

export default function Page() {
  return <LegalPage doc={doc} />;
}
