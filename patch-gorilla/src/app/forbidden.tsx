import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="grid min-h-screen place-items-center bg-offwhite px-4 text-center text-navy">
      <div>
        <h1 className="display text-5xl">No access.</h1>
        <p className="mt-3 text-slate">Your account doesn&apos;t have permission to view this page.</p>
        <Link href="/" className="mt-6 inline-block font-semibold text-patch">Back to the site</Link>
      </div>
    </main>
  );
}
