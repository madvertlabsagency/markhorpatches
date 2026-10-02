/**
 * Branded, responsive, table-based email templates (render in Gmail/Outlook/Apple Mail).
 * Copy is intentionally plain around money; playful elsewhere.
 */
import { formatUSD } from "@/lib/money";

export type EmailTemplateName =
  | "mockup_received"
  | "proof_ready"
  | "revision_received"
  | "proof_approved"
  | "payment_confirmation"
  | "production_started"
  | "quality_check"
  | "shipped"
  | "delivered"
  | "review_request"
  | "abandoned_cart"
  | "ops_new_lead";

export interface EmailData {
  firstName?: string | null;
  orderNumber?: string;
  requestNumber?: string;
  url?: string;
  totalCents?: number;
  proofVersion?: number;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  items?: { name: string; detail: string }[];
  mockup24h?: boolean;
  comment?: string;
  summary?: string;
}

const C = { navy: "#031B3D", midnight: "#020B1D", blue: "#0755B9", electric: "#008DE5", turq: "#08D8D8", slate: "#536276", ice: "#EEF4F7", white: "#FFFFFF" };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr><td style="border-radius:999px;background:${C.electric};background-image:linear-gradient(110deg,#06347E 0%,#087CCB 52%,#08D8D8 100%)">
<a href="${esc(href)}" style="display:inline-block;padding:15px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;letter-spacing:.06em;color:#fff;text-decoration:none;text-transform:uppercase">${esc(label)} &rarr;</a></td></tr></table>`;
}

function itemsTable(items?: EmailData["items"]) {
  if (!items?.length) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #DCE6EE;border-radius:12px">${items
    .map((i, idx) => `<tr><td style="padding:14px 16px;${idx ? "border-top:1px solid #DCE6EE;" : ""}font-family:Arial,Helvetica,sans-serif"><div style="font-size:15px;font-weight:700;color:${C.navy}">${esc(i.name)}</div><div style="font-size:13px;color:${C.slate};margin-top:4px">${esc(i.detail)}</div></td></tr>`)
    .join("")}</table>`;
}

function layout(opts: { preheader: string; eyebrow: string; headline: string; body: string; siteUrl: string }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(opts.headline)}</title></head>
<body style="margin:0;padding:0;background:${C.ice}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ice}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="background:${C.midnight};border-radius:20px 20px 0 0;padding:28px 32px">
<img src="${opts.siteUrl}/brand/logo-horizontal-reverse.png" width="168" alt="Patch Gorilla" style="display:block;border:0;height:auto">
</td></tr>
<tr><td style="height:4px;background:#087CCB;background-image:linear-gradient(110deg,#06347E 0%,#087CCB 52%,#08D8D8 100%)"></td></tr>
<tr><td style="background:#fff;padding:36px 32px 32px;border-radius:0 0 20px 20px;font-family:Arial,Helvetica,sans-serif;color:${C.navy}">
<div style="font-size:12px;font-weight:700;letter-spacing:.24em;color:${C.electric};text-transform:uppercase">${esc(opts.eyebrow)}</div>
<h1 style="margin:10px 0 18px;font-family:'Arial Narrow',Arial,Helvetica,sans-serif;font-size:32px;line-height:1.05;font-weight:800;text-transform:uppercase;letter-spacing:-.01em;color:${C.navy}">${esc(opts.headline)}</h1>
<div style="font-size:16px;line-height:1.6;color:#22324A">${opts.body}</div>
</td></tr>
<tr><td style="padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${C.slate};text-align:center">
<strong style="letter-spacing:.18em;color:${C.navy}">CUSTOM PATCHES FOR BOLD BRANDS.</strong><br>
Questions? Just reply to this email — a real human will answer.<br>
<a href="${opts.siteUrl}" style="color:${C.blue}">${opts.siteUrl.replace(/^https?:\/\//, "")}</a>
</td></tr></table></td></tr></table></body></html>`;
}

const p = (s: string) => `<p style="margin:0 0 14px">${s}</p>`;
const hi = (name?: string | null) => p(`Hi ${esc(name || "there")},`);

export function renderEmail(name: EmailTemplateName, d: EmailData, siteUrl: string): { subject: string; html: string; text: string } {
  const url = d.url ?? siteUrl;
  const order = d.orderNumber ? ` (${d.orderNumber})` : "";
  let subject: string, preheader: string, eyebrow: string, headline: string, body: string, text: string;

  switch (name) {
    case "mockup_received":
      subject = "We've got your artwork 👀";
      preheader = "Your free mockup request is officially in Gorilla hands.";
      eyebrow = `Request ${d.requestNumber ?? ""}`;
      headline = "Your artwork is in Gorilla hands.";
      body = hi(d.firstName) + p("Thanks for sending your design. Our team is reviewing it now and will prepare a free digital mockup.") +
        p(d.mockup24h ? "You'll get your digital mockup within 24 hours." : "We'll email you as soon as your mockup is ready.") +
        p("Nothing goes into production until you approve it.") + button("View your request", url);
      text = `Thanks for sending your design. ${d.mockup24h ? "You'll get your digital mockup within 24 hours." : "We'll email you when your mockup is ready."} View: ${url}`;
      break;
    case "proof_ready":
      subject = "Your Gorilla Proof Is Ready";
      preheader = "See it before we make it.";
      eyebrow = `Order${order} · Proof V${d.proofVersion ?? 1}`;
      headline = "Your proof is ready.";
      body = hi(d.firstName) + p("Your digital proof is ready for review. Check the artwork, dimensions, colors and spelling — then approve it for production or request a revision.") +
        itemsTable(d.items) + button("Review your proof", url) + p(`<span style="font-size:13px;color:${C.slate}">Nothing goes into production until you approve it.</span>`);
      text = `Your proof V${d.proofVersion ?? 1} is ready. Review and approve: ${url}`;
      break;
    case "revision_received":
      subject = "We're making the changes.";
      preheader = "Your revision request is with our design team.";
      eyebrow = `Order${order}`;
      headline = "We're making the changes.";
      body = hi(d.firstName) + p("Got it. Your revision notes are with our design team and we'll send an updated proof as soon as it's ready.") +
        (d.comment ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid ${C.turq};background:${C.ice};border-radius:8px">${esc(d.comment)}</blockquote>` : "") + button("View your order", url);
      text = `We received your revision request and will send an updated proof soon. ${url}`;
      break;
    case "proof_approved":
      subject = "Approved. Let's make it real.";
      preheader = "Your proof is locked in.";
      eyebrow = `Order${order}`;
      headline = "Approved. Let's make it real.";
      body = hi(d.firstName) + p("Your proof is approved and locked. We'll follow the approved production specification exactly.") +
        itemsTable(d.items) + button("View your order", url);
      text = `Your proof is approved. ${url}`;
      break;
    case "payment_confirmation":
      subject = `Payment received${order}`;
      preheader = "Thanks — your payment is confirmed.";
      eyebrow = `Order${order}`;
      headline = "Payment confirmed.";
      body = hi(d.firstName) + p(`We've received your payment${d.totalCents !== undefined ? ` of <strong>${formatUSD(d.totalCents)}</strong>` : ""}. A receipt is available in your order page.`) +
        itemsTable(d.items) + button("View your order", url);
      text = `Payment received${d.totalCents !== undefined ? ` (${formatUSD(d.totalCents)})` : ""}. ${url}`;
      break;
    case "production_started":
      subject = `Your patches are in production${order}`;
      preheader = "Thread is flying.";
      eyebrow = `Order${order}`;
      headline = "Production has started.";
      body = hi(d.firstName) + p("Your approved patches are now being produced. We'll let you know when they pass quality check.") + button("Track your order", url);
      text = `Your order is in production. ${url}`;
      break;
    case "quality_check":
      subject = `Quality check in progress${order}`;
      preheader = "Every batch is checked against your approved proof.";
      eyebrow = `Order${order}`;
      headline = "Quality check.";
      body = hi(d.firstName) + p("Your patches are finished and being checked against the production specification you approved.") + button("Track your order", url);
      text = `Your order is in quality check. ${url}`;
      break;
    case "shipped":
      subject = "Your patches are on the move.";
      preheader = "Tracking details inside.";
      eyebrow = `Order${order}`;
      headline = "Your patches are on the move.";
      body = hi(d.firstName) + p(`Your order has shipped${d.carrier ? ` with ${esc(d.carrier)}` : ""}.`) +
        (d.trackingNumber ? p(`Tracking number: <strong>${esc(d.trackingNumber)}</strong>`) : "") +
        button(d.trackingUrl ? "Track your package" : "View your order", d.trackingUrl || url);
      text = `Your order has shipped. ${d.trackingNumber ? `Tracking: ${d.trackingNumber}. ` : ""}${d.trackingUrl || url}`;
      break;
    case "delivered":
      subject = `Delivered${order}`;
      preheader = "Your patches have arrived.";
      eyebrow = `Order${order}`;
      headline = "Delivered.";
      body = hi(d.firstName) + p("Your patches have been delivered. We hope they look as good in your hands as they did on the proof.") +
        p("If anything isn't right, reply to this email and we'll make it right.") + button("View your order", url);
      text = `Your order was delivered. ${url}`;
      break;
    case "review_request":
      subject = "How did your patches turn out?";
      preheader = "Two minutes. Huge help.";
      eyebrow = `Order${order}`;
      headline = "How did we do?";
      body = hi(d.firstName) + p("We'd love to hear what you think of your patches. Your honest review helps other brands choose with confidence.") + button("Leave a review", url);
      text = `How did your patches turn out? Leave a review: ${url}`;
      break;
    case "abandoned_cart":
      subject = "Your patch design is saved";
      preheader = "Pick up right where you left off.";
      eyebrow = "Saved for you";
      headline = "Still thinking it over?";
      body = hi(d.firstName) + p("Your patch configuration is saved. Pick up where you left off — or reply with questions and a patch expert will help.") +
        itemsTable(d.items) + button("Continue your order", url) +
        p(`<span style="font-size:12px;color:${C.slate}">You're receiving this because you opted in to updates. Reply "unsubscribe" to stop.</span>`);
      text = `Your patch configuration is saved: ${url}`;
      break;
    case "ops_new_lead":
      subject = `New lead: ${d.summary ?? ""}`;
      preheader = d.summary ?? "New lead";
      eyebrow = "Internal";
      headline = "New lead";
      body = p(esc(d.summary ?? "")) + itemsTable(d.items) + button("Open in admin", url);
      text = `${d.summary ?? "New lead"} ${url}`;
      break;
  }

  return { subject, html: layout({ preheader, eyebrow, headline, body, siteUrl }), text };
}
