"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-full bg-navy px-6 py-3 font-semibold text-white">Print / Save as PDF</button>;
}
