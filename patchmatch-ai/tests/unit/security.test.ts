import { describe, expect, it } from "vitest";
import { projectRfqForSeller, redactContactInfo, type RfqForDisclosure } from "@/lib/rfq/disclosure";
import { validateUploadMeta, sniffMatches, svgIsSafe, sanitizeFilename } from "@/lib/services/storage/validation";
import { verifyTotp, totp, generateTotpSecret, base32Decode, base32Encode } from "@/lib/auth/totp";
import { can, orgCan, ROLE_PERMISSIONS } from "@/lib/auth/rbac";
import { signPayload, verifyPayload, encrypt, decrypt } from "@/lib/crypto";
import { renderTemplate, TEMPLATES, escapeHtml } from "@/lib/services/email/templates";
import { rfqSubmissionSchema } from "@/lib/rfq/schema";

const baseRfq: RfqForDisclosure = {
  id: "11111111-1111-1111-1111-111111111111", publicRef: "PM-ABC234", patchType: "EMBROIDERED", intendedUse: "HATS", status: "SELLER_NOTIFIED",
  disclosureMode: "FULL_CONTACT", contactName: "Taylor Morgan", contactCompany: "Morgan Caps", contactEmail: "taylor@morgancaps.com", contactPhone: "+1 312 555 0199",
  contactWebsite: "morgancaps.com", preferredContact: "EMAIL", createdAt: new Date(),
  spec: {
    width: 3, height: 2, unit: "IN", shape: "Rectangle", borderType: "MERROWED", material: null, thickness: null, quantity: 300, minQuantity: null, repeatPotential: true,
    sampleRequired: false, backing: "SEW_ON", backingOther: null, colorCount: 4, specialFinishing: [], destinationCountry: "US", destinationState: "IL", destinationPostal: "60601",
    requiredBy: null, rush: false, sampleBeforeProduction: false, budgetTotalMinor: null, targetUnitMinor: null, budgetUndisclosed: true, budgetFlexibility: null, currency: "USD",
    notes: "Call me at 312-555-0199 or email taylor@morgancaps.com, see www.morgancaps.com and IG @morgancaps", artworkNotes: "Match navy on morgancaps.com", aiSummary: null,
  },
};

describe("disclosure policy (locked RFQs never expose buyer details)", () => {
  it("locked view contains no contact fields, postal code or contact info in free text", () => {
    const v = projectRfqForSeller(baseRfq, { unlocked: false });
    expect(v.locked).toBe(true);
    expect(v.contact).toBeNull();
    expect(v.spec.destinationPostal).toBeNull();
    const blob = JSON.stringify(v);
    for (const secret of ["taylor@morgancaps.com", "Taylor Morgan", "Morgan Caps", "555-0199", "60601", "morgancaps.com", "@morgancaps"]) expect(blob).not.toContain(secret);
    expect(v.disclosedFields).toEqual([]);
  });

  it("unlocked FULL_CONTACT view releases consented contact fields", () => {
    const v = projectRfqForSeller(baseRfq, { unlocked: true });
    expect(v.contact?.email).toBe("taylor@morgancaps.com");
    expect(v.contact?.phone).toBe("+1 312 555 0199");
    expect(v.disclosedFields).toEqual(expect.arrayContaining(["email", "phone", "name"]));
  });

  it("unlocked PLATFORM_MESSAGING_ONLY view withholds email, phone and website", () => {
    const v = projectRfqForSeller({ ...baseRfq, disclosureMode: "PLATFORM_MESSAGING_ONLY" }, { unlocked: true });
    expect(v.contact?.email).toBeNull();
    expect(v.contact?.phone).toBeNull();
    expect(v.contact?.website).toBeNull();
    expect(v.contact?.messagingOnly).toBe(true);
    expect(v.disclosedFields).not.toContain("email");
  });

  it("redacts emails, phones, URLs and handles but leaves specs intact", () => {
    const r = redactContactInfo("500 pcs 3in, email me a@b.co or +44 20 7946 0958, insta @brand, site brand.com");
    expect(r.redacted).toBe(true);
    expect(r.text).toContain("500 pcs 3in");
    expect(r.text).not.toMatch(/a@b\.co|7946|@brand|brand\.com/);
    expect(redactContactInfo("2 colours, 3.5 x 2 inches, qty 1200").redacted).toBe(false);
  });
});

describe("upload validation", () => {
  it("accepts allowed artwork and rejects AI/EPS with guidance", () => {
    expect(validateUploadMeta("RFQ_ARTWORK", "logo.png", "image/png", 1000).ok).toBe(true);
    const ai = validateUploadMeta("RFQ_ARTWORK", "logo.ai", "application/postscript", 1000);
    expect(ai.ok).toBe(false);
    if (!ai.ok) expect(ai.reason).toMatch(/PDF/);
    expect(validateUploadMeta("RFQ_ARTWORK", "x.exe", "application/octet-stream", 10).ok).toBe(false);
    expect(validateUploadMeta("RFQ_ARTWORK", "big.pdf", "application/pdf", 26 * 1_048_576).ok).toBe(false);
    expect(validateUploadMeta("SELLER_DOCUMENT", "logo.svg", "image/svg+xml", 100).ok).toBe(false);
    expect(validateUploadMeta("RFQ_ARTWORK", "fake.png", "image/jpeg", 100).ok).toBe(false);
  });
  it("sniffs magic bytes", () => {
    expect(sniffMatches("png", Buffer.from("89504e470d0a1a0a0000", "hex"))).toBe(true);
    expect(sniffMatches("png", Buffer.from("%PDF-1.7"))).toBe(false);
    expect(sniffMatches("pdf", Buffer.from("%PDF-1.7\n"))).toBe(true);
  });
  it("rejects active SVG content", () => {
    expect(svgIsSafe('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>')).toBe(true);
    expect(svgIsSafe("<svg><script>alert(1)</script></svg>")).toBe(false);
    expect(svgIsSafe('<svg onload="x()"></svg>')).toBe(false);
    expect(svgIsSafe('<svg><image href="https://evil.example/x.png"/></svg>')).toBe(false);
    expect(svgIsSafe('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>')).toBe(false);
  });
  it("sanitises filenames (no traversal)", () => {
    expect(sanitizeFilename("../../etc/passwd.png")).not.toContain("/");
    expect(sanitizeFilename("My Logo (final).PNG")).toBe("My-Logo-final.png");
  });
});

describe("auth primitives", () => {
  it("TOTP round-trips and tolerates ±1 step", () => {
    const secret = generateTotpSecret();
    expect(base32Encode(base32Decode(secret))).toBe(secret);
    const now = Date.now();
    expect(verifyTotp(secret, totp(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now - 120_000), now)).toBe(false);
    expect(verifyTotp(secret, "abc123", now)).toBe(false);
  });
  it("RFC 6238 test vector", () => {
    // Secret "12345678901234567890" (ASCII) at T=59s → 287082 (SHA-1, 6 digits).
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(totp(secret, 59_000)).toBe("287082");
  });
  it("RBAC: only SUPER_ADMIN manages roles; NONE has nothing; members can't purchase", () => {
    expect(can("SUPER_ADMIN", "roles:manage")).toBe(true);
    expect(can("ADMIN", "roles:manage")).toBe(false);
    expect(can("SUPPORT", "refunds:decide")).toBe(false);
    expect(can("FINANCE", "refunds:decide")).toBe(true);
    expect(ROLE_PERMISSIONS.NONE).toHaveLength(0);
    expect(can("NONE", "admin:view", ["admin:view"])).toBe(false);
    expect(orgCan("MEMBER", "rfq:purchase")).toBe(false);
    expect(orgCan("OWNER", "rfq:purchase")).toBe(true);
  });
  it("signed tokens reject tampering and expiry; encryption round-trips", () => {
    const t = signPayload({ a: 1 }, 60);
    expect(verifyPayload<{ a: number }>(t)?.a).toBe(1);
    expect(verifyPayload(t.slice(0, -2) + "xx")).toBeNull();
    expect(verifyPayload(signPayload({ a: 1 }, -1))).toBeNull();
    const enc = encrypt("JBSWY3DPEHPK3PXP");
    expect(enc).not.toContain("JBSWY3");
    expect(decrypt(enc)).toBe("JBSWY3DPEHPK3PXP");
  });
});

describe("email templates", () => {
  it("renders every template from sample data and escapes HTML", () => {
    for (const [key, t] of Object.entries(TEMPLATES)) {
      const r = renderTemplate(key, t.sample);
      expect(r.subject.length).toBeGreaterThan(3);
      expect(r.html).toContain("<html");
    }
    const r = renderTemplate("quote_received", { name: "<script>x</script>", ref: "PM-1", seller: "A&B", url: "https://x" });
    expect(r.html).not.toContain("<script>x");
    expect(escapeHtml(`"'<>&`)).toBe("&quot;&#39;&lt;&gt;&amp;");
  });
});

describe("RFQ submission schema", () => {
  const valid = {
    patchType: "PVC", intendedUse: "STREETWEAR", unit: "IN", width: "3", height: "2", quantity: "250", artworkIds: [], destinationCountry: "US", contactName: "Sam Rivera",
    contactEmail: "SAM@Example.com ", consentMatching: true, consentSharing: true, consentTerms: true, consentMarketing: false, disclosureMode: "FULL_CONTACT", consentDirectContact: true, buyingStage: "COMPARING", website2: "",
  };
  it("accepts a valid submission and normalises email", () => {
    const r = rfqSubmissionSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.contactEmail).toBe("sam@example.com");
  });
  it("requires consent and rejects honeypot", () => {
    expect(rfqSubmissionSchema.safeParse({ ...valid, consentSharing: false }).success).toBe(false);
    expect(rfqSubmissionSchema.safeParse({ ...valid, website2: "bot" }).success).toBe(false);
  });
  it("marketing consent defaults to false", () => {
    const { consentMarketing: _c, ...rest } = valid;
    const r = rfqSubmissionSchema.safeParse(rest);
    expect(r.success && r.data.consentMarketing).toBe(false);
  });
});
