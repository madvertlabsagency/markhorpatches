"use server";

import { assertAdmin } from "@/lib/auth/session";
import { askAdminAssistant } from "@/lib/ai/admin-assistant";

export async function askAssistantAction(question: string) {
  const admin = await assertAdmin("analytics:view");
  if (!question.trim()) return null;
  return askAdminAssistant(question, admin.id);
}
