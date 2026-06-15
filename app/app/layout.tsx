import "../styles/index.css";

// Maximally flat root layout — matches the 22slots reference (`return children`). The
// <html>/<body>, fonts, theme, metadata, JSON-LD, analytics and the whole layout frame live in
// app/[lang]/layout.tsx (where the language is known). The root is just a CSS-importing
// pass-through. Do NOT move html/body/theme/metadata back here — that breaks the reference's
// professionally-crafted structure (see ARCHITECTURE-PARALLEL-ROUTING.md).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
