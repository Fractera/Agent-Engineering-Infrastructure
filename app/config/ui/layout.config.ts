/**
 * Layout constants: breakpoints, widths, animation, overlays.
 * Ported verbatim from the 22slots reference (config/ui/layout.config.ts).
 */

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
  RIGHT_WIDTH_XS: 300,
  RIGHT_WIDTH_NARROW: 480,
  RIGHT_WIDTH_MEDIUM: 560,
  RIGHT_WIDTH_WIDE: 650,

  // Code generator
  CODE_GENERATOR_WIDTH_XS: 300,
  CODE_GENERATOR_WIDTH_WIDE: 480,
  CODE_GENERATOR_BREAKPOINT: 1250,

  // Center width toggle
  CENTER_MAX_W_NARROW: 1024,
  CENTER_MAX_W_WIDE: 1250,

  // Center footer (adjustable via API)
  CENTER_FOOTER_H_MIN: 60,
  CENTER_FOOTER_H_MAX: 1200,
  CENTER_STATIC_FOOTER_H: 68,
  CENTER_DYNAMIC_FOOTER_H: 200,

  // Overlays
  FOOTER_DRAWER_H: 500,
  FOOTER_MODAL_MIN_W: 320,
  FOOTER_MODAL_MIN_H: 200,
} as const;
