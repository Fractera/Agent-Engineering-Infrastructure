"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Notice } from "../types/notifications";

// ПРОВАЙДЕР УВЕДОМЛЕНИЙ — ЕДИНЫЙ ИСТОЧНИК поводов внимания (шаг 298, замысел владельца). Выводит список
// ОДИН РАЗ (дверь `api/projects/notices` → серверная `collectNotices` над ядром) и раздаёт его контекстом
// всем поверхностям (полоса, будущие бейджи узлов, панель проблем) — так они не выводят одно и то же
// независимо и не расходятся. Обновляется по событию `fractera:notices-refresh` (его шлют панели после
// правки ядра) — тогда полоса пересчитывается без перезагрузки.
//
// Живёт в дев-слое: полоса — инструмент РАЗРАБОТКИ (что не построено, гейт кейсов, запуск разработки);
// конечному пользователю готового продукта она не нужна. Нет `_shared-v2` — провайдер не монтируется вовсе.

type Ctx = { notices: Notice[]; refresh: () => void };
const NoticesContext = createContext<Ctx>({ notices: [], refresh: () => {} });

export function useNotices(): Ctx {
  return useContext(NoticesContext);
}

/** Адрес автоматизации из URL (папка самодостаточна — знает себя только по адресу страницы). */
function automationFromPath(): string {
  if (typeof window === "undefined") return "";
  const p = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  return p.length >= 3 && p[0] === "projects" ? `${p[1]}/${p[2]}` : "";
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);

  const refresh = useCallback(async () => {
    const a = automationFromPath();
    if (!a) return;
    const r = await fetch(`/api/projects/notices?automation=${encodeURIComponent(a)}`, { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as { notices?: Notice[] };
    setNotices(d.notices ?? []);
  }, []);

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("fractera:notices-refresh", onRefresh);
    return () => window.removeEventListener("fractera:notices-refresh", onRefresh);
  }, [refresh]);

  return <NoticesContext.Provider value={{ notices, refresh }}>{children}</NoticesContext.Provider>;
}
