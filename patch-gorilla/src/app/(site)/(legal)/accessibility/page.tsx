import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = pageMetadata({ title: "Accessibility Statement | Patch Gorilla", path: "/accessibility" });

const BODY = `## Our commitment
We want everyone to be able to design and order custom patches. We aim to meet WCAG 2.2 AA guidelines.

## What we do
Keyboard navigation, visible focus states, labeled forms, accessible dialogs, sufficient color contrast, alt text and support for reduced-motion preferences.

## Feedback
If you run into an accessibility barrier, contact [support email] and we'll help you complete your order and fix the issue.`;

export default function Page() {
  return <LegalPage title="Accessibility Statement" path="/accessibility" updated="October 2, 2026" body={BODY} />;
}
