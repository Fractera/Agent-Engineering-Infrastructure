'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { LAYOUT_CONFIG } from '@/config/ui/layout.config';

// Ported from the 22slots reference (providers/width-toggle-provider.client.tsx).
// ADAPTED: accepts a server-driven `defaultWidth` so the footer-slot MCP (and Admin -> Platform)
// can set the center width the toggle starts from on load. Omitted = narrow (reference behaviour).

type WidthToggleContextValue = {
  centerMaxWidth: number;
  toggleWidth: () => void;
  // Set a SPECIFIC width (not just toggle) — used by the public consultant's client-action
  // `public_view_set_width`.
  setWidth: (w: "narrow" | "wide") => void;
};

const WidthToggleContext = createContext<WidthToggleContextValue | null>(null);

export function WidthToggleProvider({
  children,
  defaultWidth = "narrow",
}: {
  children: React.ReactNode;
  defaultWidth?: "narrow" | "wide";
}) {
  const [centerMaxWidth, setCenterMaxWidth] = useState<number>(
    defaultWidth === "wide"
      ? LAYOUT_CONFIG.CENTER_MAX_W_WIDE
      : LAYOUT_CONFIG.CENTER_MAX_W_NARROW
  );

  const toggleWidth = useCallback(() => {
    setCenterMaxWidth((w) =>
      w === LAYOUT_CONFIG.CENTER_MAX_W_NARROW
        ? LAYOUT_CONFIG.CENTER_MAX_W_WIDE
        : LAYOUT_CONFIG.CENTER_MAX_W_NARROW
    );
  }, []);

  const setWidth = useCallback((w: "narrow" | "wide") => {
    setCenterMaxWidth(
      w === "wide" ? LAYOUT_CONFIG.CENTER_MAX_W_WIDE : LAYOUT_CONFIG.CENTER_MAX_W_NARROW
    );
  }, []);

  return (
    <WidthToggleContext.Provider value={{ centerMaxWidth, toggleWidth, setWidth }}>
      {children}
    </WidthToggleContext.Provider>
  );
}

export function useWidthToggle() {
  const ctx = useContext(WidthToggleContext);
  if (!ctx) throw new Error('useWidthToggle must be used within WidthToggleProvider');
  return ctx;
}
