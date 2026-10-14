import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = pageMetadata({ title: "Refund & Remake Policy | Markhor Patches", path: "/refund-policy" });

const BODY = `## Our promise
If we manufacture something differently from the production specification you approved, we'll make it right — our mistake, our cost.

## What's covered
Differences between the delivered patches and the approved proof's specification (artwork, size, colors, backing, border, quantity).

## What isn't covered
Errors present in an approved proof, normal manufacturing tolerances, or changes of mind after approval.

## How to request a remake
Contact us within [14] days of delivery with your order number and photos. We'll review and respond within [2] business days.

## Cancellations
Orders can be cancelled for a full refund before proof approval. After approval, production costs may apply.`;

export default function Page() {
  return <LegalPage title="Refund & Remake Policy" path="/refund-policy" updated="October 2, 2026" body={BODY} />;
}
