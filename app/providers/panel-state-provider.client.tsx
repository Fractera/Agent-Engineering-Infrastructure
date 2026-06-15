"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LAYOUT_CONFIG } from "@/config/ui/layout.config";

// Open/close state for the left & right side panels. Ported from the 22slots reference,
// simplified: the URL-prefix sync (/l/, /r/) is dropped until those slot routes exist, and
// initial visibility is taken from props (so a slot the owner marked active in Admin ->
// Platform shows immediately). Below the single-panel breakpoint only one side stays open.

type PanelSide = "left" | "right";

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
  if (typeof window === "undefined") return true;
  return window.innerWidth < LAYOUT_CONFIG.BREAKPOINT_SINGLE_PANEL;
}

export function PanelStateProvider({
  children,
  initialLeftVisible = false,
  initialRightVisible = false,
}: {
  children: React.ReactNode;
  initialLeftVisible?: boolean;
  initialRightVisible?: boolean;
}) {
  const [leftVisible, setLeftVisible] = useState(initialLeftVisible);
  const [rightVisible, setRightVisible] = useState(initialRightVisible);
  const [lastOpenedPanel, setLastOpenedPanel] = useState<PanelSide | null>(null);
  const [isSinglePanel, setIsSinglePanel] = useState(true);

  useEffect(() => {
    const check = () => {
      const single = getIsSinglePanel();
      setIsSinglePanel(single);
      // On narrow screens never keep both open at once.
      if (single) setRightVisible((r) => (r && leftVisible ? false : r));
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLeft = useCallback(() => {
    if (isSinglePanel && rightVisible) setRightVisible(false);
    setLeftVisible(true);
    setLastOpenedPanel("left");
  }, [isSinglePanel, rightVisible]);

  const openRight = useCallback(() => {
    if (isSinglePanel && leftVisible) setLeftVisible(false);
    setRightVisible(true);
    setLastOpenedPanel("right");
  }, [isSinglePanel, leftVisible]);

  const closeLeft = useCallback(() => setLeftVisible(false), []);
  const closeRight = useCallback(() => setRightVisible(false), []);

  return (
    <PanelStateContext.Provider
      value={{ leftVisible, rightVisible, lastOpenedPanel, openLeft, openRight, closeLeft, closeRight }}
    >
      {children}
    </PanelStateContext.Provider>
  );
}

export function usePanelState() {
  const ctx = useContext(PanelStateContext);
  if (!ctx) throw new Error("usePanelState must be used within PanelStateProvider");
  return ctx;
}
