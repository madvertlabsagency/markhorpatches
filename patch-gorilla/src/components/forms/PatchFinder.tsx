"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { QUESTIONS, recommend, type Answers } from "@/lib/patch-finder";
import { PatchArt } from "@/components/brand/PatchArt";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function PatchFinder({ types }: { types: Record<string, { name: string; slug: string; shortDescription: string }> }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [i, setI] = useState(0);
  const done = i >= QUESTIONS.length;
  const q = QUESTIONS[i];
  const results = done ? recommend(answers).filter((r) => types[r.code]) : [];
  const top = results[0];

  return (
    <div className="rounded-[2rem] bg-white p-6 text-navy shadow-2xl sm:p-10">
      {!done && (
        <>
          <div className="flex items-center justify-between text-sm"><span className="eyebrow text-slate">Question {i + 1} / {QUESTIONS.length}</span>{i > 0 && <button onClick={() => setI(i - 1)} className="flex items-center gap-1 font-semibold text-slate hover:text-navy"><ArrowLeft className="h-4 w-4" aria-hidden /> Back</button>}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-navy/10"><motion.div className="bg-signature h-full" animate={{ width: `${(i / QUESTIONS.length) * 100}%` }} /></div>
        </>
      )}
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.fieldset key={q.key} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="mt-8">
            <legend className="display text-5xl">{q.q}</legend>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {q.options.map((o) => {
                const sel = answers[q.key] === o.value;
                return (
                  <button key={o.value} type="button" aria-pressed={sel} onClick={() => { setAnswers({ ...answers, [q.key]: o.value }); setI(i + 1); }} className={cn("flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition", sel ? "border-electric bg-electric/5" : "border-navy/10 hover:border-navy/40")}>
                    <span><span className="block font-semibold">{o.label}</span>{o.hint && <span className="text-sm text-slate">{o.hint}</span>}</span>
                    {sel && <Check className="h-5 w-5 text-electric" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </motion.fieldset>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} role="status" aria-live="polite">
            <p className="hand -rotate-2 text-2xl text-electric">Our pick for you…</p>
            {top && (
              <div className="mt-4 grid items-center gap-6 sm:grid-cols-[160px_1fr]">
                <motion.div initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: -6, scale: 1 }} transition={{ type: "spring" }}><PatchArt code={top.code} title="" /></motion.div>
                <div>
                  <h2 className="display text-6xl">{types[top.code].name}</h2>
                  <p className="mt-2 text-slate">{types[top.code].shortDescription}</p>
                  <ul className="mt-3 space-y-1">{top.reasons.slice(0, 3).map((r) => <li key={r} className="flex items-center gap-2 text-sm font-medium"><Check className="h-4 w-4 text-success" aria-hidden />{r}</li>)}</ul>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <ButtonLink href={`/build-your-patch?type=${top.code}`} arrow>Build this patch</ButtonLink>
                    <ButtonLink href={`/${types[top.code].slug}`} variant="outline">Learn more</ButtonLink>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-10 border-t border-line pt-6">
              <p className="font-semibold">Also worth a look — or pick any style you like:</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {results.slice(1).map((r) => (
                  <li key={r.code}><Link href={`/build-your-patch?type=${r.code}`} className="inline-flex items-center gap-2 rounded-full bg-ice py-1.5 pl-1.5 pr-4 text-sm font-semibold hover:bg-navy hover:text-white"><span className="w-7"><PatchArt code={r.code} title="" /></span>{types[r.code].name}</Link></li>
                ))}
              </ul>
              <button onClick={() => { setAnswers({}); setI(0); }} className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate hover:text-navy"><RotateCcw className="h-4 w-4" aria-hidden /> Start over</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
