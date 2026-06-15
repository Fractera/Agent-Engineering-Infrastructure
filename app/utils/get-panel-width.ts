import { LAYOUT_CONFIG } from '@/config/ui/layout.config';

// Ported verbatim from the 22slots reference (utils/get-panel-width.ts).

/**
 * Returns panel width based on screen width and whether both panels are open.
 * When both panels are open, width steps down one tier to avoid overlap.
 */
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
  // Below XS: single-panel mode is enforced by PanelStateProvider anyway
  return LAYOUT_CONFIG.LEFT_WIDTH_XS;
}

/**
 * Returns Code Generator slot width based on screen width.
 * 300px when screen < 1250px, 480px otherwise.
 */
export function getCodeGeneratorWidth(screenWidth: number): number {
  return screenWidth >= LAYOUT_CONFIG.CODE_GENERATOR_BREAKPOINT
    ? LAYOUT_CONFIG.CODE_GENERATOR_WIDTH_WIDE
    : LAYOUT_CONFIG.CODE_GENERATOR_WIDTH_XS;
}
