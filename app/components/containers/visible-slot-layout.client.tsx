'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import { ROUTES_CONFIG } from '@/config/ui/initial-app-config';
import type { SlotName } from '@/config/ui/initial-app-config';

const FLEX_SLOTS = new Set<SlotName>(['center', 'left', 'right']);

type VisibleSlotLayoutProps = {
  slot: SlotName;
  children: React.ReactNode;
};

/**
 * Обёртка для обычных слотов: flex-слоты и collapsible (header/footer).
 * Не используется для drawer/modal — см. VisibleInterceptionSlotLayout.
 */
export function VisibleSlotLayout({ slot, children }: VisibleSlotLayoutProps) {
  const segment = useSelectedLayoutSegment(slot);

  const config = ROUTES_CONFIG[slot];

  // flex — растягивается по содержимому
  if (FLEX_SLOTS.has(slot)) {
    return (
      <div style={{ flex: 1 }}>
        {children}
      </div>
    );
  }

  // collapsible — определяется из конфига: есть defaultPageUrl + isDefaultPageNull
  const defaultSegment = config.defaultPageUrl.replace(/^\//, '');
  const isDefaultPage = segment === null || segment === defaultSegment;
  const useDefaultPage = !config.isDefaultPageNull;
  const collapsed = isDefaultPage && !useDefaultPage;

  return (
    <div
      style={{
        height: collapsed ? 0 : (slot === 'footer' ? '100%' : 'auto'),
        flexShrink: 0,
        ...(slot.endsWith('Footer') && { marginTop: 'auto' }),
        overflow: 'hidden',
        transition: 'height 150ms ease',
      }}
    >
      {children}
    </div>
  );
}
