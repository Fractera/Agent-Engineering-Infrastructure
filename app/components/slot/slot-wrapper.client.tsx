"use client"

import { ReactNode } from "react";
import { SlotRoutesProvider } from "@/components/slot/slot-routes-context.client";
import { SlotActionsProvider } from "@/components/slot/slot-actions-context.client";
import { FractalHoverProvider } from "@/components/fractal/fine-tune-chain/fractal-hover-context.client";
import { SlotHighlight } from "@/components/slot/slot-highlight.client";
import type { RouteEntry } from "@/config/ui/initial-app-config";

interface SlotWrapperProps {
  slotName: string;
  initialRoutes: readonly RouteEntry[];
  initialIsDefaultPageNull: boolean;
  initialDefaultPageUrl: string;
  children: ReactNode;
}

export function SlotWrapper({
  slotName,
  initialRoutes,
  initialIsDefaultPageNull,
  initialDefaultPageUrl,
  children,
}: SlotWrapperProps) {
  return (
    <SlotRoutesProvider initialRoutes={initialRoutes} initialIsDefaultPageNull={initialIsDefaultPageNull} initialDefaultPageUrl={initialDefaultPageUrl}>
      <SlotActionsProvider>
        <FractalHoverProvider>
          <SlotHighlight slotName={slotName}>
            {children}
          </SlotHighlight>
        </FractalHoverProvider>
      </SlotActionsProvider>
    </SlotRoutesProvider>
  );
}
