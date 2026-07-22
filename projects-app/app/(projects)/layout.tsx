import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/providers/theme-provider.client";
import { ThemeInit } from "@/components/theme-init";
import { bodyFontClass } from "@/lib/fonts";
import { DEFAULT_LANGUAGE } from "@/config/translations/translations.config";
import { requireRole } from "@/lib/auth/require-role";
import { getAppConfig } from "@/config/app-config";
import { ProjectsZoneHeader } from "@/app/(projects)/_components/projects-zone-header.server";
import { ProjectsZoneFooter } from "@/app/(projects)/_components/projects-zone-footer.client";
import { ZoneWidthInit } from "@/app/(projects)/_components/zone-width-init";
import { AutomationPageChrome } from "@/app/(projects)/projects/_shared/components/automation-page-chrome.client";

// Root layout of the Projects layer (§3.12, step 175). Projects are independent
// application levels for PRIVATE use by the architect or a project administrator —
// unlike pages (open to any role), the whole /projects zone admits only
// architect + manager; everyone else is redirected by requireRole(). The zone
// lives at the bare root with no language prefix (proxy.ts keeps "projects" in
// SERVICE_ROOTS) and is MONOLINGUAL: one language — the site's default — so this
// zone owns a static <html lang={DEFAULT_LANGUAGE}>. Pages here are dynamic
// (role gate reads cookies) — the sanctioned cockpit exception to static-first.
// Not indexed; no JSON-LD / GA.
//
// Title = "<brand> | Projects" so the browser tab reads the owner's company name
// (short_name from the live app-config, "Fractera" by default) followed by the zone.
// A child page (a specific project) may override with its own title; those that
// don't inherit this zone title. generateMetadata (not a static const) because the
// brand is a per-request read of the on-disk app-config.
export async function generateMetadata(): Promise<Metadata> {
  const brand = getAppConfig().short_name || "Fractera";
  return {
    title: `${brand} | Projects`,
    robots: { index: false, follow: false },
  };
}

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["architect", "manager"]);
  return (
    <html lang={DEFAULT_LANGUAGE} suppressHydrationWarning>
      <head>
        <ThemeInit />
        {/* Ширина колонки зоны (обычная ↔ широкая) — поднимается до отрисовки,
            как и тема, чтобы широкий режим не «прыгал» после гидрации. */}
        <ZoneWidthInit />
      </head>
      <body className={bodyFontClass}>
        <ThemeProvider>
          <ProjectsZoneHeader />
          {/* THE AUTOMATION PAGE'S CHROME (step 241 E3.1) — the development-wave banner, the page lock and
              the launch control panel, mounted ONCE here rather than in the frozen skeleton. A project's page
              is GENERATED code: chrome mounted in the skeleton only ever reaches projects created afterwards,
              so every automation that already existed showed nothing (the owner hit exactly this). The zone
              layout wraps EVERY automation page — old and new — so this can never drift again. It renders
              nothing on the hubs; the automation is derived from the URL, like the footer already does. */}
          <AutomationPageChrome>{children}</AutomationPageChrome>
          {/* Single zone footer (step 213): identical for every project + hub, rendered
              ONCE here so no page re-assembles it. The Architecture deep-link focuses the
              current project, derived from the URL inside the footer. */}
          <ProjectsZoneFooter shortName={getAppConfig().short_name} />
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
