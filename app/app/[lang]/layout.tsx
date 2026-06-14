import type { ReactNode } from "react";
import { SUPPORTED_LANGUAGES } from "@/config/translations/translations.config";
import { getPlatformConfig } from "@/config/platform-config";

// The [lang] layout is the parallel-routing frame.
//
//  - parallelRouting OFF (default): render the flat page tree (`children`) — byte-for-byte
//    today's behaviour, no visible change. The named slots still resolve to their null
//    default.tsx but are not placed.
//  - parallelRouting ON: arrange the named parallel-route slots instead; `children` is
//    intentionally NOT rendered (the slots replace it). This is the minimal frame — the real
//    container/provider/visibility system is ported from the 22slots reference in step 116.2.
//
// The flag is read at runtime from PLATFORM-CONFIG/platform-config.json (Admin -> Platform),
// so flipping it applies on the next request without a rebuild.
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

export default function LangLayout({
  children,
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
}: SlotLayoutProps) {
  const { parallelRouting } = getPlatformConfig();

  // Flat mode (default) — identical to today: render the page tree only.
  if (!parallelRouting) {
    return <>{children}</>;
  }

  // Parallel-routing mode — arrange the named slots (minimal frame for 116.1).
  return (
    <div className="flex min-h-screen flex-col">
      {promoScreen}
      {notification}
      {header}
      {breadcrumb}
      <div className="flex flex-1">
        {left}
        <div className="flex flex-1 flex-col">
          {centerHeader}
          {center}
          {centerFooter}
        </div>
        {right}
      </div>
      {faq}
      {footer}
      {footerModal}
    </div>
  );
}
