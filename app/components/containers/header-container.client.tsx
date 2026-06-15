"use client";

import { ReactNode } from "react";
import { useHeaderHeight } from "@/providers/header-height-provider.client";
import { getZIndexStyle } from "@/config/ui/z-index.config";

// Fixed header bar across the top. Ported from the 22slots reference.
export function HeaderContainer({ children }: { children: ReactNode }) {
  const { height } = useHeaderHeight();
  return (
    <header
      style={{ position: "fixed", top: 0, left: 0, right: 0, height, ...getZIndexStyle("HEADER") }}
    >
      {children}
    </header>
  );
}
