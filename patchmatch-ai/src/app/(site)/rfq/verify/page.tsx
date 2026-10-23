import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyRfqEmail } from "@/lib/domain/rfq";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Confirm your request", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyRfqPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const r = token ? await verifyRfqEmail(token) : { ok: false as const, reason: "Missing confirmation token." };
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16">
      <div className="card max-w-lg p-8 text-center">
        {r.ok ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 text-2xl font-semibold">{r.already ? "Already confirmed" : "Email confirmed"}</h1>
            <p className="mt-2 text-muted">Request <span className="tabular font-semibold text-fg">{r.rfq.publicRef}</span> is now with our review team. We'll email you as it progresses.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <ButtonLink href={`/register?next=${encodeURIComponent("/buyer/rfqs")}`}>Create an account</ButtonLink>
              <ButtonLink href="/login" variant="secondary">Sign in</ButtonLink>
            </div>
            <p className="mt-4 text-xs text-muted">Use the same email to see this request in your dashboard.</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-12 w-12 text-danger" />
            <h1 className="mt-4 text-2xl font-semibold">We couldn't confirm this request</h1>
            <p className="mt-2 text-muted">{r.reason}</p>
            <Link href="/contact" className="mt-6 inline-block font-semibold text-electric">Contact support</Link>
          </>
        )}
      </div>
    </div>
  );
}
