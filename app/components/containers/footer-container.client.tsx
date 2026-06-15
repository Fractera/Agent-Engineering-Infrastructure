"use client";

import { ReactNode } from "react";
import { getZIndexStyle } from "@/config/ui/z-index.config";
import { FOOTER_HEIGHT_PX } from "@/config/ui/layout.config";

// Fixed footer bar across the bottom. Ported from the 22slots reference, simplified: the
// auto-hide-on-idle behaviour and code-generator coupling are dropped — the footer is simply
// always shown when its slot is active.
export function FooterContainer({ children }: { children: ReactNode }) {
  return (
    <footer
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: FOOTER_HEIGHT_PX,
        ...getZIndexStyle("FOOTER"),
      }}
    >
      <div className="relative h-full w-full">{children}</div>
    </footer>
  );
}
