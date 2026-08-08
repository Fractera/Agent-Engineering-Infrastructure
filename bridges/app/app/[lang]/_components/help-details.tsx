// Справка раздела — раскрывашка «?» (шаг 501).
//
// В старой оболочке это был клиентский `HelpNote` с состоянием. Здесь тот же
// смысл делает родной `<details>`: раскрывается без JS, ищется поиском по
// странице, печатается вместе с ней. Состояние ради одного раскрытия не нужно.
//
// Общий компонент для ВСЕХ разделов: справка есть у каждого, и выглядеть она
// обязана одинаково.

import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

export function HelpDetails({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mt-3 rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <HelpCircle size={12} />
        {label}
      </summary>
      <div className="space-y-2 border-t border-border px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono">
        {children}
      </div>
    </details>
  );
}
