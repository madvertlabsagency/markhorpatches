import { describe, expect, it } from "vitest";
import { sanitizeFilename, sniffMatches, validateUploadMeta } from "@/lib/services/storage/validation";
import { signPayload, verifyPayload, orderAccessToken, verifyOrderAccessToken } from "@/lib/crypto";
import { can, isStaff } from "@/lib/auth/rbac";
import { renderEmail } from "@/lib/services/email/templates";

describe("upload validation", () => {
  it("accepts supported types within the size limit", () => {
    expect(validateUploadMeta("logo.PNG", "image/png", 1000, 5_000_000).ok).toBe(true);
    expect(validateUploadMeta("art.ai", "", 1000, 5_000_000).ok).toBe(true);
  });
  it("rejects bad extensions, mismatched MIME and oversized files", () => {
    expect(validateUploadMeta("run.exe", "application/octet-stream", 10, 5_000_000).ok).toBe(false);
    expect(validateUploadMeta("logo.png", "application/pdf", 10, 5_000_000).ok).toBe(false);
    expect(validateUploadMeta("logo.png", "image/png", 6_000_000, 5_000_000).ok).toBe(false);
  });
  it("sanitizes filenames (no traversal, no specials)", () => {
    expect(sanitizeFilename("../../etc/pass wd<script>.png")).toBe("etc-pass-wdscript.png");
    expect(sanitizeFilename("Logo Final (v2).PDF")).toBe("Logo-Final-v2.pdf");
  });
  it("sniffs magic bytes", () => {
    expect(sniffMatches("png", Buffer.from("89504e470d0a1a0a0000", "hex"))).toBe(true);
    expect(sniffMatches("png", Buffer.from("%PDF-1.7"))).toBe(false);
    expect(sniffMatches("pdf", Buffer.from("%PDF-1.7"))).toBe(true);
    expect(sniffMatches("svg", Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(true);
    expect(sniffMatches("jpg", Buffer.from("ffd8ffe0", "hex"))).toBe(true);
  });
});

describe("signed tokens", () => {
  it("round-trips and rejects tampering or expiry", () => {
    const t = signPayload({ key: "a" }, 60);
    expect(verifyPayload<{ key: string }>(t)?.key).toBe("a");
    expect(verifyPayload(t.slice(0, -2) + "xx")).toBeNull();
    expect(verifyPayload(signPayload({ key: "a" }, -1))).toBeNull();
  });
  it("order access tokens are order-specific", () => {
    expect(verifyOrderAccessToken("o1", orderAccessToken("o1"))).toBe(true);
    expect(verifyOrderAccessToken("o2", orderAccessToken("o1"))).toBe(false);
  });
});

describe("RBAC", () => {
  it("customers have no admin permissions", () => {
    expect(isStaff("CUSTOMER")).toBe(false);
    expect(can("CUSTOMER", "orders:read")).toBe(false);
  });
  it("roles are scoped", () => {
    expect(can("DESIGNER", "proofs:write")).toBe(true);
    expect(can("DESIGNER", "pricing:write")).toBe(false);
    expect(can("FULFILLMENT", "orders:fulfil")).toBe(true);
    expect(can("SUPPORT", "settings:write")).toBe(false);
    expect(can("ADMIN", "users:write")).toBe(false);
    expect(can("SUPER_ADMIN", "users:write")).toBe(true);
  });
});

describe("email templates", () => {
  it("escapes user content", () => {
    const r = renderEmail("revision_received", { firstName: "<b>x</b>", comment: "<script>alert(1)</script>" }, "https://example.com");
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });
  it("respects the 24h mockup promise flag", () => {
    expect(renderEmail("mockup_received", { mockup24h: true }, "https://x.co").text).toContain("within 24 hours");
    expect(renderEmail("mockup_received", { mockup24h: false }, "https://x.co").text).not.toContain("24 hours");
  });
  it("uses the specified subjects", () => {
    expect(renderEmail("mockup_received", {}, "https://x.co").subject).toBe("We've got your artwork 👀");
    expect(renderEmail("proof_ready", {}, "https://x.co").subject).toBe("Your Gorilla Proof Is Ready");
    expect(renderEmail("shipped", {}, "https://x.co").subject).toBe("Your patches are on the move.");
  });
});
