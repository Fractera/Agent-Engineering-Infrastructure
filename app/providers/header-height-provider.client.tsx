'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Ported verbatim from the 22slots reference (providers/header-height-provider.client.tsx).

type HeaderHeightContextValue = {
  height: number;
  setHeight: (h: number) => void;
};

const HeaderHeightContext = createContext<HeaderHeightContextValue | null>(null);

export function HeaderHeightProvider({
  initialHeight,
  children,
}: {
  initialHeight: number;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    document.documentElement.style.setProperty('--header-height', `${height}px`);
  }, [height]);

  return (
    <HeaderHeightContext.Provider value={{ height, setHeight }}>
      {children}
    </HeaderHeightContext.Provider>
  );
}

export function useHeaderHeight() {
  const ctx = useContext(HeaderHeightContext);
  if (!ctx) throw new Error('useHeaderHeight must be used inside HeaderHeightProvider');
  return ctx;
}
