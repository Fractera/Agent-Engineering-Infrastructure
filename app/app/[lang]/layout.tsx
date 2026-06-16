import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/providers/theme-provider.client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HighlightFineTuneProvider } from "@/providers/highlight-fine-tune-provider.client";
import { ScreenWidthProvider } from "@/providers/screen-width-provider.client";
import { WidthToggleProvider } from "@/providers/width-toggle-provider.client";
import { HeaderHeightProvider } from "@/providers/header-height-provider.client";
import { PanelStateProvider } from "@/providers/panel-state-provider.client";
import { FooterContainer } from "@/components/containers/footer-container.client";
import { HEADER_HEIGHT_PX } from "@/config/ui/layout.config";
import { getAppConfig } from "@/config/app-config";
import { constructMetadata } from "@/lib/construct-metadata";
import { buildOrganizationSchema, buildWebSiteSchema, buildLocalBusinessSchema } from "@/lib/jsonld";
import { SUPPORTED_LANGUAGES } from "@/config/translations/translations.config";
import { resolveLang } from "@/lib/routing/resolve-lang";
import { getPlatformConfig } from "@/config/platform-config";
import { ConfigReloadWatcher } from "@/components/platform/config-reload-watcher.client";

// The [lang] layout is the REAL frame — matching the 22slots reference, which keeps the root
// layout flat and puts <html>/<body>, fonts, theme, metadata, JSON-LD, analytics and the layout
// frame here (where the language is known). It runs in BOTH modes:
//   - parallelRouting OFF (default): render the flat page tree (`children`) inside the frame —
//     today's behaviour, no visible change.
//   - parallelRouting ON: arrange the named parallel-route slots instead; `children` is NOT
//     rendered. FOOTER-FIRST: @footer is wired; other slots are ported one at a time (commented).
// Read at runtime (platform-config.json) so flipping applies on the next request, no rebuild.

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }));
}

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

// Anti-FOUC script: set the `dark` class before paint. Precedence matches ThemeProvider:
// localStorage (user toggle) > server config default (passed in) > 'light'.
function buildThemeScript(defaultTheme: string): string {
  return `
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
}

type SlotLayoutProps = {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  left: ReactNode;
  right: ReactNode;
  center: ReactNode;
  centerHeader: ReactNode;
  centerFooter: ReactNode;
  breadcrumb: ReactNode;
  promoScreen: ReactNode;
  notification: ReactNode;
  faq: ReactNode;
  footerModal: ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function LangLayout(props: SlotLayoutProps) {
  const { children, footer } = props;
  const { lang } = await props.params;
  const validLang = resolveLang(lang);

  const cfg = getAppConfig();
  const ld: Record<string, unknown>[] = [];
  if (cfg.jsonLd.website) ld.push(buildWebSiteSchema(cfg));
  if (cfg.jsonLd.organization) ld.push(buildOrganizationSchema(cfg));
  if (cfg.jsonLd.localBusiness) {
    const lb = buildLocalBusinessSchema(cfg);
    if (lb) ld.push(lb);
  }
  const gaId = cfg.analytics.enabled ? cfg.analytics.googleAnalyticsId : undefined;

  const platform = getPlatformConfig();
  const { parallelRouting, slots } = platform;
  const themeDefault = platform.theme?.default ?? "light";
  const centerWidth = platform.centerWidth ?? "narrow";
  const reloadNonce = platform.reloadNonce ?? 0;
  const themeScript = buildThemeScript(themeDefault);

  // Mode content: OFF → the flat page tree; ON → the footer-first slot frame.
  const content = !parallelRouting ? (
    children
  ) : (
    <div className="relative min-h-screen">
      {/* {slots.promoScreen && props.promoScreen} */}
      {/* {props.notification} */}
      {/* {slots.header && <HeaderContainer>{props.header}</HeaderContainer>} */}
      {/* {props.breadcrumb} */}
      {/* {slots.left && <LeftContainer>{props.left}</LeftContainer>} */}
      {/* {slots.right && <RightContainer>{props.right}</RightContainer>} */}
      {/* <MainScrollArea promoScreen={...} notification={...} breadcrumb={...} faq={props.faq}>
            {slots.centerHeader && props.centerHeader}
            {slots.center && props.center}
            {slots.centerFooter && props.centerFooter}
          </MainScrollArea> */}
      {slots.footer && <FooterContainer alwaysVisible>{footer}</FooterContainer>}
      {/* {props.footerModal} */}
    </div>
  );

  return (
    <html lang={validLang} suppressHydrationWarning>
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
        <ThemeProvider defaultMode={themeDefault}>
          <TooltipProvider>
            <HighlightFineTuneProvider>
              <ScreenWidthProvider>
                <WidthToggleProvider defaultWidth={centerWidth}>
                  <HeaderHeightProvider initialHeight={HEADER_HEIGHT_PX}>
                    <PanelStateProvider>
                      {content}
                    </PanelStateProvider>
                  </HeaderHeightProvider>
                </WidthToggleProvider>
              </ScreenWidthProvider>
            </HighlightFineTuneProvider>
          </TooltipProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
        <ConfigReloadWatcher nonce={reloadNonce} />
      </body>
    </html>
  );
}
