/**
 * DISCLOSURE POLICY — the single place that decides which RFQ fields a seller may see.
 *
 * Locked (no active unlock): anonymised summary only. No name, email, phone, website,
 * company, exact postal code, original artwork, or contact details hidden in free text.
 * Unlocked: fields permitted by the buyer's consent (disclosureMode).
 *
 * Never call this with `unlocked: true` unless an ACTIVE RfqUnlock row exists for the
 * seller — see lib/domain/opportunities.ts#sellerRfqView which enforces that.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\s().-]*){7,}/g;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|net|org|io|co|us|uk|pk|shop|store|biz)\b[^\s]*/gi;
const HANDLE_RE = /(^|\s)@[a-z0-9_.]{3,}/gi;

/** Removes contact details from free text. Used for locked previews and for messages before disclosure. */
export function redactContactInfo(text: string | null | undefined): { text: string; redacted: boolean } {
  if (!text) return { text: "", redacted: false };
  let redacted = false;
  const mark = () => {
    redacted = true;
    return "[contact hidden]";
  };
  const out = text
    .replace(EMAIL_RE, mark)
    .replace(URL_RE, mark)
    .replace(PHONE_RE, (m) => (m.replace(/\D/g, "").length >= 7 ? mark() : m))
    .replace(HANDLE_RE, (_m, pre: string) => `${pre}${mark()}`);
  return { text: out, redacted };
}

export interface RfqForDisclosure {
  id: string;
  publicRef: string;
  patchType: string;
  intendedUse: string;
  status: string;
  disclosureMode: "FULL_CONTACT" | "PLATFORM_MESSAGING_ONLY";
  contactName: string;
  contactCompany: string | null;
  contactEmail: string;
  contactPhone: string | null;
  contactWebsite: string | null;
  preferredContact: string;
  createdAt: Date;
  spec: {
    width: number | null;
    height: number | null;
    unit: string;
    shape: string | null;
    borderType: string | null;
    material: string | null;
    thickness: string | null;
    quantity: number;
    minQuantity: number | null;
    repeatPotential: boolean;
    sampleRequired: boolean;
    backing: string | null;
    backingOther: string | null;
    colorCount: number | null;
    specialFinishing: string[];
    destinationCountry: string;
    destinationState: string | null;
    destinationPostal: string | null;
    requiredBy: Date | null;
    rush: boolean;
    sampleBeforeProduction: boolean;
    budgetTotalMinor: number | null;
    targetUnitMinor: number | null;
    budgetUndisclosed: boolean;
    budgetFlexibility: string | null;
    currency: string;
    notes: string | null;
    artworkNotes: string | null;
    aiSummary: string | null;
  } | null;
}

export interface SellerRfqView {
  id: string;
  publicRef: string;
  locked: boolean;
  patchType: string;
  intendedUse: string;
  createdAt: Date;
  spec: Omit<NonNullable<RfqForDisclosure["spec"]>, "destinationPostal"> & { destinationPostal: string | null };
  contact: null | {
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    preferredContact: string;
    messagingOnly: boolean;
  };
  /** Which protected fields were released (for the disclosure audit log). */
  disclosedFields: string[];
}

export function projectRfqForSeller(rfq: RfqForDisclosure, opts: { unlocked: boolean }): SellerRfqView {
  if (!rfq.spec) throw new Error("RFQ has no specification");
  const s = rfq.spec;
  const notes = opts.unlocked ? s.notes : redactContactInfo(s.notes).text || null;
  const artworkNotes = opts.unlocked ? s.artworkNotes : redactContactInfo(s.artworkNotes).text || null;
  const aiSummary = opts.unlocked ? s.aiSummary : redactContactInfo(s.aiSummary).text || null;
  const spec = {
    ...s,
    notes,
    artworkNotes,
    aiSummary,
    // Locked: region only, never the postal code.
    destinationPostal: opts.unlocked ? s.destinationPostal : null,
  };
  if (!opts.unlocked) {
    return { id: rfq.id, publicRef: rfq.publicRef, locked: true, patchType: rfq.patchType, intendedUse: rfq.intendedUse, createdAt: rfq.createdAt, spec, contact: null, disclosedFields: [] };
  }
  const messagingOnly = rfq.disclosureMode === "PLATFORM_MESSAGING_ONLY";
  const contact = {
    name: rfq.contactName,
    company: rfq.contactCompany,
    email: messagingOnly ? null : rfq.contactEmail,
    phone: messagingOnly ? null : rfq.contactPhone,
    website: messagingOnly ? null : rfq.contactWebsite,
    preferredContact: messagingOnly ? "PLATFORM" : rfq.preferredContact,
    messagingOnly,
  };
  const disclosedFields = ["name", "company", "postal_code", "artwork_original", "notes"];
  if (!messagingOnly) disclosedFields.push("email", "phone", "website");
  return { id: rfq.id, publicRef: rfq.publicRef, locked: false, patchType: rfq.patchType, intendedUse: rfq.intendedUse, createdAt: rfq.createdAt, spec, contact, disclosedFields };
}
