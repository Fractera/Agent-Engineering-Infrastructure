'use client';

import { usePanelState } from '@/providers/panel-state-provider.client';
import { useScreenWidth } from '@/providers/screen-width-provider.client';
import { LAYOUT_CONFIG, HEADER_HEIGHT_PX, FOOTER_HEIGHT_PX } from '@/config/ui/layout.config';
import { getZIndexStyle } from '@/config/ui/z-index.config';
import { getPanelWidth } from '@/utils/get-panel-width';

type RightContainerProps = {
  children: React.ReactNode;
};

export function RightContainer({ children }: RightContainerProps) {
  const { leftVisible, rightVisible } = usePanelState();
  const screenWidth = useScreenWidth();

  const bothOpen = leftVisible && rightVisible;
  const width = getPanelWidth(screenWidth, bothOpen);

  return (
    <div
      className="flex flex-col ease-in-out bg-background border-l-2 border-slate-200"
      style={{
        position: 'fixed',
        top: HEADER_HEIGHT_PX,
        bottom: FOOTER_HEIGHT_PX,
        right: 0,
        width,
        transform: rightVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: `transform ${LAYOUT_CONFIG.ANIMATION_DURATION}ms ease-in-out, width ${LAYOUT_CONFIG.ANIMATION_DURATION}ms ease-in-out, right ${LAYOUT_CONFIG.ANIMATION_DURATION}ms ease-in-out`,
        ...getZIndexStyle('RIGHT'),
      }}
    >
      {children}
    </div>
  );
}
