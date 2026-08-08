"use client";

// Переключатель ширины рабочей области (шаг 501). Стоит в подвале слева от
// переключателя темы.
//
// ПОРТ С ГЛАВНОЙ ПРИЛОЖЕНИЯ (:3000), образец —
// `fractera-next-starter/components/menu/footer/app-width-toggle.client.tsx`:
// та же пара иконок (`UnfoldHorizontal` / `FoldHorizontal`), тот же атрибут
// `html[data-app-width="wide"]`, тот же ключ хранилища `fractera-app-width`.
// Ширину задаёт ОДНА переменная CSS `--app-w`, поэтому кнопка не знает ни про
// одну страницу и ничего не пересобирает — расширяются все контейнеры с
// `data-app-column` сразу.
//
// Зачем это панели: на разделах-таблицах (база данных, пользователи) колонка
// 48rem слишком узка — данные не для чтения абзацем, а для осмотра рядами.
//
// Скрыт ниже md: там раскладка и так в одну колонку на всю ширину.
//
// Состояние читается с `<html>`, а не из хранилища: атрибут уже поставлен
// скриптом до первой отрисовки, и он — единственный источник правды.

import { useEffect, useState } from "react";
import { UnfoldHorizontal, FoldHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "fractera-app-width";

export function WidthSwitch({ labels }: { labels: { wide: string; normal: string } }) {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    setWide(document.documentElement.getAttribute("data-app-width") === "wide");
  }, []);

  function toggle() {
    const next = !wide;
    const el = document.documentElement;
    if (next) el.setAttribute("data-app-width", "wide");
    else el.removeAttribute("data-app-width");
    try {
      localStorage.setItem(STORAGE_KEY, next ? "wide" : "normal");
    } catch {
      /* приватное окно — переключение работает, просто не запомнится */
    }
    setWide(next);
  }

  const label = wide ? labels.normal : labels.wide;
  const Icon = wide ? FoldHorizontal : UnfoldHorizontal;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={wide}
      className="hidden shrink-0 md:inline-flex"
    >
      <Icon />
    </Button>
  );
}
