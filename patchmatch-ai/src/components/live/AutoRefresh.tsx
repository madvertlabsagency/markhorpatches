"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the current server page every few seconds while visible (new opportunities appear on their own). */
export function AutoRefresh({ everyMs = 7000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}
