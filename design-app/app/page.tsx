import { Palette } from "lucide-react";

// A.2 "coming soon" index (step 197). The Design service is stood up now as a real, architect-
// gated process (owner decision) so the design layer is later developed on its OWN port —
// exactly like Projects — never bundled back into admin. Real content will live under a
// (design) route group here. Gated by proxy.ts (architect-only); static until it has content.
export const dynamic = "force-static";

export default function DesignComingSoon() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "34rem" }}>
        <Palette size={40} strokeWidth={1.5} style={{ opacity: 0.6, margin: "0 auto" }} />
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "1rem" }}>Design</h1>
        <p style={{ marginTop: "0.75rem", opacity: 0.7, lineHeight: 1.6 }}>
          This layer is coming soon — the app design system will be built here, on its own
          process (step 197).
        </p>
      </div>
    </main>
  );
}
