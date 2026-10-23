/**
 * Transactional email templates. Pure functions (data → subject/html/text) so they can be
 * unit-tested and previewed in the admin. Admins can override subject/body per template in
 * NotificationTemplate; overrides use {{variable}} placeholders and are HTML-escaped.
 */

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.url)}" style="background:#00B4FF;color:#0A0F1C;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#F7F9FC;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0A0F1C">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #E5EAF0;border-radius:16px">
<tr><td style="padding:24px 28px;border-bottom:1px solid #E5EAF0"><strong style="font-size:18px;letter-spacing:-0.01em">Patch<span style="color:#00B4FF">Match</span> AI</strong></td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${escapeHtml(title)}</h1>
${bodyHtml}${button}
</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #E5EAF0;font-size:12px;color:#5B6B80">PatchMatch AI connects buyers with independent, verified patch manufacturers. Manufacturing agreements are made directly between buyer and manufacturer.</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (s: string) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${s}</p>`;

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

type Data = Record<string, string | number | null | undefined>;
const v = (d: Data, k: string) => escapeHtml(String(d[k] ?? ""));

export const TEMPLATES: Record<string, { description: string; sample: Data; render: (d: Data) => Rendered }> = {
  rfq_received: {
    description: "Buyer: RFQ received + email verification link",
    sample: { name: "Alex", ref: "PM-7K3Q9X", verifyUrl: "https://example.com/verify", trackUrl: "https://example.com/track" },
    render: (d) => ({
      subject: `Confirm your email to activate RFQ ${d.ref}`,
      html: layout(
        `We received your request ${d.ref}`,
        p(`Hi ${v(d, "name")}, thanks for your custom patch request.`) +
          p("Please confirm your email address. We only review and match verified requests — this protects you and our manufacturers from spam.") +
          p(`You can track your request any time: <a href="${v(d, "trackUrl")}">${v(d, "trackUrl")}</a>`),
        { label: "Confirm my email", url: String(d.verifyUrl) },
      ),
      text: `Hi ${d.name}, we received your request ${d.ref}. Confirm your email: ${d.verifyUrl}\nTrack: ${d.trackUrl}`,
    }),
  },
  email_verify: {
    description: "Account email verification",
    sample: { name: "Alex", url: "https://example.com/verify" },
    render: (d) => ({
      subject: "Verify your PatchMatch AI email",
      html: layout("Verify your email", p(`Hi ${v(d, "name")}, confirm your email address to finish setting up your account.`), { label: "Verify email", url: String(d.url) }),
      text: `Verify your email: ${d.url}`,
    }),
  },
  password_reset: {
    description: "Password reset link",
    sample: { url: "https://example.com/reset" },
    render: (d) => ({
      subject: "Reset your PatchMatch AI password",
      html: layout("Reset your password", p("Use the button below to choose a new password. The link expires in 1 hour. If you didn't request this, ignore this email."), { label: "Reset password", url: String(d.url) }),
      text: `Reset your password (expires in 1 hour): ${d.url}`,
    }),
  },
  rfq_clarification: {
    description: "Buyer: clarification required",
    sample: { name: "Alex", ref: "PM-7K3Q9X", questions: "What size should the patch be?", url: "https://example.com" },
    render: (d) => ({
      subject: `A few details needed for ${d.ref}`,
      html: layout(`We need a little more detail on ${d.ref}`, p(`Hi ${v(d, "name")}, manufacturers need a few more details to quote accurately:`) + p(v(d, "questions").replace(/\n/g, "<br>")), { label: "Update my request", url: String(d.url) }),
      text: `We need more details for ${d.ref}:\n${d.questions}\n${d.url}`,
    }),
  },
  rfq_status: {
    description: "Buyer: matching/status update",
    sample: { name: "Alex", ref: "PM-7K3Q9X", headline: "We're matching your request", message: "Your request was qualified.", url: "https://example.com" },
    render: (d) => ({
      subject: `${d.headline} — ${d.ref}`,
      html: layout(String(d.headline ?? ""), p(`Hi ${v(d, "name")},`) + p(v(d, "message")), { label: "View request", url: String(d.url) }),
      text: `${d.headline}\n${d.message}\n${d.url}`,
    }),
  },
  quote_received: {
    description: "Buyer: new quotation",
    sample: { name: "Alex", ref: "PM-7K3Q9X", seller: "Acme Embroidery", url: "https://example.com" },
    render: (d) => ({
      subject: `New quote for ${d.ref} from ${d.seller}`,
      html: layout("You received a new quote", p(`Hi ${v(d, "name")}, <strong>${v(d, "seller")}</strong> sent a quotation for ${v(d, "ref")}. Compare it side by side with any other quotes.`), { label: "Compare quotes", url: String(d.url) }),
      text: `New quote for ${d.ref} from ${d.seller}: ${d.url}`,
    }),
  },
  seller_selected: {
    description: "Seller: buyer selected your quote",
    sample: { seller: "Acme Embroidery", ref: "PM-7K3Q9X", url: "https://example.com" },
    render: (d) => ({
      subject: `The buyer selected your quote for ${d.ref}`,
      html: layout("You've been selected", p(`Good news — the buyer for ${v(d, "ref")} selected ${v(d, "seller")} as their preferred manufacturer. Arrange production and payment directly with the buyer.`), { label: "Open conversation", url: String(d.url) }),
      text: `The buyer selected your quote for ${d.ref}: ${d.url}`,
    }),
  },
  seller_application_received: {
    description: "Seller: application received",
    sample: { name: "Bilal", company: "Acme Embroidery", url: "https://example.com" },
    render: (d) => ({
      subject: "We received your manufacturer application",
      html: layout("Application received", p(`Hi ${v(d, "name")}, thanks for applying with ${v(d, "company")}. Our team reviews every manufacturer manually. Complete your capabilities and upload verification documents to speed up review.`), { label: "Complete verification", url: String(d.url) }),
      text: `Application received for ${d.company}. Complete verification: ${d.url}`,
    }),
  },
  seller_verification_decision: {
    description: "Seller: verification decision",
    sample: { company: "Acme Embroidery", status: "Verified", message: "You can now unlock matching RFQs.", url: "https://example.com" },
    render: (d) => ({
      subject: `Verification update: ${d.status}`,
      html: layout(`Verification: ${d.status}`, p(`${v(d, "company")} — ${v(d, "message")}`), { label: "Open seller dashboard", url: String(d.url) }),
      text: `Verification ${d.status}: ${d.message}\n${d.url}`,
    }),
  },
  opportunity_available: {
    description: "Seller: matching RFQ available (anonymised)",
    sample: { ref: "PM-7K3Q9X", summary: "500 × embroidered, 3in, US-CA", price: "$20.00", url: "https://example.com" },
    render: (d) => ({
      subject: `New matching RFQ: ${d.summary}`,
      html: layout("A new RFQ matches your capabilities", p(`<strong>${v(d, "summary")}</strong>`) + p(`Unlock price: ${v(d, "price")}. Buyer details stay private until you unlock. Purchasing access is a buying opportunity — not a guaranteed order.`), { label: "View opportunity", url: String(d.url) }),
      text: `New matching RFQ ${d.ref}: ${d.summary}. Unlock price ${d.price}. ${d.url}`,
    }),
  },
  unlock_receipt: {
    description: "Seller: RFQ unlock receipt",
    sample: { receipt: "R-2026-000123", ref: "PM-7K3Q9X", amount: "$20.00", method: "Card", date: "Oct 23, 2026", url: "https://example.com" },
    render: (d) => ({
      subject: `Receipt ${d.receipt} — RFQ ${d.ref} unlocked`,
      html: layout(
        "Payment receipt",
        p(`Receipt <strong>${v(d, "receipt")}</strong>`) + p(`RFQ access: ${v(d, "ref")}<br>Amount: ${v(d, "amount")}<br>Method: ${v(d, "method")}<br>Date: ${v(d, "date")}`) +
          p("This purchase gives access to the buyer's request and authorised contact details. It does not guarantee an order. See the RFQ Quality Policy for credit eligibility."),
        { label: "Open RFQ", url: String(d.url) },
      ),
      text: `Receipt ${d.receipt}: RFQ ${d.ref} unlocked for ${d.amount} (${d.method}) on ${d.date}. ${d.url}`,
    }),
  },
  new_message: {
    description: "New message in an RFQ conversation",
    sample: { from: "Acme Embroidery", ref: "PM-7K3Q9X", url: "https://example.com" },
    render: (d) => ({
      subject: `New message about ${d.ref}`,
      html: layout("You have a new message", p(`${v(d, "from")} sent you a message about ${v(d, "ref")}.`), { label: "Read message", url: String(d.url) }),
      text: `New message from ${d.from} about ${d.ref}: ${d.url}`,
    }),
  },
  dispute_decision: {
    description: "Seller: quality claim decision",
    sample: { ref: "PM-7K3Q9X", decision: "Credit issued", note: "Contact details were invalid.", url: "https://example.com" },
    render: (d) => ({
      subject: `Quality claim decision for ${d.ref}: ${d.decision}`,
      html: layout(`Claim decision: ${d.decision}`, p(v(d, "note")), { label: "View claim", url: String(d.url) }),
      text: `Claim for ${d.ref}: ${d.decision}. ${d.note}\n${d.url}`,
    }),
  },
  org_invite: {
    description: "Team invitation",
    sample: { org: "Acme Embroidery", inviter: "Bilal", url: "https://example.com" },
    render: (d) => ({
      subject: `${d.inviter} invited you to ${d.org} on PatchMatch AI`,
      html: layout(`Join ${d.org}`, p(`${v(d, "inviter")} invited you to join ${v(d, "org")} on PatchMatch AI. The invitation expires in 7 days.`), { label: "Accept invitation", url: String(d.url) }),
      text: `${d.inviter} invited you to ${d.org}: ${d.url}`,
    }),
  },
  admin_alert: {
    description: "Internal operations alert",
    sample: { title: "New RFQ for review", message: "PM-7K3Q9X needs review.", url: "https://example.com/admin" },
    render: (d) => ({
      subject: `[PatchMatch ops] ${d.title}`,
      html: layout(String(d.title ?? ""), p(v(d, "message")), { label: "Open admin", url: String(d.url) }),
      text: `${d.title}\n${d.message}\n${d.url}`,
    }),
  },
};

export function renderTemplate(key: string, data: Data, override?: { subject: string; body: string } | null): Rendered {
  const t = TEMPLATES[key];
  if (!t) throw new Error(`Unknown email template: ${key}`);
  if (override) {
    const fill = (s: string, esc: boolean) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => (esc ? escapeHtml(String(data[k] ?? "")) : String(data[k] ?? "")));
    const url = typeof data.url === "string" ? data.url : typeof data.verifyUrl === "string" ? data.verifyUrl : undefined;
    return {
      subject: fill(override.subject, false),
      html: layout(fill(override.subject, false), fill(override.body, true).split(/\n{2,}/).map((x) => p(x)).join(""), url ? { label: "Open PatchMatch AI", url } : undefined),
      text: fill(override.body, false),
    };
  }
  return t.render(data);
}
