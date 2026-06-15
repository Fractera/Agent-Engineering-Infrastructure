'use client';

import { usePanelState } from '@/providers/panel-state-provider.client';
import { useWidthToggle } from '@/providers/width-toggle-provider.client';
import { useCodeGenerator } from '@/providers/code-generator-provider.client';
import { useScreenWidth } from '@/providers/screen-width-provider.client';
import { useHeaderHeight } from '@/providers/header-height-provider.client';
import { LAYOUT_CONFIG, FOOTER_HEIGHT_PX } from '@/config/ui/layout.config';
import { getPanelWidth, getCodeGeneratorWidth } from '@/utils/get-panel-width';

type MainScrollAreaProps = {
  children: React.ReactNode;
  promoScreen?: React.ReactNode;
  notification?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  faq?: React.ReactNode;
};

export function MainScrollArea({ children, promoScreen, notification, breadcrumb, faq }: MainScrollAreaProps) {
  const { leftVisible, rightVisible } = usePanelState();
  const { centerMaxWidth } = useWidthToggle();
  const { codeGeneratorOpen } = useCodeGenerator();
  const screenWidth = useScreenWidth();
  const { height: headerHeight } = useHeaderHeight();

  const bothOpen = leftVisible && rightVisible;
  const panelWidth = getPanelWidth(screenWidth, bothOpen);
  const codeGeneratorWidth = getCodeGeneratorWidth(screenWidth);

  const paddingLeft = leftVisible ? panelWidth : 0;
  const paddingRight = (rightVisible ? panelWidth : 0) + (codeGeneratorOpen ? codeGeneratorWidth : 0);

  return (
    <main
      className="overflow-y-auto transition-[padding] ease-in-out"
      style={{
        position: 'fixed',
        top: headerHeight,
        bottom: FOOTER_HEIGHT_PX,
        left: 0,
        right: 0,
        paddingLeft,
        paddingRight,
        transitionDuration: `${LAYOUT_CONFIG.ANIMATION_DURATION}ms`,
        // CSS vars so the promo wrapper can read current panel widths
        '--panel-left': `${paddingLeft}px`,
        '--panel-right': `${paddingRight}px`,
      } as React.CSSProperties}
    >
      {notification}
      {breadcrumb}

      {/* Full-viewport-width promo: breaks out of padding via negative margins.
          width  = 100% (content area) + paddingLeft + paddingRight = 100vw
          marginLeft = -paddingLeft  →  shifts to the true left viewport edge
          Transition keeps it in sync with panel open/close animation. */}
      {promoScreen && (
        <div
          style={{
            width: 'calc(100% + var(--panel-left, 0px) + var(--panel-right, 0px))',
            marginLeft: 'calc(-1 * var(--panel-left, 0px))',
            transition: `width ${LAYOUT_CONFIG.ANIMATION_DURATION}ms ease-in-out, margin-left ${LAYOUT_CONFIG.ANIMATION_DURATION}ms ease-in-out`,
          }}
        >
          {promoScreen}
        </div>
      )}

      {/* Center content — constrained by centerMaxWidth; box-shadow avoids layout gap from borders */}
      <div
        style={{
          maxWidth: centerMaxWidth,
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {children}
        {faq}
      </div>
    </main>
  );
}
