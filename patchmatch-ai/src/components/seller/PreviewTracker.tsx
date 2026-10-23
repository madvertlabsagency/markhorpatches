"use client";

import { useEffect } from "react";
import { trackPreviewAction } from "@/app/actions/seller";

export function PreviewTracker({ rfqId }: { rfqId: string }) {
  useEffect(() => {
    void trackPreviewAction(rfqId).catch(() => {});
  }, [rfqId]);
  return null;
}
