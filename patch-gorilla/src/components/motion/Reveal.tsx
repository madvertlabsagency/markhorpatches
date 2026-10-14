"use client";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({ children, className, delay = 0, y = 28, as = "div" }: { children: React.ReactNode; className?: string; delay?: number; y?: number; as?: "div" | "section" | "li" | "span" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.75, delay, ease }}>
      {children}
    </Comp>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const child: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } };

export function Stagger({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "ul" | "ol" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp className={className} variants={container} initial={reduce ? "show" : "hidden"} whileInView="show" viewport={{ once: true, margin: "-60px" }}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" }) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={child}>
      {children}
    </Comp>
  );
}

/** Headline that reveals word-by-word. Keeps the real text for screen readers. */
export function SplitHeadline({ text, className, as = "h2", highlight = [] }: { text: string; className?: string; as?: "h1" | "h2" | "h3"; highlight?: string[] }) {
  const reduce = useReducedMotion();
  const Tag = as;
  const words = text.split(" ");
  return (
    <Tag className={cn(className)} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.06em] align-bottom">
          <motion.span
            className={cn("inline-block", highlight.includes(w.replace(/[^\w]/g, "")) && "text-gradient")}
            initial={reduce ? false : { y: "105%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.06, ease }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
