import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import { sha256, safeEqual } from "@/lib/crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { RfqStatusPanel } from "@/components/rfq/RfqStatusPanel";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Request status", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TrackPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const { ref } = await params;
  const { t } = await searchParams;
  const rfq = await prisma.rfq.findUnique({ where: { publicRef: ref.toUpperCase() } });
  if (!rfq) notFound();
  const user = await getCurrentUser();
  const token = t ?? (await cookies()).get(`pm_rfq_${rfq.publicRef}`)?.value;
  const guestOk = !!token && !!rfq.guestAccessHash && safeEqual(sha256(token), rfq.guestAccessHash);
  const ownerOk = !!user && (rfq.buyerUserId === user.id || user.memberships.some((m) => m.orgId === rfq.buyerOrgId));
  if (!guestOk && !ownerOk) {
    return (
      <div className="container-page grid min-h-[60vh] place-items-center py-16">
        <div className="card max-w-md p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-muted" />
          <h1 className="mt-4 text-xl font-semibold">This request is private</h1>
          <p className="mt-2 text-sm text-muted">Open the tracking link from your confirmation email, or sign in with the email you used.</p>
          <ButtonLink href={`/login?next=/rfq/track/${rfq.publicRef}`} className="mt-6">Sign in</ButtonLink>
        </div>
      </div>
    );
  }
  if (ownerOk) {
    return (
      <div className="container-page py-12">
        <ButtonLink href={`/buyer/rfqs/${rfq.id}`}>Open in your dashboard</ButtonLink>
      </div>
    );
  }
  return (
    <div className="container-page py-12">
      <RfqStatusPanel rfqId={rfq.id} audience="guest" />
      <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm text-muted">Create a free account with <strong className="text-fg">{rfq.contactEmail.replace(/(^.).*(@.*$)/, "$1•••$2")}</strong> to message manufacturers and select a quote.</p>
        <Link href={`/register?next=${encodeURIComponent(`/buyer/rfqs/${rfq.id}`)}`} className="font-semibold text-electric">Create account →</Link>
      </div>
    </div>
  );
}
