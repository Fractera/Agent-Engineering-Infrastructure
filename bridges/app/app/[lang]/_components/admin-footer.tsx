// Подвал нового слоя панели (шаг 501). Серверный компонент, форма повторяет
// сегодняшний подвал: слева состояние проекта, справа действия.
//
// Кнопки — ЗАГОТОВКИ без логики: развернуть, забрать и отправить трогают
// сервер, и появиться они обязаны вместе со своими маршрутами, а не как
// нажимаемая пустышка.
//
// Мобильное правило дня 2026-08-08 соблюдено сразу: ниже sm остаются иконки и
// версия коммита, подписи и имя репозитория скрыты.

import Link from "next/link";
import { GitBranch, Rocket, ArrowDownToLine, ArrowUpFromLine, BookOpen } from "lucide-react";
import { adminHref } from "@/lib/admin-nav";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { LanguageSwitch } from "./language-switch";
import { ThemeSwitch } from "./theme-switch.client";
import { WidthSwitch } from "./width-switch.client";

export function AdminFooter({ s, lang }: { s: AdminStrings; lang: string }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-t border-border bg-background px-3">
      <span className="flex min-w-0 flex-1 items-center gap-1 font-mono text-[10px] text-muted-foreground/70">
        <GitBranch size={9} className="shrink-0" />
        <span className="truncate">{s.footer.stateUnknown}</span>
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
      </span>

      <Link
        href={adminHref(lang, "how-to-build")}
        className="inline-flex h-5 items-center gap-1 rounded border border-border px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <BookOpen size={10} />
        <span className="hidden lg:inline">{s.footer.howToBuild}</span>
      </Link>

      {([
        [Rocket, s.footer.deploy],
        [ArrowDownToLine, s.footer.pull],
        [ArrowUpFromLine, s.footer.push],
      ] as const).map(([Icon, label]) => (
        <span
          key={label}
          title={s.skeletonNotice}
          className="inline-flex h-5 items-center gap-1 rounded border border-border px-2 text-[10px] text-muted-foreground/50"
        >
          <Icon size={10} />
          <span className="hidden sm:inline">{label}</span>
        </span>
      ))}

      {/* Правый нижний угол — три настройки взгляда на панель, а не действия над
          проектом: ширина, тема и язык. Стоят последними и рядом намеренно, в
          порядке от общего к частному: сколько места, каким цветом, на каком
          языке.
          Подписи приезжают сюда пропсами: островки клиентские, и словарь им
          передаётся уже разрешённым, чтобы 82 языка не уехали в браузер. */}
      <WidthSwitch labels={s.width} />
      <ThemeSwitch labels={s.theme} />
      <LanguageSwitch lang={lang} />
    </div>
  );
}
