"use client";

import { useEffect, useState } from "react";
import { UnfoldHorizontal, FoldHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

// Переключатель ширины колонки для ВСЕГО потока :3003 (футер, шаг «широкий экран»).
// Компонент не знает ни одной страницы: он только ставит html[data-zone-width="wide"],
// а ширину раздаёт единственная переменная --zone-w из globals.css — поэтому хабы,
// страницы автоматизаций, секции сущностей и сам футер меняются одновременно.
// Исходное положение = обычное (85vw); широкое = вся ширина экрана с мостом 32px.
// Выбор запоминается в localStorage и поднимается до отрисовки (zone-width-init.tsx).
//
// МОБИЛЬНАЯ ВЕРСИЯ: кнопки нет (hidden md:inline-flex) — там действует собственный
// оптимизированный режим (колонка на всю ширину, поля дают внутренние отступы страниц),
// переключать нечего.
const STORAGE_KEY = "fractera-zone-width";

export function ZoneWidthToggle({ labels }: { labels: { wide: string; normal: string } }) {
  const [wide, setWide] = useState(false);

  // Читаем фактическое состояние, выставленное inline-скриптом, — не localStorage
  // напрямую: источник истины один, атрибут на <html>.
  useEffect(() => {
    setWide(document.documentElement.getAttribute("data-zone-width") === "wide");
  }, []);

  function toggle() {
    const next = !wide;
    const el = document.documentElement;
    if (next) el.setAttribute("data-zone-width", "wide");
    else el.removeAttribute("data-zone-width");
    try {
      localStorage.setItem(STORAGE_KEY, next ? "wide" : "normal");
    } catch {
      /* приватный режим браузера — переключение работает, просто не запомнится */
    }
    setWide(next);
  }

  const label = wide ? labels.normal : labels.wide;
  const Icon = wide ? FoldHorizontal : UnfoldHorizontal;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={wide}
      className="hidden md:inline-flex"
    >
      <Icon />
    </Button>
  );
}
