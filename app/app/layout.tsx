import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/providers/theme-provider.client";
import { Toaster } from "sonner";
import "../styles/index.css";
import { getAppConfig } from "@/config/app-config";
import { constructMetadata } from "@/lib/construct-metadata";
import { buildOrganizationSchema, buildWebSiteSchema, buildLocalBusinessSchema } from "@/lib/jsonld";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Render at runtime so Admin -> Site Settings (the on-disk app-config.json) is reflected on the
// next request without a rebuild. The Shell is an interactive workspace, not a static site.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return constructMetadata();
}

export function generateViewport(): Viewport {
  const cfg = getAppConfig();
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: cfg.themeColors.light },
      { media: "(prefers-color-scheme: dark)", color: cfg.themeColors.dark },
    ],
  };
}

const defaultTheme = process.env.NEXT_PUBLIC_DEFAULT_THEME ?? "light";

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
  const cfg = getAppConfig();
  const ld: Record<string, unknown>[] = [];
  if (cfg.jsonLd.website) ld.push(buildWebSiteSchema(cfg));
  if (cfg.jsonLd.organization) ld.push(buildOrganizationSchema(cfg));
  if (cfg.jsonLd.localBusiness) {
    const lb = buildLocalBusinessSchema(cfg);
    if (lb) ld.push(lb);
  }

  const gaId = cfg.analytics.enabled ? cfg.analytics.googleAnalyticsId : undefined;

  return (
    <html lang={cfg.lang} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        {ld.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
            </Script>
          </>
        )}
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
