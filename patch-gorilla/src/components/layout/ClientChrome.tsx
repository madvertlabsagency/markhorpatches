"use client";
import { useEffect } from "react";
import { captureUtm } from "@/lib/analytics";
import { ToastProvider } from "@/components/ui/Toast";

export function ClientChrome({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    captureUtm();
  }, []);
  return <ToastProvider>{children}</ToastProvider>;
}
