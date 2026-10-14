"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
interface ToastItem { id: number; title: string; description?: string; tone: Tone }

const Ctx = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-3), { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.tone === "error" ? 8000 : 4500);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6" role="region" aria-label="Notifications">
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                role={t.tone === "error" ? "alert" : "status"}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-navy p-4 text-white shadow-2xl ring-1 ring-white/10"
              >
                <I className={cn("mt-0.5 h-5 w-5 shrink-0", t.tone === "success" ? "text-turquoise" : t.tone === "error" ? "text-gold-hi" : "text-electric")} aria-hidden />
                <div className="flex-1">
                  <p className="font-semibold">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-sm text-white/70">{t.description}</p>}
                </div>
                <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} aria-label="Dismiss" className="text-white/60 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
