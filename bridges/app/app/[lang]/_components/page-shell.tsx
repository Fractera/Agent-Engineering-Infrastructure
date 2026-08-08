// Общая рамка страницы панели (шаг 501). Серверный компонент.
//
// Одна рамка на все разделы: заголовок, поясняющая строка и место под
// содержимое. Пока раздел без логики — рамка честно говорит об этом полосой
// заготовки; когда логика переезжает, полоса убирается вместе с пропсом.

import type { ReactNode } from "react";

export function PageShell(
  { title, hint, notice, children }:
  { title: string; hint: string; notice?: string; children?: ReactNode },
) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{hint}</p>

      {notice && (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground/80">
          {notice}
        </p>
      )}

      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
