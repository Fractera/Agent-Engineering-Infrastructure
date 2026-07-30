"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ЛЕНИВЫЙ БЛОК — содержимое НЕ запрашивается у сервера, пока раздел не попал в поле зрения (требование
// владельца 2026-07-22: данные таблиц тяжёлые, тянуть их «на всякий случай» запрещено).
//
// ОДИН МЕХАНИЗМ НА ОБЕ ПОВЕРХНОСТИ. Наблюдатель пересечения (IntersectionObserver) отвечает сразу на оба
// случая, и второго условия не нужно:
//   • витрина — раздел раскрыт всегда, значит грузится, когда посетитель до него ДОКРУТИЛ;
//   • кокпит — раздел лежит в закрытом аккордеоне, у него нулевая высота, пересечения нет; владелец
//     раскрыл аккордеон — блок появился в поле зрения и только тогда пошёл за данными.
// Загрузили один раз — больше не перезагружаем: `once` держит блок живым, если он ушёл из вида.
//
// Пока данных нет, на месте блока стоит КОНТЕЙНЕР С ЗАГРУЗЧИКОМ той же высоты — страница не прыгает,
// когда содержимое приезжает.
export default function LazyBlock({
  minHeight = 160,
  children,
}: {
  /** Высота места, которое занимает загрузчик — примерно во столько же вырастет содержимое. */
  minHeight?: number;
  /** Отрисовывается ТОЛЬКО после появления в поле зрения. */
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    // запас в 200px: начинаем грузить чуть раньше, чем раздел въедет в экран
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={ref} data-lazy={visible ? "loaded" : "waiting"}>
      {visible ? (
        children
      ) : (
        <div className="flex items-center justify-center rounded-md border border-dashed" style={{ minHeight }}>
          <span className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        </div>
      )}
    </div>
  );
}
