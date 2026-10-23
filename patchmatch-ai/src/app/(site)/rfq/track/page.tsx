import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Track a request", robots: { index: false } };

export default async function TrackLookup({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  if (ref && /^PM-[A-Z0-9]{6}$/i.test(ref.trim())) redirect(`/rfq/track/${ref.trim().toUpperCase()}`);
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16">
      <form className="card w-full max-w-md space-y-4 p-8" method="get">
        <h1 className="text-2xl font-semibold">Track a request</h1>
        <p className="text-sm text-muted">Open the tracking link from your confirmation email, or sign in. On the device you submitted from, you can also enter your RFQ ID.</p>
        <Input name="ref" placeholder="PM-XXXXXX" aria-label="RFQ ID" className="tabular uppercase" required />
        <Button type="submit" className="w-full">Track</Button>
      </form>
    </div>
  );
}
