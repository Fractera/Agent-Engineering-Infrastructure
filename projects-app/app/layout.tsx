import type { Metadata } from "next";
import "./globals.css";

// A.1 placeholder root layout (step 197). The Projects zone is monolingual and owns its OWN
// <html> (app/(projects)/layout.tsx), so once that zone moves here in 197.4 it renders inside
// its route group and this root layout only wraps the (empty) root. Kept intentionally thin.
export const metadata: Metadata = {
  title: "Fractera | Projects",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
