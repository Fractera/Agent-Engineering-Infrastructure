import type { MetadataRoute } from "next";
import { getAppConfig } from "@/config/app-config";
import { iconUrl } from "@/config/app-config.defaults";

// PWA manifest served at /manifest.webmanifest. Read at runtime from the live site config so
// Admin -> Site Settings changes apply without a rebuild (hence force-dynamic, not force-static).
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const cfg = getAppConfig();

  const icons: NonNullable<MetadataRoute.Manifest["icons"]> = [];
  const add = (name: string, sizes: string, purpose?: "any" | "maskable") => {
    const url = iconUrl(cfg, name) ?? cfg.icons[name === "icon_512" ? "icon512" : "icon192"];
    if (url) icons.push({ src: url, sizes, type: "image/png", purpose });
  };
  if (cfg.iconSet) {
    add("icon_192", "192x192", "any");
    add("icon_512", "512x512", "any");
    const maskable = iconUrl(cfg, "icon_512");
    if (maskable) icons.push({ src: maskable, sizes: "512x512", type: "image/png", purpose: "maskable" });
  } else {
    if (cfg.icons.icon192) icons.push({ src: cfg.icons.icon192, sizes: "192x192", type: "image/png", purpose: "any" });
    if (cfg.icons.icon512) icons.push({ src: cfg.icons.icon512, sizes: "512x512", type: "image/png", purpose: "any" });
    if (cfg.icons.icon512Maskable)
      icons.push({ src: cfg.icons.icon512Maskable, sizes: "512x512", type: "image/png", purpose: "maskable" });
  }

  return {
    name: cfg.name,
    short_name: cfg.short_name,
    description: cfg.description,
    start_url: cfg.pwa.startUrl,
    scope: cfg.pwa.scope ?? "/",
    display: cfg.pwa.display,
    orientation: cfg.pwa.orientation,
    theme_color: cfg.pwa.themeColor,
    background_color: cfg.pwa.backgroundColor,
    icons,
    categories: ["productivity", "utilities"],
  };
}
