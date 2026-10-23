"use server";

import { z } from "zod";
import { alertAdmins } from "@/lib/notifications";
import { queueEmail } from "@/lib/notifications";
import { guard, str, toActionError } from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";

export async function contactAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const limited = await guard("contact", 5, 30 * 60_000);
  if (limited) return limited;
  if (str(fd, "company_url")) return { ok: true, message: "Thanks — we'll be in touch." };
  try {
    const d = z
      .object({ name: z.string().min(2).max(120), email: z.string().email("Enter a valid email"), topic: z.enum(["buyer", "seller", "privacy", "other"]), message: z.string().min(10, "Message is too short").max(4000) })
      .parse({ name: str(fd, "name"), email: str(fd, "email"), topic: str(fd, "topic"), message: str(fd, "message") });
    const key = `contact:${d.email}:${Date.now()}`;
    await alertAdmins(`Contact (${d.topic}) from ${d.name}`, `${d.email}: ${d.message.slice(0, 900)}`, "/admin/notifications", key, ["SUPER_ADMIN", "ADMIN", "SUPPORT"]);
    if (process.env.SUPPORT_EMAIL) await queueEmail(process.env.SUPPORT_EMAIL, "admin_alert", { title: `Contact form: ${d.topic}`, message: `${d.name} <${d.email}>\n\n${d.message}`, url: "" }, key);
    return { ok: true, message: "Thanks — a member of our team will reply by email." };
  } catch (e) {
    return toActionError(e);
  }
}
