import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = pageMetadata({ title: "Terms of Service | Patch Gorilla", path: "/terms" });

const BODY = `## Orders and proofs
Every order includes a digital proof. Production begins only after you approve the proof. Please check artwork, dimensions, colors, spelling and specifications carefully.

## Artwork rights
You confirm you have the right to use any artwork you submit. We may decline designs that infringe third-party rights or are unlawful.

## Pricing
Prices shown in the builder are calculated from our current price list. The final price is confirmed at checkout. Shipping and applicable taxes are added at checkout.

## Color and size tolerances
Thread, PVC and print colors are matched as closely as possible. Minor variations in color and size are normal in manufacturing.

## Liability
To the extent permitted by law, our liability is limited to the amount paid for the affected order.

## Contact
[Company legal name], [address], [support email].`;

export default function Page() {
  return <LegalPage title="Terms of Service" path="/terms" updated="October 2, 2026" body={BODY} />;
}
