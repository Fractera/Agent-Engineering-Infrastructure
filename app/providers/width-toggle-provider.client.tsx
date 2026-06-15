"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { LAYOUT_CONFIG } from "@/config/ui/layout.config";

// Toggles the center content max-width (narrow <-> wide). Ported from the 22slots reference.

type WidthToggleContextValue = { centerMaxWidth: number; toggleWidth: () => void };

const WidthToggleContext = createContext<WidthToggleContextValue | null>(null);

export function WidthToggleProvider({ children }: { children: React.ReactNode }) {
  const [centerMaxWidth, setCenterMaxWidth] = useState<number>(LAYOUT_CONFIG.CENTER_MAX_W_NARROW);

  const toggleWidth = useCallback(() => {
    setCenterMaxWidth((w) =>
      w === LAYOUT_CONFIG.CENTER_MAX_W_NARROW
        ? LAYOUT_CONFIG.CENTER_MAX_W_WIDE
        : LAYOUT_CONFIG.CENTER_MAX_W_NARROW
    );
  }, []);

  return (
    <WidthToggleContext.Provider value={{ centerMaxWidth, toggleWidth }}>
      {children}
    </WidthToggleContext.Provider>
  );
}

export function useWidthToggle() {
  const ctx = useContext(WidthToggleContext);
  if (!ctx) throw new Error("useWidthToggle must be used within WidthToggleProvider");
  return ctx;
}
