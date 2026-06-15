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
  const { parallelRouting, slots } = getPlatformConfig();

  // Flat mode (default) — identical to today: render the page tree only.
  if (!parallelRouting) {
    return <>{children}</>;
  }

  // Parallel-routing mode — arrange only the ACTIVE named slots (the parallel-routes selector
  // in Admin -> Platform writes these flags). Slots are empty until 116.3 fills them, so this is
  // an intentional white frame for now; the active-flag plumbing is real and selector-driven.
  // breadcrumb / notification / faq / footerModal are auxiliary (not in the selector) — always placed.
  return (
    <div className="flex min-h-screen flex-col">
      {slots.promoScreen && promoScreen}
      {notification}
      {slots.header && header}
      {breadcrumb}
      <div className="flex flex-1">
        {slots.left && left}
        <div className="flex flex-1 flex-col">
          {slots.centerHeader && centerHeader}
          {slots.center && center}
          {slots.centerFooter && centerFooter}
        </div>
        {slots.right && right}
      </div>
      {faq}
      {slots.footer && footer}
      {footerModal}
    </div>
  );
}
