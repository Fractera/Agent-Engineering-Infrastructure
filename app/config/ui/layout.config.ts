// Layout constants for the parallel-routing frame: header/footer heights, animation,
// breakpoints and panel widths. Ported from the 22slots reference (code-generator entries
// dropped — that slot lives in the admin layer, not the Shell). Pure data.

export const HEADER_HEIGHT_PX = 60;
export const FOOTER_HEIGHT_PX = 40;

export const LAYOUT_CONFIG = {
  // Animation
  ANIMATION_DURATION: 300,
  ANIMATION_PAUSE: 100,

  // Breakpoints
  BREAKPOINT_SINGLE_PANEL: 1024,
  BREAKPOINT_PANEL_XS: 960,
  BREAKPOINT_PANEL_MEDIUM: 1250,
  BREAKPOINT_PANEL_WIDTH: 1600,

  // Panel widths
  LEFT_WIDTH_XS: 300,
  LEFT_WIDTH_NARROW: 480,
  LEFT_WIDTH_MEDIUM: 560,
  LEFT_WIDTH_WIDE: 650,

  // Center width toggle
  CENTER_MAX_W_NARROW: 1024,
  CENTER_MAX_W_WIDE: 1250,
} as const;
