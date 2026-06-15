"use client";

import type { ReactNode } from "react";
import { ScreenWidthProvider } from "@/providers/screen-width-provider.client";
import { WidthToggleProvider } from "@/providers/width-toggle-provider.client";
import { HeaderHeightProvider } from "@/providers/header-height-provider.client";
import { PanelStateProvider } from "@/providers/panel-state-provider.client";
import { HeaderContainer } from "@/components/containers/header-container.client";
import { LeftContainer } from "@/components/containers/left-container.client";
import { RightContainer } from "@/components/containers/right-container.client";
import { MainScrollArea } from "@/components/containers/main-scroll-area.client";
import { FooterContainer } from "@/components/containers/footer-container.client";
import { HEADER_HEIGHT_PX } from "@/config/ui/layout.config";
import type { LayoutSlots } from "@/config/platform-config.defaults";

// The real parallel-routing frame (rendered only when parallelRouting is on). Sets up the
// layout providers + fixed containers and places ONLY the slots the owner marked active in
// Admin -> Platform. Ported from the 22slots reference RootLayout (code-generator + Supabase
// data sources omitted). Active left/right start open so an active panel is visible at once.

type Props = {
  slots: LayoutSlots;
  header: ReactNode;
  footer: ReactNode;
  left: ReactNode;
  right: ReactNode;
  center: ReactNode;
  centerHeader: ReactNode;
  centerFooter: ReactNode;
  breadcrumb: ReactNode;
  promoScreen: ReactNode;
  notification: ReactNode;
  faq: ReactNode;
  footerModal: ReactNode;
};

export function ParallelShell({
  slots,
  header,
  footer,
  left,
  right,
  center,
  centerHeader,
  centerFooter,
  breadcrumb,
  promoScreen,
  notification,
  faq,
  footerModal,
}: Props) {
  return (
    <ScreenWidthProvider>
      <WidthToggleProvider>
        <HeaderHeightProvider initialHeight={HEADER_HEIGHT_PX}>
          <PanelStateProvider initialLeftVisible={slots.left} initialRightVisible={slots.right}>
            <div className="relative min-h-screen">
              {slots.header && <HeaderContainer>{header}</HeaderContainer>}
              {slots.left && <LeftContainer>{left}</LeftContainer>}
              {slots.right && <RightContainer>{right}</RightContainer>}
              <MainScrollArea
                promoScreen={slots.promoScreen ? promoScreen : undefined}
                notification={notification}
                breadcrumb={breadcrumb}
                faq={faq}
              >
                {slots.centerHeader && centerHeader}
                {slots.center && center}
                {slots.centerFooter && centerFooter}
              </MainScrollArea>
              {slots.footer && <FooterContainer>{footer}</FooterContainer>}
              {footerModal}
            </div>
          </PanelStateProvider>
        </HeaderHeightProvider>
      </WidthToggleProvider>
    </ScreenWidthProvider>
  );
}
