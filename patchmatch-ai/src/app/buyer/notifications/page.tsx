import type { Metadata } from "next";
import { requireBuyer } from "@/lib/auth/session";
import { NotificationList } from "@/components/layout/NotificationList";

export const metadata: Metadata = { title: "Notifications" };

export default async function BuyerNotifications() {
  const { user } = await requireBuyer("/buyer/notifications");
  return <NotificationList userId={user.id} />;
}
