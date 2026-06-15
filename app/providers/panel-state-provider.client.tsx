'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  Suspense,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LAYOUT_CONFIG } from '@/config/ui/layout.config';
import { LEFT_PATHS, RIGHT_PATHS } from '@/config/ui/initial-app-config';

type PanelSide = 'left' | 'right';

type PanelStateContextValue = {
  leftVisible: boolean;
  rightVisible: boolean;
  lastOpenedPanel: PanelSide | null;
  openLeft: () => void;
  openRight: () => void;
  closeLeft: () => void;
  closeRight: () => void;
};

const PanelStateContext = createContext<PanelStateContextValue | null>(null);

function getIsSinglePanel() {
  if (typeof window === 'undefined') return true;
  return window.innerWidth < LAYOUT_CONFIG.BREAKPOINT_SINGLE_PANEL;
}

// Отдельный компонент для useSearchParams (требует Suspense)
function PanelUrlSync({
  isSinglePanel,
  setLeftVisible,
  setRightVisible,
  setLastOpenedPanel,
}: {
  isSinglePanel: boolean;
  setLeftVisible: (v: boolean) => void;
  setRightVisible: (v: boolean) => void;
  setLastOpenedPanel: (v: PanelSide) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Определяем слот по URL-префиксу: /en/l/... → left, /en/r/... → right
    const parts = pathname.split('/').filter(Boolean);
    let slotByPrefix: 'left' | 'right' | null = null;
    let remaining = parts;
    if (remaining.length > 0 && /^[a-z]{2}$/.test(remaining[0])) {
      remaining = remaining.slice(1); // убираем lang
    }
    if (remaining[0] === 'l') slotByPrefix = 'left';
    else if (remaining[0] === 'r') slotByPrefix = 'right';

    // Фолбек: проверяем по списку путей (для обратной совместимости)
    if (!slotByPrefix) {
      const normalizedPath = remaining.length > 0 ? '/' + remaining.join('/') : '/';
      if ((LEFT_PATHS as readonly string[]).includes(normalizedPath)) slotByPrefix = 'left';
      else if ((RIGHT_PATHS as readonly string[]).includes(normalizedPath)) slotByPrefix = 'right';
    }

    // Фолбек: searchParam ?slot=
    const slotParam = searchParams.get('slot');
    if (!slotByPrefix && slotParam === 'left') slotByPrefix = 'left';
    else if (!slotByPrefix && slotParam === 'right') slotByPrefix = 'right';

    if (slotByPrefix === 'left') {
      if (isSinglePanel) setRightVisible(false);
      setLeftVisible(true);
      setLastOpenedPanel('left');
    } else if (slotByPrefix === 'right') {
      if (isSinglePanel) setLeftVisible(false);
      setRightVisible(true);
      setLastOpenedPanel('right');
    }
  }, [pathname, searchParams, isSinglePanel, setLeftVisible, setRightVisible, setLastOpenedPanel]);

  return null;
}


export function PanelStateProvider({ children }: { children: React.ReactNode }) {
  const [leftVisible, setLeftVisible] = useState(false);
  const [rightVisible, setRightVisible] = useState(false);
  const [lastOpenedPanel, setLastOpenedPanel] = useState<PanelSide | null>(null);
  const [isSinglePanel, setIsSinglePanel] = useState(true);

  useEffect(() => {
    const check = () => setIsSinglePanel(getIsSinglePanel());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const openLeft = useCallback(() => {
    if (isSinglePanel && rightVisible) {
      setRightVisible(false);
    }
    setLeftVisible(true);
    setLastOpenedPanel('left');
  }, [isSinglePanel, rightVisible]);

  const openRight = useCallback(() => {
    if (isSinglePanel && leftVisible) {
      setLeftVisible(false);
    }
    setRightVisible(true);
    setLastOpenedPanel('right');
  }, [isSinglePanel, leftVisible]);

  const closeLeft = useCallback(() => setLeftVisible(false), []);
  const closeRight = useCallback(() => setRightVisible(false), []);

  return (
    <PanelStateContext.Provider
      value={{
        leftVisible,
        rightVisible,
        lastOpenedPanel,
        openLeft,
        openRight,
        closeLeft,
        closeRight,
      }}
    >
      <Suspense>
        <PanelUrlSync
          isSinglePanel={isSinglePanel}
          setLeftVisible={setLeftVisible}
          setRightVisible={setRightVisible}
          setLastOpenedPanel={setLastOpenedPanel}
        />
      </Suspense>
      {children}
    </PanelStateContext.Provider>
  );
}

export function usePanelState() {
  const ctx = useContext(PanelStateContext);
  if (!ctx) throw new Error('usePanelState must be used within PanelStateProvider');
  return ctx;
}
