import "../styles/index.css";

// Bare pass-through root layout — mirrors FNS app/layout.tsx (step 131). Renders NO
// <html>/<body> and calls NO dynamic functions, so each zone owns its own root layout with its
// own <html>. Here the only content zone is app/(projects)/layout.tsx (<html lang={DEFAULT}>).
// styles/index.css is imported once so design tokens apply across the zone.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
