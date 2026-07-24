"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { chromeStrings } from "./i18n";
import { Menu as HamburgerIcon, Sparkles as SparkleIcon, GripVertical as GripVerticalIcon, Pencil as PencilIcon, Copy as CopyIcon, Trash2 as TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Toast from "../shared/toast.client";
import HowItWorksModal from "./how-it-works-modal.client";
import PlaceholderModal from "./placeholder-modal.client";
import SettingsModal from "./settings-modal.client";
import type { ProviderKey } from "../ai";

// ГАМБУРГЕР-МЕНЮ (админ) — ФАКСИМИЛЕ меню v1 (automation-menu.client.tsx), воспроизведённое самодостаточно
// Порядок, метки, иконки и разделители — один-в-один с образцом v1.
// Единственное ДОБАВЛЕНИЕ — пункт «Публичная страница» (требование владельца).
//
// 🔒 НА shadcn (шаг 298, правило владельца: самописные UI-элементы во v2 запрещены). Прежняя реализация
// была самодельной раскрывашкой `<details>/<summary>` с десятком сырых `<button>` — теперь это
// `DropdownMenu` (Item/Label/Separator), иконки из `lucide`, тумблеры — shadcn `Switch`. Строки-
// переключатели НЕ закрывают меню (`onSelect` → `preventDefault`): владелец включает разделы подряд, и
// захлопывать список после каждого клика — терять его работу.
//
// Записи, чей бэкенд v1 в v2 ещё не построен (Тесты · Переименовать · Клонировать · Удалить), выглядят как
// в v1, но открывают честную заглушку. Работают уже сейчас: «Как это работает», Настройки, переключатели
// видимости (пишут tab.presence в ядро через api/patch) и перетаскивание строк (порядок — будущий op).
type TabRow = { name: string; presence: "absent" | "collapsed" | "expanded"; entities?: { cuid: string; title: string }[] };
type Modal = null | "howItWorks" | "settings" | { title: string };

export default function Menu({
  lang,
  tabs,
  envKeys,
  ai,
  publicHref,
  built,
}: {
  lang: string;
  /** Имена переменных, объявленные автоматизацией: из них выводятся карточки настроек. */
  envKeys: string[];
  /** Выбранные провайдер и модель — ПОКАЗЫВАЮТСЯ здесь, меняются в Настройках. */
  ai: { provider: ProviderKey; model: string; providerLabel: string; modelLabel: string };
  tabs: TabRow[];
  publicHref: string;
  /** Построена ли автоматизация: замороженному шаблону публичной страницы ещё нет. */
  built: boolean;
}) {
  const L = chromeStrings(lang);
  const router = useRouter();
  const [rows, setRows] = useState<TabRow[]>(tabs);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [notBuilt, setNotBuilt] = useState(false);

  async function toggleVisibility(name: string, presence: TabRow["presence"]) {
    // OFF → absent (скрыта); ON → collapsed (видна, закрыта по умолчанию). Раскрытие (expanded) —
    // отдельное состояние поля presence, а не результат этого переключателя.
    const next = presence === "absent" ? "collapsed" : "absent";
    const prev = rows;
    setBusy(name);
    setRows((rs) => rs.map((r) => (r.name === name ? { ...r, presence: next } : r))); // оптимистично — свитч встаёт сразу
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "tab", name }, set: { presence: next } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      // МЯГКАЯ СИНХРОНИЗАЦИЯ, НЕ ПЕРЕЗАГРУЗКА: раздел ниже — серверный, `router.refresh()` перечитывает его
      // без падения страницы, свитч уже стоит оптимистично, меню не закрывается (правка владельца 2026-07-23).
      router.refresh();
      setBusy(null);
    } catch {
      setRows(prev); // ядро не приняло — возвращаем прежнее состояние свитчей
      setBusy(null);
    }
  }

  // LOCAL-ONLY reorder (not persisted this iteration) — the drag affordance for the future `reorder` op.
  function drop(target: number) {
    if (dragIndex === null || dragIndex === target) { setDragIndex(null); setOverIndex(null); return; }
    setRows((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={L.menuAria} data-chrome="menu">
            <HamburgerIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        {/* ВЫСОТА МЕНЮ ОГРАНИЧЕНА 500px, ПРОКРУТКА ВНУТРИ (требование владельца): разделов и записей
            прибавляется, и список не имеет права уходить за нижний край экрана — иначе нижние пункты
            становятся недостижимыми, а на коротком экране пропадает и «Опасная зона». */}
        <DropdownMenuContent align="end" className="max-h-[500px] w-72 overflow-y-auto">
          {/* How it works — top, font-medium, Sparkles (v1) */}
          <DropdownMenuItem className="font-medium" onSelect={() => setModal("howItWorks")}>
            <SparkleIcon className="size-4" />
            {L.howItWorks}
          </DropdownMenuItem>

          {/* NEW (the one addition): Public page — ОТКРЫВАЕТСЯ ОТДЕЛЬНЫМ ОКНОМ (кокпит владельца при
              этом не теряется), но ТОЛЬКО если автоматизация построена. Замороженный шаблон публичной
              страницы не имеет: вместо перехода в никуда — тост с тем, что нужно сделать. */}
          {built ? (
            <DropdownMenuItem asChild>
              <a href={publicHref} target="_blank" rel="noopener noreferrer">{L.publicPage}</a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setNotBuilt(true)}>{L.publicPage}</DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">{L.automationLabel}</DropdownMenuLabel>
          {/* Выбор ИИ — не пункт меню, а ФАКТ о автоматизации: здесь его показывают, меняют в Настройках. */}
          <div className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
            <span className="text-muted-foreground">{L.aiProvider}</span>
            <span className="font-medium">{ai.providerLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
            <span className="text-muted-foreground">{L.aiModel}</span>
            <span className="font-medium">{ai.modelLabel}</span>
          </div>

          <DropdownMenuSeparator />
          {/* НАСТРОЙКИ — своё окно, а не заглушка и не список внутри меню: там живут каналы и всё,
              что настраивают. Меню — навигация; настройка канала — работа, и внутри выпадающего
              списка она растит его до края экрана и захлопывается от случайного клика мимо. */}
          <DropdownMenuItem onSelect={() => setModal("settings")}>{L.settingsItem}</DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{L.entitiesHeading}</DropdownMenuLabel>
          {/* Sortable rows: grip (left) + label + visibility switch — v1 design; here the switch writes
              tab.presence to the core, the grip reorders locally (future persist). Пункт НЕ закрывает меню. */}
          {rows.map((tab, i) => {
            const isVisible = tab.presence !== "absent";
            const reorder = L.reorderAria.replace("{name}", tab.name);
            return (
              <DropdownMenuItem
                key={tab.name}
                onSelect={(e) => e.preventDefault()}
                onDragOver={(e) => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }}
                onDrop={(e) => { e.preventDefault(); drop(i); }}
                className={`gap-2 ${overIndex === i && dragIndex !== null && dragIndex !== i ? "bg-accent" : ""} ${dragIndex === i ? "opacity-50" : ""}`}
              >
                <span
                  draggable
                  onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  className="cursor-grab text-muted-foreground active:cursor-grabbing"
                  aria-label={reorder}
                  title={reorder}
                >
                  <GripVerticalIcon className="size-4" />
                </span>
                <span className="flex-1 truncate capitalize">{tab.name}</span>
                <Switch checked={isVisible} disabled={busy === tab.name} aria-label={tab.name} onCheckedChange={() => toggleVisibility(tab.name, tab.presence)} />
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setModal({ title: L.testsItem })}>{L.testsItem}</DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-rose-600 dark:text-rose-400">{L.dangerZone}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setModal({ title: L.renameAutomation })}>
            <PencilIcon className="size-4" /> {L.renameAutomation}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setModal({ title: L.cloneAutomation })}>
            <CopyIcon className="size-4" /> {L.cloneAutomation}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setModal({ title: L.deleteAutomation })}>
            <TrashIcon className="size-4" /> {L.deleteAutomation}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Отказ владельцу, а не тупик: объясняем, ПОЧЕМУ ссылки ещё нет и что даст её появление.
          Текст пока только английский — решение владельца на этот шаг. */}
      {notBuilt ? (
        <Toast
          tone="fail"
          text="This automation is still a frozen template. Build it first — once it runs, its public page becomes available and this link will open it."
          onClose={() => setNotBuilt(false)}
        />
      ) : null}

      <HowItWorksModal lang={lang} open={modal === "howItWorks"} onClose={() => setModal(null)} />
      <SettingsModal lang={lang} envKeys={envKeys} ai={ai} open={modal === "settings"} onClose={() => setModal(null)} />
      {/* Заглушка достаётся ТОЛЬКО записям без своего окна: у «Как это работает» и «Настроек» окна свои,
          и различает их не строка заголовка, а сам вид состояния — поэтому проверяем тип, а не текст. */}
      <PlaceholderModal
        lang={lang}
        title={typeof modal === "object" && modal !== null ? modal.title : ""}
        open={typeof modal === "object" && modal !== null}
        onClose={() => setModal(null)}
      />
    </>
  );
}
