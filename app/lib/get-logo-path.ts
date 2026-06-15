import { getAppConfig } from "@/config/app-config";

// ADAPTED from the 22slots reference (lib/get-logo-path.ts). The reference looked for a static
// file in public/app-config-images/. In Fractera the logo lives in object storage and is
// referenced by URL in the on-disk app-config (Site Settings, step 115), so we return that URL
// (or null when the owner has not set one). Server-only (getAppConfig reads fs).
export function getLogoFilePath(): string | null {
  try {
    return getAppConfig().logo ?? null;
  } catch {
    return null;
  }
}
