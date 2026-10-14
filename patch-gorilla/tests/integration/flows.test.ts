import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { addToCart, createCart, loadCart, updateCartItem, duplicateCartItem, setSavedForLater } from "@/lib/domain/cart";
import { createOrderFromCart, markPaymentSucceeded, startPayment, transitionOrder, OrderError, addShipment } from "@/lib/domain/orders";
import { submitMockupRequest } from "@/lib/domain/mockups";
import { approveProof, createProofVersion, requestRevision, ProofError, proofContentHash } from "@/lib/domain/proofs";
import { ConfigurationError } from "@/lib/domain/configurations";
import { address, catalogIds, ensureSeeded, staffUser } from "./helpers";

const RUN = Date.now().toString(36);
let ids: Awaited<ReturnType<typeof catalogIds>>;

beforeAll(async () => {
  await ensureSeeded();
  ids = await catalogIds();
});

const embroidered = () => ({
  patchTypeId: ids.t("EMBROIDERED"), widthIn: 3, heightIn: 3, quantity: 100, shape: "CIRCLE",
  backingId: ids.b("IRON_ON"), borderId: ids.br("MERROWED"), extraIds: [], artworkStatus: "SEND_LATER",
});

async function paidOrder(email = `buyer${RUN}${Math.random().toString(36).slice(2, 7)}@test.local`) {
  const { cart } = await createCart();
  await addToCart(cart.id, embroidered(), { anonOwnerId: cart.id });
  const order = await createOrderFromCart(cart.id, {
    contact: { firstName: "Bea", lastName: "Buyer", email }, shipping: address, billing: null, shippingMethod: "standard",
  });
  const { redirectUrl } = await startPayment(order.id);
  expect(redirectUrl).toContain("/checkout/mock-pay");
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  await markPaymentSucceeded(payment.providerRef, payment.amountCents);
  return { order, payment, cart };
}

describe("configurator → cart", () => {
  it("prices server-side and ignores any client-sent price", async () => {
    const { cart } = await createCart();
    await addToCart(cart.id, { ...embroidered(), unitPriceCents: 1, totalCents: 1 }, { anonOwnerId: cart.id });
    const loaded = (await loadCart(cart.id))!;
    expect(loaded.activeLines).toHaveLength(1);
    expect(loaded.activeLines[0].unitPriceCents).toBe(295 + 15); // 3" × 100 embroidered + iron-on
    expect(loaded.subtotalCents).toBe(31_000);
  });

  it("rejects incompatible selections", async () => {
    const { cart } = await createCart();
    await expect(addToCart(cart.id, { ...embroidered(), patchTypeId: ids.t("PVC"), borderId: null }, { anonOwnerId: cart.id })).rejects.toThrow(ConfigurationError);
  });

  it("edits, duplicates and saves items for later", async () => {
    const { cart } = await createCart();
    const item = await addToCart(cart.id, embroidered(), { anonOwnerId: cart.id });
    await updateCartItem(cart.id, item.id, { ...embroidered(), quantity: 500 }, { anonOwnerId: cart.id });
    await duplicateCartItem(cart.id, item.id);
    await setSavedForLater(cart.id, item.id, true);
    const loaded = (await loadCart(cart.id))!;
    expect(loaded.activeLines).toHaveLength(1);
    expect(loaded.savedLines).toHaveLength(1);
    expect(loaded.savedLines[0].config.quantity).toBe(500);
    expect(loaded.subtotalCents).toBe((145 + 15) * 500);
  });
});

describe("free mockup submission", () => {
  it("creates customer, lead, order and request — and sends the confirmation once", async () => {
    const { request, order } = await submitMockupRequest(
      { name: "Maya Mockup", email: `Maya${RUN}@Test.local`, patchTypeId: ids.t("WOVEN"), approxSize: '3" x 2"', quantity: "200", notes: "Navy + white" },
      { utm: { utm_source: "google" } },
    );
    expect(order.status).toBe("MOCKUP_PENDING");
    expect(order.source).toBe("FREE_MOCKUP");
    expect(order.email).toBe(`maya${RUN}@test.local`);
    expect(request.requestNumber).toMatch(/^MR-\d{6}$/);
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id }, include: { configuration: true } });
    expect(item.configuration.widthIn).toBe(3);
    expect(item.configuration.heightIn).toBe(2);
    expect(await prisma.lead.count({ where: { email: `maya${RUN}@test.local`, source: "FREE_MOCKUP" } })).toBe(1);
    expect(await prisma.emailEvent.count({ where: { idempotencyKey: `mockup_received:${request.id}` } })).toBe(1);
  });

  it("validates required fields", async () => {
    await expect(submitMockupRequest({ name: "", email: "nope" }, {})).rejects.toThrow();
  });
});

describe("checkout", () => {
  it("creates a PAYMENT_PENDING order with server totals, then marks it paid idempotently", async () => {
    const { order, payment } = await paidOrder();
    expect(order.subtotalCents).toBe(31_000);
    expect(order.shippingCents).toBe(0); // above the $150 free-shipping threshold
    expect(order.totalCents).toBe(31_000);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.paymentStatus).toBe("PAID");
    expect(after.status).toBe("MOCKUP_PENDING"); // paid, now awaiting proof
    await markPaymentSucceeded(payment.providerRef, payment.amountCents); // replay
    expect(await prisma.orderStatusEvent.count({ where: { orderId: order.id, status: "PAID" } })).toBe(1);
    expect(await prisma.emailEvent.count({ where: { idempotencyKey: `payment_confirmation:${order.id}` } })).toBe(1);
  });

  it("rejects a payment whose amount doesn't match", async () => {
    const { cart } = await createCart();
    await addToCart(cart.id, embroidered(), { anonOwnerId: cart.id });
    const order = await createOrderFromCart(cart.id, { contact: { firstName: "A", lastName: "B", email: `mismatch${RUN}@test.local` }, shipping: address, billing: null, shippingMethod: "expedited" });
    expect(order.shippingCents).toBe(2995);
    await startPayment(order.id);
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    await expect(markPaymentSucceeded(payment.providerRef, payment.amountCents - 1)).rejects.toThrow(OrderError);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).not.toBe("PAID");
  });

  it("refuses an empty cart", async () => {
    const { cart } = await createCart();
    await expect(createOrderFromCart(cart.id, { contact: { firstName: "A", lastName: "B", email: "e@test.local" }, shipping: address, billing: null, shippingMethod: "standard" })).rejects.toThrow(/empty/);
  });
});

describe("proof approval", () => {
  it("approve → locked + hashed, then production is allowed", async () => {
    const { order } = await paidOrder();
    const staff = await staffUser();
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });

    await expect(transitionOrder(order.id, "IN_PRODUCTION")).rejects.toThrow(OrderError);

    const proof = await createProofVersion({ orderItemId: item.id, fileKey: "proofs/test/v1.png", fileMimeType: "image/png", uploadedById: staff.id, send: true });
    expect(proof.version).toBe(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PROOF_READY");

    await expect(approveProof({ proofId: proof.id, actor: { email: order.email }, confirmed: false })).rejects.toThrow(ProofError);
    await approveProof({ proofId: proof.id, actor: { email: order.email }, ipAddress: "203.0.113.5", confirmed: true });

    const approved = await prisma.proof.findUniqueOrThrow({ where: { id: proof.id }, include: { approval: true } });
    expect(approved.status).toBe("APPROVED");
    expect(approved.locked).toBe(true);
    expect(approved.approval?.contentHash).toBe(proofContentHash(approved));
    expect(approved.approval?.ipAddress).toBe("203.0.113.5");

    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PROOF_APPROVED");
    await transitionOrder(order.id, "IN_PRODUCTION");
    await transitionOrder(order.id, "QUALITY_CHECK");
    await addShipment(order.id, { carrier: "UPS", trackingNumber: "1Z999AA10123456784" });
    const shipped = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { shipments: true } });
    expect(shipped.status).toBe("SHIPPED");
    expect(shipped.shipments[0].trackingUrl).toContain("ups.com");

    // Approved proofs are never overwritten — new uploads are blocked in production.
    await expect(createProofVersion({ orderItemId: item.id, fileKey: "x", fileMimeType: "image/png", uploadedById: staff.id, send: true })).rejects.toThrow(ProofError);
  });

  it("unpaid mockup orders move to PAYMENT_PENDING after approval and cannot start production", async () => {
    const { order } = await submitMockupRequest({ name: "Una Paid", email: `unpaid${RUN}@test.local`, patchTypeId: ids.t("EMBROIDERED"), approxSize: "3", quantity: "100" }, {});
    const staff = await staffUser();
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    const proof = await createProofVersion({ orderItemId: item.id, fileKey: "proofs/t/v1.png", fileMimeType: "image/png", uploadedById: staff.id, send: true });
    await approveProof({ proofId: proof.id, actor: { email: order.email }, confirmed: true });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("PAYMENT_PENDING");
    await expect(transitionOrder(order.id, "IN_PRODUCTION")).rejects.toThrow(/Can't move|paid/);
  });
});

describe("revision request", () => {
  it("records the revision, and a new version supersedes the old one", async () => {
    const { order } = await paidOrder();
    const staff = await staffUser();
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    const v1 = await createProofVersion({ orderItemId: item.id, fileKey: "proofs/r/v1.png", fileMimeType: "image/png", uploadedById: staff.id, send: true });

    await expect(requestRevision({ proofId: v1.id, comment: "" })).rejects.toThrow(ProofError);
    await requestRevision({ proofId: v1.id, comment: "Make the border navy please" });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REVISION_REQUESTED");
    expect(await prisma.proofRevision.count({ where: { proofId: v1.id } })).toBe(1);

    const v2 = await createProofVersion({ orderItemId: item.id, fileKey: "proofs/r/v2.png", fileMimeType: "image/png", uploadedById: staff.id, send: true });
    expect(v2.version).toBe(2);
    expect((await prisma.proof.findUniqueOrThrow({ where: { id: v1.id } })).status).toBe("SUPERSEDED");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PROOF_READY");

    await expect(approveProof({ proofId: v1.id, actor: { email: order.email }, confirmed: true })).rejects.toThrow(/newer version/);
    await approveProof({ proofId: v2.id, actor: { email: order.email }, confirmed: true });
    const history = await prisma.proof.findMany({ where: { orderItemId: item.id }, orderBy: { version: "asc" } });
    expect(history.map((p) => `${p.version}:${p.status}`)).toEqual(["1:SUPERSEDED", "2:APPROVED"]);
  });
});
