'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';

// Ported verbatim from the 22slots reference (providers/screen-width-provider.client.tsx).

const SSR_FALLBACK = 1280;

function subscribe(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

function getSnapshot() {
  return typeof window !== 'undefined' ? window.innerWidth : SSR_FALLBACK;
}

function getServerSnapshot() {
  return SSR_FALLBACK;
}

type ScreenWidthContextValue = {
  screenWidth: number;
};

const ScreenWidthContext = createContext<ScreenWidthContextValue | null>(null);

export function ScreenWidthProvider({ children }: { children: React.ReactNode }) {
  const screenWidth = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return (
    <ScreenWidthContext.Provider value={{ screenWidth }}>
      {children}
    </ScreenWidthContext.Provider>
  );
}

export function useScreenWidth() {
  const ctx = useContext(ScreenWidthContext);
  if (!ctx) throw new Error('useScreenWidth must be used within ScreenWidthProvider');
  return ctx.screenWidth;
}
