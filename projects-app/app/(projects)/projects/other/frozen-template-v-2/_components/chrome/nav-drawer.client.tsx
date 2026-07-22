"use client";

import { useEffect, useState } from "react";
import { HamburgerIcon, ChevronDownIcon, CloseIcon } from "./icons";
import { sectionsStrings } from "../shared/sections-i18n";
import { readNavOpen, writeNavOpen } from "../shared/sections-state";

// ЯЩИК НАВИГАЦИИ ВИТРИНЫ — гамбургер слева от Sparkle выдвигает панель у ЛЕВОГО края (раскладка shadcn
// Sheet, воспроизведённая самодостаточно; закон 0).
//
// ЗАЧЕМ. На витрине аккордеонов нет, всё раскрыто, поэтому страница длинная. Ящик — оглавление: строка на
// КАЖДЫЙ показанный раздел и раскрывашка со списком его сущностей. Клик по сущности ведёт к якорю
// `#entity-<cuid>` — прокрутка на месте, без перезагрузки.
//
// ПОВЕДЕНИЕ (правки владельца 2026-07-22):
//   • ящик начинается ПОД ШАПКОЙ (top-14 = высота хедера зоны) и не наезжает на неё;
//   • открытие и закрытие АНИМИРОВАНЫ — панель выезжает слева, затемнение проявляется;
//   • закрывается ТОЛЬКО крестиком в правом верхнем углу или кликом по пространству за ящиком. Клик по
//     пункту оглавления ящик НЕ закрывает: владелец ходит по нескольким разделам подряд;
//   • категории приходят ЗАКРЫТЫМИ, а какие он раскрыл — помнит браузер этой автоматизации; в следующий
//     раз открытыми будут ровно они.
//
// Первая запись — ПАНЕЛЬ УПРАВЛЕНИЯ: тот же адрес без `?view=public`, отдельной вкладкой, чтобы витрина,
// на которую человек пришёл, не терялась.
export type NavGroup = { tab: string; title: string; entities: { cuid: string; title: string }[] };

export default function NavDrawer({ groups, lang }: { groups: NavGroup[]; lang: string }) {
  const S = sectionsStrings(lang);
  const [mounted, setMounted] = useState(false); // ящик в DOM (нужен, чтобы отыграть анимацию закрытия)
  const [shown, setShown] = useState(false); // ящик доехал до края — то, что анимируется
  const [expanded, setExpanded] = useState<string[]>([]);

  // Раскрытые категории поднимаются из памяти браузера при открытии — умолчание ЗАКРЫТО.
  useEffect(() => {
    if (!mounted) return;
    setExpanded(groups.filter((g) => readNavOpen(g.tab)).map((g) => g.tab));
  }, [mounted, groups]);

  function open() {
    setMounted(true);
    // следующий кадр — чтобы браузер увидел переход из закрытого состояния в открытое
    requestAnimationFrame(() => setShown(true));
  }

  function close() {
    setShown(false);
    setTimeout(() => setMounted(false), 200); // столько же длится переход
  }

  function toggleGroup(tab: string) {
    const next = !expanded.includes(tab);
    setExpanded((e) => (next ? [...e, tab] : e.filter((t) => t !== tab)));
    writeNavOpen(tab, next);
  }

  const cockpitHref = typeof location === "undefined" ? "#" : location.pathname;

  return (
    <>
      <button
        type="button"
        aria-label={S.navAria}
        onClick={open}
        className="flex items-center rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <HamburgerIcon className="size-4" />
      </button>

      {mounted ? (
        // ПОД ШАПКОЙ: top-14 — высота хедера зоны; ящик и затемнение начинаются ровно под ним.
        <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex" role="dialog" aria-label={S.navAria}>
          <div
            onClick={close}
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
          />
          <aside
            className={`relative h-full w-72 max-w-[85vw] overflow-y-auto border-r bg-background p-3 shadow-xl transition-transform duration-200 ease-out ${
              shown ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{S.navTitle}</span>
              <button type="button" aria-label={S.close} onClick={close} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <CloseIcon className="size-4" />
              </button>
            </div>

            <a
              href={cockpitHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
            >
              {S.openCockpit}
            </a>

            <div className="my-2 h-px bg-border" />

            {groups.map((g) => {
              const isOpen = expanded.includes(g.tab);
              return (
                <div key={g.tab}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.tab)}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="capitalize">{g.title}</span>
                    {g.entities.length ? (
                      <ChevronDownIcon
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    ) : null}
                  </button>
                  {isOpen
                    ? g.entities.map((e) => (
                        <a
                          key={e.cuid}
                          href={`#entity-${e.cuid}`}
                          className="flex w-full items-center rounded-sm py-1.5 pl-6 pr-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <span className="mr-2 text-xs">•</span>
                          <span className="truncate">{e.title}</span>
                        </a>
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
