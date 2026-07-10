// Site configuration — TYPES + DEFAULTS only (pure data, no fs / no env reads).
//
// This file is safe to import from anywhere (server OR client): it holds the AppConfig
// shape and the committed Fractera defaults that seed a fresh server. The live config is
// a runtime JSON file on disk read by config/app-config.ts (server-only) — changing it in
// Admin -> Site Settings updates branding/SEO/PWA WITHOUT a rebuild (no NEXT_PUBLIC bake-in).
//
// Ported from the 22slots app-config pattern, adapted so image fields hold OBJECT-STORAGE
// references (media URLs / an icon-set id) instead of static public/ paths.

export type ImageFormat = "png" | "jpg" | "jpeg" | "webp" | "avif" | "svg" | "gif";

export type RegularImageType =
  | "ogImage"
  | "loading-dark"
  | "loading-light"
  | "notFound-dark"
  | "notFound-light"
  | "error500-dark"
  | "error500-light"
  | "homePage-dark"
  | "homePage-light"
  | "chatbot-dark"
  | "chatbot-light";

export type AllImageTypes = RegularImageType | "logo";

export interface AuthorConfig {
  name: string;
  email?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  url?: string;
  jobTitle?: string;
  bio?: string;
  image?: string;
}

export interface SocialConfig {
  twitter?: string;
  github?: string;
  linkedin?: string;
  facebook?: string;
}

export type ContentType = "website" | "article" | "blog" | "product" | "documentation";
export type OpenGraphTypeConfig = ContentType | "profile" | "video.other";

export interface ContentTypeDefaults {
  blog: ContentType;
  product: ContentType;
  documentation: ContentType;
}

// A generated PWA/favicon icon set — produced by the Data service POST /media/generate-icons
// from one square logo. `files` maps logical names (favicon_ico, icon_192, ...) to the
// per-file path the icons-serving route resolves. `id` is the icon_set row id.
export interface IconSet {
  id: string;
  files: Record<string, string>;
}

export interface AppConfig {
  name: string;
  short_name: string;
  description: string;
  url: string;
  manifest: string;
  mailSupport: string;
  lang: string;
  chatBrand: string;

  // Object-storage references (media URL like /api/media/{id}/file) or null when unset.
  images: Record<RegularImageType, string | null>;
  logo: string | null;

  // Individual icon URLs (used when no generated set is present).
  icons: {
    faviconAny?: string;
    icon32?: string;
    icon48?: string;
    icon192?: string;
    icon512?: string;
    icon512Maskable?: string;
    appleTouch?: string;
  };
  // A generated set takes precedence over `icons` for manifest + <head> links.
  iconSet: IconSet | null;

  pwa: {
    themeColor: string;
    backgroundColor: string;
    startUrl: string;
    display: "fullscreen" | "standalone" | "minimal-ui" | "browser";
    scope?: string;
    orientation?: "any" | "portrait-primary" | "landscape-primary";
  };
  themeColors: { light: string; dark: string };

  seo: {
    indexing: "allow" | "disallow";
    titleTemplate?: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
    keywords?: string;
    canonicalBase?: string;
    sitemapUrl?: string;
    disallowPaths?: string[];
    locales?: string[];
    defaultLocale?: string;
    googleVerification?: string;
    yandexVerification?: string;
    social: SocialConfig;
  };

  og: {
    type: OpenGraphTypeConfig;
    locale?: string;
    siteName?: string;
    imageWidth: number;
    imageHeight: number;
  };

  author: AuthorConfig;
  analytics: { googleAnalyticsId?: string; enabled: boolean };
  jsonLd: { website: boolean; organization: boolean; localBusiness: boolean };
  geo: {
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    phone?: string;
    latitude?: string;
    longitude?: string;
    hours?: string;
  };
  contentTypeDefaults: ContentTypeDefaults;
  // Menu shell (step 160). DEPRECATED (step 161): authButton no longer drives the header —
  // public auth is now the build-time key NEXT_PUBLIC_APP_SHELL_AUTH (null|left|right), read by
  // components/menu/account/. Field kept for on-disk app-config.json back-compat; it is a no-op.
  menus: { authButton: boolean };
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  name: "Fractera — Production-Coding AI Server",
  short_name: "Fractera",
  description:
    "Production-Coding AI Server — multiple frontier AI models running entirely on your own server. No cloud lock-in.",
  url: "https://www.fractera.ai",
  manifest: "/manifest.webmanifest",
  mailSupport: "admin@fractera.ai",
  lang: "en",
  chatBrand: "Hermes",

  images: {
    ogImage: null,
    "loading-dark": null,
    "loading-light": null,
    "notFound-dark": null,
    "notFound-light": null,
    "error500-dark": null,
    "error500-light": null,
    "homePage-dark": null,
    "homePage-light": null,
    "chatbot-dark": null,
    "chatbot-light": null,
  },
  logo: null,

  icons: { faviconAny: "/favicon.ico" },
  iconSet: null,

  pwa: {
    themeColor: "#ffffff",
    backgroundColor: "#ffffff",
    startUrl: "/",
    display: "standalone",
    scope: "/",
    orientation: "portrait-primary",
  },
  themeColors: { light: "#ffffff", dark: "#09090b" },

  seo: {
    indexing: "allow",
    titleTemplate: "%s | Fractera",
    robotsIndex: true,
    robotsFollow: true,
    keywords: undefined,
    canonicalBase: "https://www.fractera.ai",
    sitemapUrl: undefined,
    disallowPaths: ["/api", "/api/*", "/_next", "/_next/*"],
    locales: ["en"],
    defaultLocale: "en",
    googleVerification: undefined,
    yandexVerification: undefined,
    social: { twitter: "@fractera", github: undefined, linkedin: undefined, facebook: undefined },
  },

  og: { type: "website", locale: undefined, siteName: "Fractera", imageWidth: 1200, imageHeight: 630 },

  author: { name: "Fractera", email: "admin@fractera.ai", url: undefined },
  analytics: { googleAnalyticsId: undefined, enabled: false },
  jsonLd: { website: true, organization: true, localBusiness: false },
  geo: {},
  contentTypeDefaults: { blog: "blog", product: "product", documentation: "documentation" },
  menus: { authButton: false },
};

// ---- pure getters (take a config object; safe on client or server) ------------------

export function getImagePath(cfg: AppConfig, t: RegularImageType): string | null {
  return cfg.images[t] ?? null;
}
export function getOgImagePath(cfg: AppConfig): string | null {
  return cfg.images.ogImage ?? null;
}
export function getLogoPath(cfg: AppConfig): string | null {
  return cfg.logo ?? null;
}

// The owner's custom brand name, or null when they have not set one (the shipped defaults
// count as "unset"). Callers show the "Your Company App" placeholder on null. Prefers the
// short wordmark; falls back to the longer App name if only that was changed.
export function resolveBrandName(cfg: AppConfig): string | null {
  if (cfg.short_name && cfg.short_name !== DEFAULT_APP_CONFIG.short_name) return cfg.short_name;
  if (cfg.name && cfg.name !== DEFAULT_APP_CONFIG.name) return cfg.name;
  return null;
}

// Resolve a generated icon URL by logical name (e.g. "icon_192") to its serving URL, or null.
export function iconUrl(cfg: AppConfig, name: string): string | null {
  const rel = cfg.iconSet?.files?.[name];
  if (!cfg.iconSet || !rel) return null;
  const file = rel.split("/").pop() ?? rel;
  return `/api/media/icons/${cfg.iconSet.id}/file/${file}`;
}

export function socialUrls(social: SocialConfig | undefined): string[] {
  if (!social) return [];
  const out: string[] = [];
  if (social.twitter)
    out.push(social.twitter.startsWith("http") ? social.twitter : `https://twitter.com/${social.twitter.replace("@", "")}`);
  if (social.github) out.push(social.github);
  if (social.linkedin)
    out.push(social.linkedin.startsWith("http") ? social.linkedin : `https://linkedin.com/company/${social.linkedin}`);
  if (social.facebook)
    out.push(social.facebook.startsWith("http") ? social.facebook : `https://facebook.com/${social.facebook}`);
  return out;
}
