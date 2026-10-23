import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/lib/domain/webhooks";

/** Inbound payment webhooks. Signature is verified on the RAW body before anything is applied. */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const raw = await req.text();
  if (raw.length > 256_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const result = await handlePaymentWebhook(provider, raw, req.headers);
  return NextResponse.json(result.body, { status: result.status });
}
