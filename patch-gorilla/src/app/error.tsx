"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="grid min-h-screen place-items-center bg-offwhite px-4 text-center text-navy">
      <div>
        <h1 className="display text-5xl">Something went wrong.</h1>
        <p className="mx-auto mt-3 max-w-md text-slate">We hit an unexpected error. Nothing was charged. Please try again — if it keeps happening, contact support{error.digest ? ` and mention reference ${error.digest}` : ""}.</p>
        <button onClick={reset} className="bg-signature mt-6 rounded-full px-6 py-3 font-display text-lg font-extrabold uppercase text-white">Try again</button>
      </div>
    </main>
  );
}
