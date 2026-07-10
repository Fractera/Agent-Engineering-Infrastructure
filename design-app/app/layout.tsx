import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fractera | Design",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
