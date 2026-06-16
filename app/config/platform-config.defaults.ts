// Platform configuration — TYPES + DEFAULTS only (pure data, no fs / no env reads).
//
// This is the STRUCTURAL counterpart to app-config.defaults.ts (step 115, which holds
// branding/SEO/PWA). It governs how the Shell is laid out and routed:
//   - parallelRouting: render the named parallel-route slots (true) or the flat
//     `children` page (false, today's behaviour). Read at runtime by app/[lang]/layout.tsx,
//     so flipping it in Admin -> Platform applies on the next request WITHOUT a rebuild.
//   - languages / defaultLanguage: MIRROR of the build-time env
//     NEXT_PUBLIC_SUPPORTED_LANGUAGES / NEXT_PUBLIC_DEFAULT_LOCALE. The env is the real
//     source of truth (it feeds generateStaticParams for [lang]); these fields let the
//     Platform panel show/manage the selection. Changing the language SET needs a rebuild.
//   - theme: default theme + whether the in-Shell user toggle is offered (step 118).
//
// Safe to import from anywhere (server OR client): pure shape + committed defaults. The
// live config is a runtime JSON file on disk read by config/platform-config.ts (server-only).

export type ThemeChoice = "light" | "dark" | "system";

// The named layout slots the parallel-routes selector manages (ported from the reference's
// HeaderLayoutDashboardDialog). `header`/`footer` are always on (locked in the UI). When parallel
// routing is on, app/[lang]/layout.tsx places only the slots whose flag is true.
export type LayoutSlotName =
  | "header"
  | "promoScreen"
  | "left"
  | "right"
  | "centerHeader"
  | "center"
  | "centerFooter"
  | "footer";

export type LayoutSlots = Record<LayoutSlotName, boolean>;

export interface PlatformConfig {
  // Routing
  parallelRouting: boolean;
  // Which named layout slots are active (only consulted when parallelRouting is on).
  slots: LayoutSlots;

  // Languages (mirror of build-time env; the env is authoritative)
  languages: string[];
  defaultLanguage: string;

  // Theme (step 118)
  theme: {
    default: ThemeChoice;
    allowUserToggle: boolean;
  };

  // Footer-toolbar defaults the footer-slot MCP controls (footer_slot_owner_set_center_width).
  // Default center-column width the width-toggle starts from on load: "narrow" | "wide".
  centerWidth: "narrow" | "wide";

  // Bumped by an "apply now" MCP write so open tabs reload and pick up the new default
  // (a tiny client poller watches /api/platform/signature). 0 = never applied-now yet.
  reloadNonce: number;

  // Footer plugin toggles. The reference app gated these footer features through the
  // plugin marketplace; we have no marketplace, so they live here (Admin -> Platform).
  // get-active-plugins-for-slot maps them to the reference plugin ids the footer reads.
  footerPlugins: {
    themeToggle: boolean;      // dark/light switch
    languageSwitcher: boolean; // language picker
    widthToggle: boolean;      // center width toggle
    footerPages: boolean;      // footer navigation pages
  };
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  parallelRouting: false,
  slots: {
    header: true,
    promoScreen: true,
    left: true,
    right: true,
    centerHeader: true,
    center: true,
    centerFooter: true,
    footer: true,
  },
  languages: ["en"],
  defaultLanguage: "en",
  theme: {
    default: "light",
    allowUserToggle: true,
  },
  centerWidth: "narrow",
  reloadNonce: 0,
  footerPlugins: {
    themeToggle: true,
    languageSwitcher: true,
    widthToggle: true,
    footerPages: true,
  },
};
