import { notFound } from "next/navigation";
import { verifyPayload } from "@/lib/crypto";
import { mockPayAction } from "@/app/actions/checkout";
import { formatUSD } from "@/lib/money";
import { Container } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

export const metadata = { robots: { index: false } };

/** DEVELOPMENT ONLY — simulates the hosted payment page when PAYMENTS_PROVIDER=mock. */
export default async function MockPayPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (process.env.PAYMENTS_PROVIDER === "stripe") notFound();
  const { token } = await searchParams;
  const data = verifyPayload<{ amountCents: number }>(token);
  if (!data) notFound();
  return (
    <section data-header-theme="light" className="min-h-screen bg-ice pt-[calc(var(--header-h)+3rem)]">
      <Container size="md">
        <div className="rounded-[2rem] bg-white p-8 text-center ring-1 ring-line">
          <p className="inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#7a5200]">Test mode — no real payment</p>
          <h1 className="display mt-4 text-5xl">Test payment</h1>
          <p className="mt-2 text-slate">This page stands in for Stripe Checkout in development.</p>
          <p className="display mt-6 text-6xl">{formatUSD(data.amountCents)}</p>
          <form action={mockPayAction} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <input type="hidden" name="token" value={token} />
            <Button name="outcome" value="success" size="lg">Pay {formatUSD(data.amountCents)}</Button>
            <Button name="outcome" value="cancel" size="lg" variant="outline">Cancel</Button>
          </form>
        </div>
      </Container>
    </section>
  );
}
