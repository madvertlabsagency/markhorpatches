import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyOrderAccessToken } from "@/lib/crypto";
import { AuthShell } from "@/components/forms/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/fields";

export const metadata = { title: "Leave a review | Patch Gorilla", robots: { index: false } };

async function submitReview(fd: FormData) {
  "use server";
  const orderId = String(fd.get("orderId"));
  const token = String(fd.get("t"));
  if (!verifyOrderAccessToken(orderId, token)) notFound();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { include: { configuration: true } }, reviews: true } });
  if (!order || order.status !== "DELIVERED" || order.reviews.length) redirect("/reviews");
  const d = z.object({ rating: z.coerce.number().int().min(1).max(5), title: z.string().trim().max(120), body: z.string().trim().min(10).max(3000), name: z.string().trim().min(1).max(80), company: z.string().trim().max(120) }).parse(Object.fromEntries(fd.entries()));
  // Verified (tied to a delivered order) but NOT published until staff review it.
  await prisma.review.create({ data: { orderId: order.id, customerId: order.customerId, rating: d.rating, title: d.title || null, body: d.body, customerName: d.name, company: d.company || null, verified: true, published: false, patchTypeId: order.items[0]?.configuration.patchTypeId } });
  redirect("/reviews/write?thanks=1");
}

export default async function WriteReview({ searchParams }: { searchParams: Promise<{ order?: string; t?: string; thanks?: string }> }) {
  const sp = await searchParams;
  if (sp.thanks) return <AuthShell title="Thank you!" sub="Your review will appear once our team publishes it."><p>We read every single one.</p></AuthShell>;
  if (!sp.order || !verifyOrderAccessToken(sp.order, sp.t)) notFound();
  const order = await prisma.order.findUnique({ where: { id: sp.order } });
  if (!order) notFound();
  return (
    <AuthShell title="How did we do?" sub={`Order ${order.orderNumber}`}>
      <form action={submitReview} className="space-y-4">
        <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="t" value={sp.t} />
        <Field label="Rating" htmlFor="r-rating" required><Select id="r-rating" name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</Select></Field>
        <Field label="Headline" htmlFor="r-title"><Input id="r-title" name="title" maxLength={120} /></Field>
        <Field label="Your review" htmlFor="r-body" required><Textarea id="r-body" name="body" minLength={10} required /></Field>
        <Field label="Name to display" htmlFor="r-name" required><Input id="r-name" name="name" defaultValue={order.firstName ?? ""} required /></Field>
        <Field label="Company" htmlFor="r-company"><Input id="r-company" name="company" defaultValue={order.company ?? ""} /></Field>
        <Button className="w-full" size="lg">Submit review</Button>
      </form>
    </AuthShell>
  );
}
