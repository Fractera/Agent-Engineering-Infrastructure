import { LAYOUT_CONFIG } from "@/config/ui/layout.config";

// Returns the side-panel width for the current screen width. When both panels are open the
// width steps down one tier to avoid overlap. Ported from the 22slots reference.
export function getPanelWidth(screenWidth: number, bothOpen: boolean): number {
  if (screenWidth > LAYOUT_CONFIG.BREAKPOINT_PANEL_WIDTH) {
    return bothOpen ? LAYOUT_CONFIG.LEFT_WIDTH_MEDIUM : LAYOUT_CONFIG.LEFT_WIDTH_WIDE;
  }
  if (screenWidth > LAYOUT_CONFIG.BREAKPOINT_PANEL_MEDIUM) {
    return bothOpen ? LAYOUT_CONFIG.LEFT_WIDTH_NARROW : LAYOUT_CONFIG.LEFT_WIDTH_MEDIUM;
  }
  if (screenWidth > LAYOUT_CONFIG.BREAKPOINT_PANEL_XS) {
    return bothOpen ? LAYOUT_CONFIG.LEFT_WIDTH_XS : LAYOUT_CONFIG.LEFT_WIDTH_NARROW;
  }
  return LAYOUT_CONFIG.LEFT_WIDTH_XS;
}
