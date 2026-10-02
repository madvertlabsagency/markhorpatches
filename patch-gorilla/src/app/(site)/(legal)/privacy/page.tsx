import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = pageMetadata({ title: "Privacy Policy | Patch Gorilla", path: "/privacy" });

const BODY = `## What we collect
Contact details you give us (name, email, phone, company, addresses), artwork you upload, order details, and basic analytics about how the site is used.

## How we use it
To prepare mockups and proofs, process and deliver orders, provide support, and — only if you opt in — send marketing emails.

## Payments
Card payments are processed by our payment provider. We never see or store your full card number.

## Artwork
Uploaded artwork is stored privately and used only to produce your order. We never publish your artwork without your permission.

## Sharing
We share information with service providers that help us operate (payments, email, hosting, production partners, CRM) under appropriate agreements. We do not sell personal information.

## Your choices
You can access, correct or delete your information by contacting [support email]. You can unsubscribe from marketing at any time.

## Contact
[Company legal name], [address], [support email].`;

export default function Page() {
  return <LegalPage title="Privacy Policy" path="/privacy" updated="October 2, 2026" body={BODY} />;
}
