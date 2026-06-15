'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type FractalHoverContextValue = {
  activeId: string | null;
  activePath: string | null;
  setActive: (id: string | null, path: string | null) => void;
};

const FractalHoverContext = createContext<FractalHoverContextValue | null>(null);

export function FractalHoverProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const setActive = useCallback((id: string | null, path: string | null) => {
    setActiveId(id);
    setActivePath(path);
  }, []);
  return (
    <FractalHoverContext.Provider value={{ activeId, activePath, setActive }}>
      {children}
    </FractalHoverContext.Provider>
  );
}

export function useFractalHover() {
  const ctx = useContext(FractalHoverContext);
  if (!ctx) throw new Error('useFractalHover must be used within FractalHoverProvider');
  return ctx;
}
