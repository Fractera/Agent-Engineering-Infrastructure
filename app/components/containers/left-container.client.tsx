"use client";

import { usePanelState } from "@/providers/panel-state-provider.client";
import { useScreenWidth } from "@/providers/screen-width-provider.client";
import { LAYOUT_CONFIG, HEADER_HEIGHT_PX, FOOTER_HEIGHT_PX } from "@/config/ui/layout.config";
import { getZIndexStyle } from "@/config/ui/z-index.config";
import { getPanelWidth } from "@/lib/layout/get-panel-width";

// Fixed left side panel; slides in/out (300ms). Ported from the 22slots reference.
export function LeftContainer({ children }: { children: React.ReactNode }) {
  const { leftVisible, rightVisible } = usePanelState();
  const screenWidth = useScreenWidth();

  const width = getPanelWidth(screenWidth, leftVisible && rightVisible);

  return (
    <div
      className="flex flex-col transition-[transform,width] ease-in-out bg-background border-r-2 border-slate-200"
      style={{
        position: "fixed",
        top: HEADER_HEIGHT_PX,
        bottom: FOOTER_HEIGHT_PX,
        left: 0,
        width,
        transform: leftVisible ? "translateX(0)" : "translateX(-100%)",
        transitionDuration: `${LAYOUT_CONFIG.ANIMATION_DURATION}ms`,
        ...getZIndexStyle("LEFT"),
      }}
    >
      {children}
    </div>
  );
}
