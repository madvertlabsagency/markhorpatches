import { CheckCircle2, FileCheck2, Factory, Palette, SlidersHorizontal, Truck, Upload } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { ThreadLine } from "@/components/brand/marks";
import { cn } from "@/lib/utils";

export const PROCESS = [
  { icon: Upload, title: "Upload your design", body: "Logo, sketch or napkin doodle — any format." },
  { icon: SlidersHorizontal, title: "Customize your patch", body: "Pick type, size, shape, backing and extras." },
  { icon: Palette, title: "Get your digital proof", body: "Our designers prepare your production-ready proof." },
  { icon: FileCheck2, title: "Approve it", body: "Request changes until it's right. Then approve." },
  { icon: Factory, title: "We produce & quality check", body: "Made to your approved spec, checked before it ships." },
  { icon: Truck, title: "We ship it", body: "Tracked delivery to your door." },
];

export function ProcessSteps({ dark, compact }: { dark?: boolean; compact?: boolean }) {
  return (
    <div className="relative">
      <ThreadLine className="absolute left-0 right-0 top-9 hidden lg:block" />
      <Stagger as="ol" className={cn("relative grid gap-4 sm:grid-cols-2", compact ? "lg:grid-cols-3" : "lg:grid-cols-6")}>
        {PROCESS.map((s, i) => (
          <StaggerItem as="li" key={s.title} className="relative">
            <div className={cn("group h-full rounded-[var(--radius-patch)] p-5 transition-all duration-500 hover:-translate-y-1", dark ? "bg-white/5 ring-1 ring-white/10 hover:bg-white/10" : "bg-white shadow-lift ring-1 ring-navy/5")}>
              <div className="flex items-center justify-between">
                <span className={cn("relative grid h-14 w-14 place-items-center rounded-2xl", dark ? "bg-turquoise/10 text-turquoise" : "bg-ice text-patch")}>
                  <s.icon className="h-6 w-6" aria-hidden />
                </span>
                <span className={cn("font-display text-4xl font-black", dark ? "text-white/15" : "text-navy/10")}>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className={cn("mt-5 font-display text-2xl font-extrabold uppercase leading-none", dark ? "text-white" : "text-navy")}>{s.title}</h3>
              <p className={cn("mt-2 text-sm leading-relaxed", dark ? "text-white/65" : "text-slate")}>{s.body}</p>
              {i === 3 && <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-success" aria-label="Approval step" />}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
