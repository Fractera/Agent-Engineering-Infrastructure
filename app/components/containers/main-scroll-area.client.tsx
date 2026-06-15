"use client";

import { usePanelState } from "@/providers/panel-state-provider.client";
import { useWidthToggle } from "@/providers/width-toggle-provider.client";
import { useScreenWidth } from "@/providers/screen-width-provider.client";
import { useHeaderHeight } from "@/providers/header-height-provider.client";
import { LAYOUT_CONFIG, FOOTER_HEIGHT_PX } from "@/config/ui/layout.config";
import { getPanelWidth } from "@/lib/layout/get-panel-width";

// Scrollable center region between header and footer; its left/right padding tracks the
// open side panels so content is never hidden behind them. Ported from the 22slots reference
// (code-generator width removed). promoScreen breaks out to full viewport width.
type Props = {
  children: React.ReactNode;
  promoScreen?: React.ReactNode;
  notification?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  faq?: React.ReactNode;
};

export function MainScrollArea({ children, promoScreen, notification, breadcrumb, faq }: Props) {
  const { leftVisible, rightVisible } = usePanelState();
  const { centerMaxWidth } = useWidthToggle();
  const screenWidth = useScreenWidth();
  const { height: headerHeight } = useHeaderHeight();

  const panelWidth = getPanelWidth(screenWidth, leftVisible && rightVisible);
  const paddingLeft = leftVisible ? panelWidth : 0;
  const paddingRight = rightVisible ? panelWidth : 0;

  return (
    <main
      className="overflow-y-auto transition-[padding] ease-in-out"
      style={{
        position: "fixed",
        top: headerHeight,
        bottom: FOOTER_HEIGHT_PX,
        left: 0,
        right: 0,
        paddingLeft,
        paddingRight,
        transitionDuration: `${LAYOUT_CONFIG.ANIMATION_DURATION}ms`,
        ["--panel-left" as string]: `${paddingLeft}px`,
        ["--panel-right" as string]: `${paddingRight}px`,
      }}
    >
      {notification}
      {breadcrumb}

      {promoScreen && (
        <div
          style={{
            width: "calc(100% + var(--panel-left, 0px) + var(--panel-right, 0px))",
            marginLeft: "calc(-1 * var(--panel-left, 0px))",
            transition: `width ${LAYOUT_CONFIG.ANIMATION_DURATION}ms ease-in-out, margin-left ${LAYOUT_CONFIG.ANIMATION_DURATION}ms ease-in-out`,
          }}
        >
          {promoScreen}
        </div>
      )}

      <div style={{ maxWidth: centerMaxWidth, margin: "0 auto", boxSizing: "border-box" }}>
        {children}
        {faq}
      </div>
    </main>
  );
}
