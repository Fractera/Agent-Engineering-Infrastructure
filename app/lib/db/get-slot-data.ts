import { cache } from "react";
import type { SlotConfig } from "@/config/ui/initial-app-config";
import { ROUTES_CONFIG } from "@/config/ui/initial-app-config";
import { getPlatformConfig } from "@/config/platform-config";

// Slot configuration. The reference (lib/db/get-slot-data.ts) builds this from Supabase
// (slots + routes + fractals + brand_book + meta translations). For the footer-first port
// we use the LIGHT, no-fractal source: the committed ROUTES_CONFIG (config/ui/initial-app-config),
// with the slot's active flag taken from OUR platform-config (Admin -> Platform). This is enough
// for the independent slots (footer renders its own UI, not fractal trees). When the fractal
// platform is ported, this getter is extended to merge per-route fractal data from our storage.
export const getSlotData = cache(async (slotName: string, _lang: string): Promise<SlotConfig | null> => {
  const base = (ROUTES_CONFIG as Record<string, SlotConfig | undefined>)[slotName];
  if (!base) return null;

  // Slot active/inactive is driven by the parallel-routes selector flags on platform-config.
  // active === false → isDefaultPageNull true (slot hidden), mirroring the reference semantics.
  let isDefaultPageNull = base.isDefaultPageNull;
  try {
    const { slots } = getPlatformConfig();
    if (slotName in slots) {
      isDefaultPageNull = (slots as Record<string, boolean>)[slotName] === false;
    }
  } catch {
    /* keep base */
  }

  return { ...base, isDefaultPageNull };
});
