import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/providers/theme-provider.client";
import { Toaster } from "sonner";
import "../styles/index.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_TITLE ?? "Fractera — Production-Coding AI Server",
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Production-Coding AI Server — multiple frontier AI models running entirely on your own server. No cloud lock-in.",
};

const defaultTheme = process.env.NEXT_PUBLIC_DEFAULT_THEME ?? "light";
const defaultLang  = process.env.NEXT_PUBLIC_LANG ?? "en";

const themeScript = `
(function() {
  var saved = localStorage.getItem('fractera-theme');
  var theme = saved || '${defaultTheme}';
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLang} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
