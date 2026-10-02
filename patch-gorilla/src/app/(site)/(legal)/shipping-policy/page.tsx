import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = pageMetadata({ title: "Shipping Policy | Patch Gorilla", path: "/shipping-policy" });

const BODY = `## Where we ship
We ship across the United States. Contact us about international orders.

## Timelines
Production times start after proof approval and vary by patch type (shown in the builder). Shipping transit times are shown at checkout.

## Tracking
Every order ships with tracking. You'll receive the tracking link by email and on your order page.

## Lost or damaged packages
Contact us within [7] days of the expected delivery date and we'll help resolve it with the carrier.`;

export default function Page() {
  return <LegalPage title="Shipping Policy" path="/shipping-policy" updated="October 2, 2026" body={BODY} />;
}
