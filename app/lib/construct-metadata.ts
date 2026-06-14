import type { Metadata } from "next";
import type { AppConfig, ContentType } from "@/config/app-config.defaults";
import { iconUrl, resolveBrandName } from "@/config/app-config.defaults";
import { getAppConfig } from "@/config/app-config";

// Build a Next Metadata object from the live site config (Admin -> Site Settings).
// Ported from the 22slots construct-metadata, trimmed to the Shell's single-language reality
// (no per-locale alternates) and to config-as-runtime-file (not NEXT_PUBLIC env).

const MAX_DESCRIPTION_LENGTH = 160;

type ConstructArgs = {
  title?: string;
  description?: string;
  image?: string | null;
  pathname?: string;
  noIndex?: boolean;
  noFollow?: boolean;
};

function normalizePath(p?: string): string {
  if (!p) return "/";
  let s = String(p).trim();
  if (!s.startsWith("/")) s = `/${s}`;
  while (s.includes("//")) s = s.replace("//", "/");
  return s;
}

function truncate(desc: string, max = MAX_DESCRIPTION_LENGTH): string {
  return desc.length <= max ? desc : desc.substring(0, max - 3) + "...";
}

// Favicon/apple-touch icons: a generated set wins; otherwise the individual icon URLs.
function buildIcons(cfg: AppConfig): NonNullable<Metadata["icons"]> {
  const out: { url: string; rel?: string; sizes?: string; type?: string }[] = [];
  const push = (url: string | null | undefined, rel: string, sizes?: string, type?: string) => {
    if (url) out.push({ url, rel, sizes, type });
  };
  if (cfg.iconSet) {
    push(iconUrl(cfg, "favicon_ico"), "icon", "any", "image/x-icon");
    push(iconUrl(cfg, "favicon_32"), "icon", "32x32", "image/png");
    push(iconUrl(cfg, "icon_192"), "icon", "192x192", "image/png");
    push(iconUrl(cfg, "icon_512"), "icon", "512x512", "image/png");
    push(iconUrl(cfg, "apple_touch_icon"), "apple-touch-icon", "180x180", "image/png");
  } else {
    push(cfg.icons.faviconAny, "icon", "any", "image/x-icon");
    push(cfg.icons.icon32, "icon", "32x32", "image/png");
    push(cfg.icons.icon48, "icon", "48x48", "image/png");
    push(cfg.icons.icon192, "icon", "192x192", "image/png");
    push(cfg.icons.icon512, "icon", "512x512", "image/png");
    push(cfg.icons.appleTouch, "apple-touch-icon", "180x180", "image/png");
  }
  return out as NonNullable<Metadata["icons"]>;
}

function resolveOgType(cfg: AppConfig): "website" | "article" {
  const t = cfg.og.type as ContentType;
  return t === "article" || t === "blog" ? "article" : "website";
}

export function constructMetadata(args: ConstructArgs = {}): Metadata {
  const cfg = getAppConfig();
  const {
    title = resolveBrandName(cfg) ?? "Your Company App",
    description = cfg.description,
    image = cfg.images.ogImage,
    pathname,
    noIndex = false,
    noFollow = false,
  } = args;

  const base = cfg.seo.canonicalBase ?? cfg.url;
  const canonical = new URL(normalizePath(pathname), base).toString();
  const desc = truncate(description);
  const index = !noIndex && cfg.seo.robotsIndex && cfg.seo.indexing === "allow";
  const follow = !noFollow && cfg.seo.robotsFollow;

  const verification: Record<string, string> = {};
  if (cfg.seo.googleVerification) verification.google = cfg.seo.googleVerification;
  if (cfg.seo.yandexVerification) verification.yandex = cfg.seo.yandexVerification;

  return {
    title: { default: title, template: cfg.seo.titleTemplate || `%s | ${cfg.name}` },
    description: desc,
    metadataBase: new URL(cfg.url),
    applicationName: cfg.short_name,
    creator: cfg.short_name,
    publisher: cfg.short_name,
    ...(cfg.seo.keywords ? { keywords: cfg.seo.keywords } : {}),
    authors: [{ name: cfg.author.name, url: cfg.author.url }],
    alternates: { canonical },
    manifest: cfg.manifest,
    icons: buildIcons(cfg),
    openGraph: {
      type: resolveOgType(cfg),
      title,
      description: desc,
      url: canonical,
      siteName: cfg.og.siteName ?? cfg.name,
      locale: cfg.og.locale ?? cfg.lang,
      ...(image
        ? { images: [{ url: image, width: cfg.og.imageWidth, height: cfg.og.imageHeight, alt: desc }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      ...(image ? { images: [image] } : {}),
      creator: cfg.seo.social.twitter,
      site: cfg.seo.social.twitter,
    },
    robots: {
      index,
      follow,
      googleBot: { index, follow, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
    },
    ...(Object.keys(verification).length > 0 ? { verification } : {}),
  };
}
