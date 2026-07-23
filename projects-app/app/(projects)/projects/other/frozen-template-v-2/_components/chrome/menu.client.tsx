"use client";

import { useState } from "react";
import { chromeStrings } from "./i18n";
import { HamburgerIcon, SparkleIcon, GripVerticalIcon, PencilIcon, CopyIcon, TrashIcon } from "./icons";
import Switch from "./switch.client";
import Toast from "../shared/toast.client";
import HowItWorksModal from "./how-it-works-modal.client";
import PlaceholderModal from "./placeholder-modal.client";
import ChannelsSection, { type ChannelRow } from "./channels-section.client";

// ГАМБУРГЕР-МЕНЮ (админ) — ФАКСИМИЛЕ меню v1 (automation-menu.client.tsx), воспроизведённое самодостаточно
// (закон 0: без shadcn/lucide/_shared). Порядок, метки, иконки и разделители — один-в-один с образцом.
// Единственное ДОБАВЛЕНИЕ — пункт «Публичная страница» (требование владельца).
//
// Записи, чей бэкенд v1 в v2 ещё не построен (Настройки · Тесты · Переименовать · Клонировать · Удалить),
// выглядят как в v1, но открывают честную заглушку. Работают уже сейчас: «Как это работает», переключатели
// видимости (пишут tab.presence в ядро через api/patch) и перетаскивание строк (порядок — будущий op).
type TabRow = { name: string; presence: "absent" | "collapsed" | "expanded"; entities?: { cuid: string; title: string }[] };
type Modal = null | "howItWorks" | { title: string };

const item = "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent";
const sep = <div className="my-1 h-px bg-border" />;

export default function Menu({
  lang,
  tabs,
  channels,
  publicHref,
  built,
}: {
  lang: string;
  /** Каналы автоматизации — второй список меню; включение канала гейтится ключами (шаг 293). */
  channels: ChannelRow[];
  tabs: TabRow[];
  publicHref: string;
  /** Построена ли автоматизация: замороженному шаблону публичной страницы ещё нет. */
  built: boolean;
}) {
  const L = chromeStrings(lang);
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
    setBusy(name);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "tab", name }, set: { presence: next } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      // the server re-renders from the changed core — reload so the page below and the menu agree
      location.reload();
    } catch {
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
      <details data-chrome="menu" className="relative">
        <summary className="flex cursor-pointer list-none items-center rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={L.menuAria}>
          <HamburgerIcon className="size-4" />
        </summary>

        <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border bg-background p-1 text-sm shadow-md">
          {/* How it works — top, font-medium, Sparkles (v1) */}
          <button type="button" className={`${item} font-medium`} onClick={() => setModal("howItWorks")}>
            <SparkleIcon className="size-4" />
            {L.howItWorks}
          </button>

          {/* NEW (the one addition): Public page — ОТКРЫВАЕТСЯ ОТДЕЛЬНЫМ ОКНОМ (кокпит владельца при
              этом не теряется), но ТОЛЬКО если автоматизация построена. Замороженный шаблон публичной
              страницы не имеет: вместо перехода в никуда — тост с тем, что нужно сделать. */}
          {built ? (
            <a href={publicHref} target="_blank" rel="noopener noreferrer" className={item}>
              {L.publicPage}
            </a>
          ) : (
            <button type="button" className={item} onClick={() => setNotBuilt(true)}>
              {L.publicPage}
            </button>
          )}

          {sep}
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{L.automationLabel}</div>
          <div className="flex items-center justify-between gap-4 px-2 py-1.5">
            <span className="text-muted-foreground">{L.aiProvider}</span>
            <span className="font-medium">OpenAI API</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-2 py-1.5">
            <span className="text-muted-foreground">{L.aiModel}</span>
            <span className="font-medium text-muted-foreground">—</span>
          </div>

          {sep}
          <button type="button" className={item} onClick={() => setModal({ title: L.settingsItem })}>{L.settingsItem}</button>

          {sep}
          <div className="px-2 py-1.5 text-xs font-normal text-muted-foreground">{L.entitiesHeading}</div>
          {/* Sortable rows: grip (left) + label + visibility switch — v1 design; here the switch writes
              tab.presence to the core, the grip reorders locally (future persist). */}
          {rows.map((tab, i) => {
            const isVisible = tab.presence !== "absent";
            const reorder = L.reorderAria.replace("{name}", tab.name);
            return (
              <div
                key={tab.name}
                onDragOver={(e) => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }}
                onDrop={(e) => { e.preventDefault(); drop(i); }}
                className={`flex items-center gap-2 rounded-sm px-2 py-1.5 ${overIndex === i && dragIndex !== null && dragIndex !== i ? "bg-accent" : ""} ${dragIndex === i ? "opacity-50" : ""}`}
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
                <Switch checked={isVisible} disabled={busy === tab.name} ariaLabel={tab.name} onCheckedChange={() => toggleVisibility(tab.name, tab.presence)} />
              </div>
            );
          })}

          {sep}
          <ChannelsSection channels={channels} lang={lang} />

          {sep}
          <button type="button" className={item} onClick={() => setModal({ title: L.testsItem })}>{L.testsItem}</button>

          {sep}
          <div className="px-2 py-1.5 text-xs font-normal text-rose-600 dark:text-rose-400">{L.dangerZone}</div>
          <button type="button" className={item} onClick={() => setModal({ title: L.renameAutomation })}>
            <PencilIcon className="size-4" /> {L.renameAutomation}
          </button>
          <button type="button" className={item} onClick={() => setModal({ title: L.cloneAutomation })}>
            <CopyIcon className="size-4" /> {L.cloneAutomation}
          </button>
          <button type="button" className={`${item} text-rose-600 dark:text-rose-400`} onClick={() => setModal({ title: L.deleteAutomation })}>
            <TrashIcon className="size-4" /> {L.deleteAutomation}
          </button>
        </div>
      </details>

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
      <PlaceholderModal
        lang={lang}
        title={modal && modal !== "howItWorks" ? modal.title : ""}
        open={Boolean(modal && modal !== "howItWorks")}
        onClose={() => setModal(null)}
      />
    </>
  );
}
