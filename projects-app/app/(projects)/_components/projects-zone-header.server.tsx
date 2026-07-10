import Link from "next/link";
import { getAppConfig } from "@/config/app-config";
import { AccountButton } from "@/components/menu/account/account-button.client";
import { accountLabels } from "@/components/menu/account/account-menu.i18n";
import { getProjectsManifest } from "@/app/(projects)/projects/_shared/projects-manifest";
import { DEFAULT_LANGUAGE } from "@/config/translations/translations.config";

// Mandatory header of the Projects zone (step 186.1). Unlike the public TopMenu
// (conditional — renders nothing until a group or public auth asks for it), this
// header is ALWAYS present: the whole /projects zone is gated to architect/manager
// by requireRole() in app/(projects)/layout.tsx, so the account control — and with
// it the Projects switcher (AccountDrawer → AccountProjects) — is a permanent
// fixture here, the primary way to move between projects/layers. Server component:
// the projects manifest is a build-time fs-scan (SSG-safe, no request at render).
// The zone is MONOLINGUAL (DEFAULT_LANGUAGE), so brand + labels use that one
// language. Brand links back to the public home (logo → home convention); the
// zone has no single index route (only the four category pages).
export async function ProjectsZoneHeader() {
  const cfg = getAppConfig();
  const lang = DEFAULT_LANGUAGE;
  const projects = await getProjectsManifest();

  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="w-full px-6 md:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand: the SHORT company name is ALWAYS shown; the logo sits beside it
            when one is uploaded (logo + wordmark together, never either/or). */}
        <Link
          href={`/${lang}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 min-w-0"
        >
          {cfg.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.logo} alt="" className="h-7 w-auto object-contain" />
          )}
          <span className="text-sm font-semibold tracking-tight text-foreground truncate">
            {cfg.short_name}
          </span>
        </Link>

        {/* Account island — always rendered here (zone is auth-gated). The account
            drawer carries the Projects switcher for architect/manager. side="right"
            is fixed: the zone's auth does not depend on the public NEXT_PUBLIC_APP_SHELL_AUTH toggle. */}
        <div className="flex items-center gap-2 shrink-0">
          <AccountButton lang={lang} side="right" labels={accountLabels(lang)} projects={projects} />
        </div>
      </div>
    </header>
  );
}
