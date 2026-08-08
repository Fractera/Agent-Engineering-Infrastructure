"use client";

// Переключатель темы в подвале, слева от переключателя языка (шаг 501).
//
// ПОРТ С ГЛАВНОЙ ПРИЛОЖЕНИЯ (:3000). Образец —
// `fractera-next-starter/components/menu/shared/theme-toggle.client.tsx` плюс
// `providers/theme-provider.client.tsx`: цикл `система → светлая → тёмная`,
// иконка называет ТЕКУЩИЙ режим (Monitor / Sun / Moon), тема живёт классом
// `dark` на `<html>` и запоминается в `localStorage`.
//
// ЧТО УПРОЩЕНО ПРОТИВ ОБРАЗЦА. Там тема раздаётся через контекст-провайдер,
// потому что её читают несколько мест. Здесь читатель ровно один — эта кнопка,
// поэтому провайдера нет: состояние местное. Провайдер появится, если тему
// понадобится знать кому-то ещё, а не заранее «на всякий случай».
//
// ЭТО ПЕРВЫЙ И ПОКА ЕДИНСТВЕННЫЙ КЛИЕНТСКИЙ ОСТРОВОК НОВОГО СЛОЯ. Иначе нельзя:
// тема — это состояние в браузере конкретного человека, серверу оно неизвестно.
// Островок крошечный и словарь не импортирует — подписи приезжают пропсами из
// серверного подвала, поэтому 82 языка по-прежнему остаются на сервере.
// Без JS кнопка ничего не делает; тему в этом случае определяет система.

import { useCallback, useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ThemeMode = "system" | "light" | "dark";

const THEME_CYCLE: ThemeMode[] = ["system", "light", "dark"];
// Ключ тот же, что на :3000. Хранилища всё равно раздельные (панель живёт на
// своём субдомене), но одинаковое имя избавляет от вопроса «а почему тут иначе».
const THEME_KEY = "fractera-theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else if (mode === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
}

export function ThemeSwitch(
  { labels }: { labels: { system: string; light: string; dark: string } },
) {
  // `null` до монтирования: на сервере выбранного режима знать неоткуда, и
  // отрисовать наугад значит показать чужую иконку на первом кадре.
  const [mode, setMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    const active = saved && THEME_CYCLE.includes(saved) ? saved : "system";
    setMode(active);
    applyTheme(active);
  }, []);

  // В системном режиме тема обязана следовать за системой, пока страница
  // открыта, — иначе «системная» означала бы «такая, какой система была
  // однажды».
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((prev) => {
      const next = THEME_CYCLE[(THEME_CYCLE.indexOf(prev ?? "system") + 1) % THEME_CYCLE.length];
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  const label = mode === "light" ? labels.light : mode === "dark" ? labels.dark : labels.system;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="shrink-0"
    >
      <Icon />
    </Button>
  );
}
