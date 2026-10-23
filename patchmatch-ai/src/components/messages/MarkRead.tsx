"use client";

import { useEffect } from "react";

export function MarkRead({ conversationId, action }: { conversationId: string; action: (id: string) => Promise<void> }) {
  useEffect(() => {
    void action(conversationId);
  }, [conversationId, action]);
  return null;
}
