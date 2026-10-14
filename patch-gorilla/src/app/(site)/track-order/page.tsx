import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/forms/AuthShell";
import { TrackForm } from "@/components/forms/TrackForm";

export const metadata: Metadata = pageMetadata({ title: "Track Your Order | Markhor Patches", description: "Track your custom patch order: proof status, production, quality check and shipping.", path: "/track-order" });

export default function TrackOrderPage() {
  return (
    <AuthShell title="Track your order." sub="Order received → Artwork review → Proof → Approved → Production → Quality check → Shipped → Delivered.">
      <TrackForm />
    </AuthShell>
  );
}
