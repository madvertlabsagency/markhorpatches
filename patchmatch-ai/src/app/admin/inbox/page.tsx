import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { NotificationList } from "@/components/layout/NotificationList";

export const metadata: Metadata = { title: "Admin notifications" };

export default async function AdminInbox() {
  const user = await requireAdmin();
  return <NotificationList userId={user.id} />;
}
