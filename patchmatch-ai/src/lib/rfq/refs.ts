import { randomInt } from "node:crypto";

// Unambiguous characters (no 0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function newRfqRef() {
  return `PM-${randomCode(6)}`;
}

export function newReceiptNumber(now = new Date()) {
  return `R-${now.getUTCFullYear()}-${randomCode(8)}`;
}

export function newInvoiceNumber(now = new Date()) {
  return `INV-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}-${randomCode(6)}`;
}
