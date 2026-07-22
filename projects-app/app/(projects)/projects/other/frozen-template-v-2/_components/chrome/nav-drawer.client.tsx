"use client";

import { useState } from "react";
import { HamburgerIcon, ChevronDownIcon, CloseIcon } from "./icons";
import { sectionsStrings } from "../shared/sections-i18n";

// ЯЩИК НАВИГАЦИИ ВИТРИНЫ — гамбургер слева от Sparkle открывает панель у ЛЕВОГО края (раскладка shadcn
// Sheet, воспроизведённая самодостаточно: затемнение + панель, закрытие по фону и по Esc-кнопке; закон 0).
//
// ЗАЧЕМ. На витрине аккордеонов нет, всё раскрыто, поэтому страница длинная. Ящик — оглавление: строка
// на каждый раздел и раскрывашка со списком его сущностей (вторая таблица, второй пульт…). Клик ведёт к
// якорю `#entity-<cuid>` — прокрутка на месте, без перезагрузки.
//
// Первая запись — ПАНЕЛЬ УПРАВЛЕНИЯ: тот же адрес без `?view=public`, открывается ОТДЕЛЬНОЙ вкладкой,
// чтобы витрина, на которую человек пришёл, не терялась.
export type NavGroup = { tab: string; title: string; entities: { cuid: string; title: string }[] };

export default function NavDrawer({ groups, lang }: { groups: NavGroup[]; lang: string }) {
  const S = sectionsStrings(lang);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(() => groups.map((g) => g.tab));

  const cockpitHref = typeof location === "undefined" ? "#" : location.pathname;

  function go(id: string) {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <button
        type="button"
        aria-label={S.navAria}
        onClick={() => setOpen(true)}
        className="flex items-center rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <HamburgerIcon className="size-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-label={S.navAria}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto border-r bg-background p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{S.navTitle}</span>
              <button type="button" aria-label={S.close} onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <CloseIcon className="size-4" />
              </button>
            </div>

            {/* панель управления — отдельной вкладкой */}
            <a
              href={cockpitHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
            >
              {S.openCockpit}
            </a>

            <div className="my-2 h-px bg-border" />

            {/* оглавление: раздел и его сущности */}
            {groups.map((g) => {
              const isOpen = expanded.includes(g.tab);
              return (
                <div key={g.tab}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((e) => (e.includes(g.tab) ? e.filter((t) => t !== g.tab) : [...e, g.tab]))
                    }
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="capitalize">{g.title}</span>
                    <ChevronDownIcon className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen
                    ? g.entities.map((e) => (
                        <button
                          key={e.cuid}
                          type="button"
                          onClick={() => go(`entity-${e.cuid}`)}
                          className="flex w-full items-center rounded-sm py-1.5 pl-6 pr-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <span className="mr-2 text-xs">•</span>
                          <span className="truncate">{e.title}</span>
                        </button>
                      ))
                    : null}
                </div>
              );
            })}
          </aside>
        </div>
      ) : null}
    </>
  );
}
