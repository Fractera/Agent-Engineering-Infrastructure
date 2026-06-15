import type { ReactNode } from "react";
import { SUPPORTED_LANGUAGES } from "@/config/translations/translations.config";
import { getPlatformConfig } from "@/config/platform-config";
import { ScreenWidthProvider } from "@/providers/screen-width-provider.client";
import { WidthToggleProvider } from "@/providers/width-toggle-provider.client";
import { HeaderHeightProvider } from "@/providers/header-height-provider.client";
import { PanelStateProvider } from "@/providers/panel-state-provider.client";
import { CodeGeneratorProvider } from "@/providers/code-generator-provider.client";
import { FooterContainer } from "@/components/containers/footer-container.client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HEADER_HEIGHT_PX } from "@/config/ui/layout.config";

// The [lang] layout is the parallel-routing frame (ported from the 22slots reference).
//
//  - parallelRouting OFF (default): render the flat page tree (`children`) — byte-for-byte
//    today's behaviour, no visible change.
//  - parallelRouting ON: arrange the named parallel-route slots; `children` is NOT rendered
//    (the slots replace it). FOOTER-FIRST: the @footer slot is fully wired and working; the
//    other slots are ported one at a time and stay commented below until each is ready.
//
// The flag (and which slots are active) is read at runtime from platform-config.json
// (Admin -> Platform), so flipping it applies on the next request without a rebuild.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }));
}

type SlotLayoutProps = {
  children: ReactNode;
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

export default function LangLayout(props: SlotLayoutProps) {
  const { children, footer } = props;
  const { parallelRouting, slots } = getPlatformConfig();

  // Flat mode (default) — render the page tree only (unchanged).
  if (!parallelRouting) {
    return <>{children}</>;
  }

  // Parallel-routing mode — faithful provider/container frame, FOOTER-ONLY for now.
  return (
    <CodeGeneratorProvider>
      <TooltipProvider>
      <ScreenWidthProvider>
        <WidthToggleProvider>
          <HeaderHeightProvider initialHeight={HEADER_HEIGHT_PX}>
            <PanelStateProvider>
              <div className="relative min-h-screen">
                {/* {slots.promoScreen && props.promoScreen} */}
                {/* {props.notification} */}
                {/* {slots.header && <HeaderContainer>{props.header}</HeaderContainer>} */}
                {/* {props.breadcrumb} */}
                {/* {slots.left && <LeftContainer>{props.left}</LeftContainer>} */}
                {/* {slots.right && <RightContainer>{props.right}</RightContainer>} */}
                {/* <MainScrollArea promoScreen={...} notification={...} breadcrumb={...} faq={props.faq}>
                      {slots.centerHeader && props.centerHeader}
                      {slots.center && props.center}
                      {slots.centerFooter && props.centerFooter}
                    </MainScrollArea> */}
                {slots.footer && <FooterContainer alwaysVisible>{footer}</FooterContainer>}
                {/* {props.footerModal} */}
              </div>
            </PanelStateProvider>
          </HeaderHeightProvider>
        </WidthToggleProvider>
      </ScreenWidthProvider>
      </TooltipProvider>
    </CodeGeneratorProvider>
  );
}
