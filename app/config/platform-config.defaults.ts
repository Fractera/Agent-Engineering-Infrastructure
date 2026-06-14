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

export interface PlatformConfig {
  // Routing
  parallelRouting: boolean;

  // Languages (mirror of build-time env; the env is authoritative)
  languages: string[];
  defaultLanguage: string;

  // Theme (step 118)
  theme: {
    default: ThemeChoice;
    allowUserToggle: boolean;
  };
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  parallelRouting: false,
  languages: ["en"],
  defaultLanguage: "en",
  theme: {
    default: "light",
    allowUserToggle: true,
  },
};
