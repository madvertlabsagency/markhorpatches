import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card } from "@/components/ui/primitives";
import { AssistantChat } from "@/components/admin/AssistantChat";
import { aiProviderName } from "@/lib/services/ai";

export const metadata: Metadata = { title: "AI assistant" };

export default async function AssistantPage() {
  await requireAdmin("analytics:view");
  return (
    <>
      <PageHeader title="AI admin assistant" description={`Answers are computed from live data by fixed, read-only queries. Provider: ${aiProviderName() === "anthropic" ? "Claude (phrasing only)" : "rules (no external AI)"}. Demo data excluded.`} />
      <Card className="max-w-3xl p-5"><AssistantChat /></Card>
    </>
  );
}
