"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../../../use-ui-lang";
import { launcherStrings } from "./launcher-i18n";
import { DevConsole } from "./dev-console.client";

// ПРОВАЙДЕР ДЕВ-КОНСОЛИ (шаг 298) — ЕДИНЫЙ владелец консоли на всю зону «Проекты». Монтируется ОДИН раз в
// layout зоны и оборачивает страницы автоматизаций.
//
// ЗАЧЕМ ПРОВАЙДЕР, А НЕ ПРОСТО ЗАПУСКАТЕЛЬ (вопрос владельца): нужна ОДНА контролируемая точка приёма запуска
// разработки, чтобы разные автоматизации не запускали её одновременно. Все запуски сходятся в `launch` с
// одним guard: открыта консоль ДРУГОЙ автоматизации → отказ, живая сессия первой не трогается.
//
// ДВА ПУТИ ПРИЁМА, оба через guarded-`launch` (закон устойчивости):
//   • внутрипапочный триггер (кнопка в уведомлении, рантайм, закон 0) шлёт DOM-событие — провайдер ловит;
//   • дев-слотовый триггер (мягкий слой) зовёт `useDevConsole().launch(automation)` типизированно.
// Свойств минимум — id автоматизации; `roomPath`/`roomTask` провайдер дотягивает сам через `api/dev-room`.
const EVENT = "fractera:launch-development";

type Room = { roomPath: string; roomTask: string };
type DevConsoleCtx = {
  /** Запросить запуск разработки автоматизации; guard внутри — одна за раз. */
  launch: (automation: string) => void;
  /** Кого сейчас разрабатывают (или null). */
  active: string | null;
};

const Ctx = createContext<DevConsoleCtx | null>(null);

/** Доступ к дев-консоли из дев-слотовых кнопок. */
export function useDevConsole(): DevConsoleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDevConsole must be used inside <DevConsoleProvider>");
  return ctx;
}

export function DevConsoleProvider({ children }: { children: React.ReactNode }) {
  const lang = useUiLang();
  const L = launcherStrings(lang);
  const [automation, setAutomation] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  const launch = useCallback(
    (requested: string) => {
      const a = requested?.trim();
      if (!a) return;
      // GUARD КОНФЛИКТА: одна разработка за раз. Открыта ДРУГАЯ — отказ; та же — ничего (уже открыта).
      if (automation && automation !== a) {
        toast.error(L.busy.replace("{a}", automation));
        return;
      }
      if (automation === a) return;
      setAutomation(a);
      setRoom(null);
      fetch(`/api/projects/dev-room?automation=${encodeURIComponent(a)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: Room) => setRoom(d))
        .catch(() => { toast.error(L.failed); setAutomation(null); });
    },
    [automation, L],
  );

  // Внутрипапочные триггеры (закон 0) шлют DOM-событие → тот же guarded-launch.
  useEffect(() => {
    const on = (e: Event) => {
      const detail = (e as CustomEvent).detail as { automation?: string } | undefined;
      if (detail?.automation) launch(detail.automation);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [launch]);

  const close = () => { setAutomation(null); setRoom(null); };

  return (
    <Ctx.Provider value={{ launch, active: automation }}>
      {children}
      {/* Одна модалка на зону: пока открыта, второй запуск отклоняется guard'ом выше. Esc/клик-снаружи не
          закрывают — Escape принадлежит терминалу (Claude Code им прерывает), а случайный клик не должен
          убить живую сессию. */}
      {automation ? (
        <Dialog open onOpenChange={(v) => { if (!v) close(); }}>
          <DialogContent
            className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-5xl"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Rocket className="size-4" /> {L.launch}
              </DialogTitle>
            </DialogHeader>
            {room ? (
              <DevConsole automation={automation} roomPath={room.roomPath} roomTask={room.roomTask} lang={lang} onExited={close} />
            ) : (
              <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {L.launch}…
              </p>
            )}
          </DialogContent>
        </Dialog>
      ) : null}
    </Ctx.Provider>
  );
}
