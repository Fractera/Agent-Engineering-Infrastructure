// Крупная переливающаяся ссылка — «создать репозиторий на GitHub» (шаг 25-3).
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА ДОСЛОВНО (2026-08-26): «кнопку эту люди не замечают и
// никто не нажимает, поэтому сделайте надпись шрифтом, который крупнее чем
// средний шрифт на странице, и пусть он переливается из оранжевого в чёрный».
// Это не украшение: способность существовала и не работала, потому что её не
// видели.
//
// 🔒 СЕРВЕРНЫЙ КОМПОНЕНТ. Переливание — CSS-анимация по градиенту, обработчиков
// нет. Островок стоил бы JS ради того, что делает таблица стилей.
//
// 🔒 УВАЖАЕТ `prefers-reduced-motion`: при запрете движения остаётся ровный
// оранжевый — заметный, но неподвижный. Класс тот же, правило живёт в
// `globals.css`.

import { ExternalLink } from "lucide-react";

export function ShimmerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="launch-shimmer inline-flex items-center gap-1.5 text-[17px] font-semibold leading-tight"
    >
      {children}
      <ExternalLink size={14} className="shrink-0 opacity-70" />
    </a>
  );
}
