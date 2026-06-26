"use client";

import Link from "next/link";

// Error boundary for the public [lang] surface (step 149 — language-safety vaccine).
// SHARED engine brick, installed copy-if-absent by the Frozen Template Constructor so EVERY
// composed slot degrades instead of returning a raw HTTP 500.
//
// Next REQUIRES error.tsx to be a Client Component: this is the sanctioned exception to the
// "no client component owns a route" rule — it is a framework error boundary, NOT a route owner.
// Next server-renders this fallback's HTML when a render throws, so the message is readable with
// JavaScript OFF; only "Try again" (reset) needs JS. It renders INSIDE the [lang] layout's <html>.
//
// WHY: without a boundary, ANY thrown error in this subtree — a malformed document, a structurally
// invalid locale tag, an unexpected language file, a bad block — returns Internal Server Error.
// With it, the route DEGRADES and the rest of the site is unaffected.
export default function LangError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-white px-8 py-16 text-black">
      <p className="font-mono text-sm font-bold uppercase tracking-widest text-black/50">
        Something went wrong
      </p>
      <h1 className="max-w-2xl text-center text-3xl font-bold leading-tight tracking-tight md:text-4xl">
        This page could not be displayed
      </h1>
      <p className="max-w-md text-center text-base leading-relaxed text-black/70">
        We hit an unexpected problem rendering this page. The rest of the site is unaffected.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-black/20 px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-black/[0.04]"
        >
          Back to home
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </main>
  );
}
