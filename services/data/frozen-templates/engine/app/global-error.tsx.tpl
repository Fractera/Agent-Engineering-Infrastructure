"use client";

// Root error boundary (step 149 — language-safety vaccine). SHARED engine brick, installed
// copy-if-absent by the Frozen Template Constructor. This is the UNIVERSAL safety net: it catches
// any error that escapes every nested boundary — including an error thrown by the root layout itself
// or by an architect-only (service) page — so the app NEVER falls back to Next's raw, unstyled HTTP
// 500 (a deployed slot with NO error page renders "/500" as ENOENT). It REPLACES the root layout, so
// it must declare its own <html>/<body>; global CSS is not guaranteed here, so the markup is
// inline-styled and self-contained. 'use client' is framework-mandated for error.tsx.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          background: "#fff",
          color: "#000",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "4rem 2rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.5)", margin: 0 }}>
          Something went wrong
        </p>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.15, margin: 0, maxWidth: "40rem" }}>
          This page could not be displayed
        </h1>
        <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "rgba(0,0,0,0.7)", margin: 0, maxWidth: "28rem" }}>
          We hit an unexpected problem. The rest of the site is unaffected.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{ borderRadius: "9999px", background: "#000", color: "#fff", border: "none", padding: "0.75rem 1.5rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{ borderRadius: "9999px", border: "1px solid rgba(0,0,0,0.2)", color: "#000", padding: "0.75rem 1.5rem", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none" }}
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
