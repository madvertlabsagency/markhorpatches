"use client";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function PurchaseTracker({ orderNumber, valueCents }: { orderNumber: string; valueCents: number }) {
  useEffect(() => {
    const key = `pg_purchase_${orderNumber}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    track("purchase", { transaction_id: orderNumber, value: valueCents / 100, currency: "USD" });
  }, [orderNumber, valueCents]);
  return null;
}
