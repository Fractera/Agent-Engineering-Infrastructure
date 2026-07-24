"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { WarningRow } from "../types/warnings";

// ПРОВАЙДЕР ПРЕДУПРЕЖДЕНИЙ — ЕДИНЫЙ ИСТОЧНИК открытых проблем (шаг 298, тот же приём, что у уведомлений).
// Выводит список ОДИН РАЗ (дверь `api/projects/warnings` → серверная `collectWarnings` над ядром) и раздаёт
// его контекстом Центру проблем — так предупреждение показывается из одного места, без расхождений. Живёт в
// дев-слое: панель проблем — инструмент разработки; готовому продукту она не нужна.
type Ctx = { warnings: WarningRow[]; refresh: () => void };
const WarningsContext = createContext<Ctx>({ warnings: [], refresh: () => {} });

export function useWarnings(): Ctx {
  return useContext(WarningsContext);
}

function automationFromPath(): string {
  if (typeof window === "undefined") return "";
  const p = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  return p.length >= 3 && p[0] === "projects" ? `${p[1]}/${p[2]}` : "";
}

export function WarningProvider({ children }: { children: React.ReactNode }) {
  const [warnings, setWarnings] = useState<WarningRow[]>([]);

  const refresh = useCallback(async () => {
    const a = automationFromPath();
    if (!a) return;
    const r = await fetch(`/api/projects/warnings?automation=${encodeURIComponent(a)}`, { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as { warnings?: WarningRow[] };
    setWarnings(d.warnings ?? []);
  }, []);

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("fractera:warnings-refresh", onRefresh);
    return () => window.removeEventListener("fractera:warnings-refresh", onRefresh);
  }, [refresh]);

  return <WarningsContext.Provider value={{ warnings, refresh }}>{children}</WarningsContext.Provider>;
}
