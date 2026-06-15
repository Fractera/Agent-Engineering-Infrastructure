"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { RouteEntry } from "@/config/ui/initial-app-config";

type SlotRoutesContextValue = {
  routes: RouteEntry[];
  addRoute: (route: RouteEntry) => void;
  removeRoute: (path: string) => void;
  updateRoute: (path: string, data: Partial<RouteEntry>) => void;
  updateRouteLock: (path: string, isLocked: boolean) => void;
  rollback: () => void;
  isDefaultPageNull: boolean;
  setIsDefaultPageNull: (value: boolean) => void;
  rollbackIsDefaultPageNull: () => void;
  defaultPageUrl: string;
  setDefaultPageUrl: (url: string) => void;
  rollbackDefaultPageUrl: () => void;
  activePagePath: string | null;
  setActivePagePath: (path: string | null) => void;
};

export const SlotRoutesContext = createContext<SlotRoutesContextValue | null>(null);

export function SlotRoutesProvider({
  initialRoutes,
  initialIsDefaultPageNull,
  initialDefaultPageUrl,
  initialActivePagePath,
  children,
}: {
  initialRoutes: readonly RouteEntry[];
  initialIsDefaultPageNull: boolean;
  initialDefaultPageUrl: string;
  initialActivePagePath?: string | null;
  children: ReactNode;
}) {
  const [routes, setRoutes] = useState<RouteEntry[]>([...initialRoutes]);
  const [snapshot, setSnapshot] = useState<RouteEntry[]>([...initialRoutes]);

  const [isDefaultPageNull, setIsDefaultPageNullState] = useState(initialIsDefaultPageNull);
  const [snapshotDefaultPageNull, setSnapshotDefaultPageNull] = useState(initialIsDefaultPageNull);

  useEffect(() => {
    setIsDefaultPageNullState(initialIsDefaultPageNull);
    setSnapshotDefaultPageNull(initialIsDefaultPageNull);
  }, [initialIsDefaultPageNull]);

  const [defaultPageUrl, setDefaultPageUrlState] = useState(initialDefaultPageUrl);
  const [snapshotDefaultPageUrl, setSnapshotDefaultPageUrl] = useState(initialDefaultPageUrl);

  const [activePagePath, setActivePagePath] = useState<string | null>(null);

  const addRoute = (route: RouteEntry) => {
    setSnapshot(routes);
    setRoutes([...routes, route]);
  };

  const removeRoute = (path: string) => {
    setSnapshot(routes);
    setRoutes(routes.filter((r) => r.path !== path));
  };

  const updateRoute = (path: string, data: Partial<RouteEntry>) => {
    setSnapshot(routes);
    setRoutes(routes.map((r) => (r.path === path ? { ...r, ...data } : r)));
  };

  const updateRouteLock = (path: string, isLocked: boolean) => {
    setSnapshot(routes);
    setRoutes(routes.map((r) => (r.path === path ? { ...r, isLocked } : r)));
  };

  const rollback = () => {
    setRoutes(snapshot);
  };

  const setIsDefaultPageNull = (value: boolean) => {
    setSnapshotDefaultPageNull(isDefaultPageNull);
    setIsDefaultPageNullState(value);
  };

  const rollbackIsDefaultPageNull = () => {
    setIsDefaultPageNullState(snapshotDefaultPageNull);
  };

  const setDefaultPageUrl = (url: string) => {
    setSnapshotDefaultPageUrl(defaultPageUrl);
    setDefaultPageUrlState(url);
  };

  const rollbackDefaultPageUrl = () => {
    setDefaultPageUrlState(snapshotDefaultPageUrl);
  };

  return (
    <SlotRoutesContext.Provider value={{
      routes, addRoute, removeRoute, updateRoute, updateRouteLock, rollback,
      isDefaultPageNull, setIsDefaultPageNull, rollbackIsDefaultPageNull,
      defaultPageUrl, setDefaultPageUrl, rollbackDefaultPageUrl,
      activePagePath, setActivePagePath,
    }}>
      {children}
    </SlotRoutesContext.Provider>
  );
}

export function useSlotRoutes() {
  const ctx = useContext(SlotRoutesContext);
  if (!ctx) throw new Error("useSlotRoutes must be used inside SlotRoutesProvider");
  return ctx;
}
