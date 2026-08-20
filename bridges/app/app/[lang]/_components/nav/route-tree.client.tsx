"use client";

import { useState } from "react";
import { ChevronRight, Plus, Check, FileText, Folder } from "lucide-react";
import type { RouteNode } from "@/lib/nav-editor/types";
import { DND_ROUTE } from "./dnd";

// Дерево публичных маршрутов — карта сайта, по которой собирают меню.
//
// 🔒 СВОЙ КОМПОНЕНТ, А НЕ БИБЛИОТЕКА. Всё поведение дерева здесь — одно
// состояние «какие узлы раскрыты». Зависимость ради этого пришлось бы обновлять
// годами, а весит она больше, чем весь раздел.
//
// 🔒 ПОКАЗЫВАЕТСЯ ТОЛЬКО АРХИТЕКТУРА МАРШРУТОВ (требование владельца
// 2026-08-12): ни файлов, ни функций, ни служебных папок. Человек выбирает
// СТРАНИЦЫ, и всё, что не страница, — шум, мешающий их найти.
//
// Узел без своей страницы — папка: раскрывается, но добавить его нельзя. Пункт
// меню, ведущий в никуда, — обещание, которого интерфейс не сдержит.

export function RouteTree(
  { nodes, used, onAdd, labels, depth = 0 }:
  {
    nodes: RouteNode[];
    /** Адреса, уже стоящие в меню, — чтобы не добавить один и тот же дважды. */
    used: Set<string>;
    onAdd: (href: string, title: string) => void;
    labels: { add: string; already: string; folderOnly: string };
    depth?: number;
  },
) {
  return (
    <ul className={depth === 0 ? "space-y-0.5" : "space-y-0.5 ml-3 border-l border-border pl-2"}>
      {nodes.map((n) => (
        <TreeRow key={`${n.segment}-${n.href ?? "dir"}`} node={n} used={used} onAdd={onAdd} labels={labels} depth={depth} />
      ))}
    </ul>
  );
}

function TreeRow(
  { node, used, onAdd, labels, depth }:
  {
    node: RouteNode;
    used: Set<string>;
    onAdd: (href: string, title: string) => void;
    labels: { add: string; already: string; folderOnly: string };
    depth: number;
  },
) {
  // Первый уровень раскрыт сразу: закрытое дерево на входе прячет ровно ту
  // карту, ради которой человек сюда пришёл.
  const [open, setOpen] = useState(depth === 0);
  /** Эту строку сейчас тащат — она обязана оставаться заметной всю дорогу. */
  const [dragging, setDragging] = useState(false);
  const hasChildren = node.children.length > 0;
  const added = node.href !== null && used.has(node.href);

  // 🔒 ТАЩИТЬ МОЖНО ТОЛЬКО НАСТОЯЩУЮ И ЕЩЁ НЕ ДОБАВЛЕННУЮ СТРАНИЦУ (шаг 525).
  // Папка без своей страницы адреса не имеет — пункт меню из неё вёл бы в никуда.
  // Уже добавленная не тащится, потому что дважды одна страница в меню не стоит:
  // иначе человек перетащил бы её второй раз и увидел бы, что ничего не
  // произошло, — молчаливый отказ вместо запрета.
  const canDrag = node.href !== null && !added;

  return (
    <li>
      <div
        draggable={canDrag}
        onDragStart={(e) => {
          if (!canDrag) return;
          e.dataTransfer.setData(DND_ROUTE, JSON.stringify({ href: node.href, title: node.title }));
          // Копирование, а не перемещение: страница остаётся в списке доступных
          // и после добавления — она никуда из проекта не делась.
          e.dataTransfer.effectAllowed = "copy";
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
        // 🔒 ЗАХВАЧЕННАЯ СТРОКА ВИДНА ОДНОЗНАЧНО (владелец, шаг 526). Наведение
        // давало лишь чуть более серый фон, и на белом это неотличимо от
        // ничего: человек не понимал, взял он страницу или промахнулся. Теперь
        // при наведении строка получает рамку и ручку захвата, а во время
        // перетаскивания — полный цвет, чтобы взгляд не терял её на пути.
        className={`group flex items-center gap-1 rounded border px-1 py-0.5 transition-all ${
          dragging
            ? "border-primary bg-primary/20 opacity-60"
            : canDrag
              ? "cursor-grab border-transparent hover:border-primary/60 hover:bg-primary/10 active:cursor-grabbing"
              : "border-transparent hover:bg-muted/60"
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-expanded={open}
          >
            <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {node.href ? (
          <FileText className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="size-3 shrink-0 text-muted-foreground" />
        )}

        <span className="min-w-0 flex-1 truncate text-[11px] text-foreground" title={node.href ?? labels.folderOnly}>
          {node.title}
        </span>

        {node.href && (
          <span className="hidden font-mono text-[9px] text-muted-foreground sm:inline truncate max-w-[38%]">
            {node.href}
          </span>
        )}

        {/* Кнопка есть только у настоящей страницы. Уже добавленная показывает
            галочку, а не исчезает: пропавший элемент читается как сбой. */}
        {node.href && (
          added ? (
            <Check className="size-3.5 shrink-0 text-emerald-500" aria-label={labels.already} />
          ) : (
            <button
              type="button"
              title={labels.add}
              onClick={() => onAdd(node.href!, node.title)}
              className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-primary hover:text-primary-foreground group-hover:opacity-100 focus:opacity-100"
            >
              <Plus className="size-3.5" />
            </button>
          )
        )}
      </div>

      {hasChildren && open && (
        <RouteTree nodes={node.children} used={used} onAdd={onAdd} labels={labels} depth={depth + 1} />
      )}
    </li>
  );
}
