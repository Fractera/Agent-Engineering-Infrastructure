import type React from "react";

// Z-index layers for the parallel-routing frame. Ported (trimmed) from the 22slots
// reference — only the layers the Shell's containers use. Header/Footer sit above the
// side panels, which sit above the center content.
export const Z_INDEX = {
  BACKGROUND: -1,
  BASE: 0,
  PROMO_SCREEN: 10,
  CENTER: 10,
  LEFT: 30,
  RIGHT: 40,
  HEADER: 100,
  FOOTER: 100,
} as const;

export function getZIndexStyle(layer: keyof typeof Z_INDEX): React.CSSProperties {
  return { zIndex: Z_INDEX[layer] };
}
