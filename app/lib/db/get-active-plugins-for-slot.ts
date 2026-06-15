import { getPlatformConfig } from "@/config/platform-config";

// The reference (lib/db/get-active-plugins-for-slot.ts) read the active plugins from the
// Supabase marketplace. We have no marketplace — the footer feature toggles live on
// platform-config (Admin -> Platform, footerPlugins). This maps those flags to the SAME
// plugin ids the footer components check, so the footer code stays a verbatim port.
const FOOTER_PLUGIN_IDS: Record<string, string> = {
  themeToggle: "dark-mode-toggle",
  languageSwitcher: "language-switcher",
  widthToggle: "width-toggle",
  footerPages: "footer-pages",
};

export async function getActivePluginsForSlot(slot: string): Promise<string[]> {
  try {
    const cfg = getPlatformConfig();
    if (slot === "footer") {
      const fp = cfg.footerPlugins;
      return Object.entries(FOOTER_PLUGIN_IDS)
        .filter(([key]) => (fp as Record<string, boolean>)[key])
        .map(([, id]) => id);
    }
    return [];
  } catch {
    return [];
  }
}
