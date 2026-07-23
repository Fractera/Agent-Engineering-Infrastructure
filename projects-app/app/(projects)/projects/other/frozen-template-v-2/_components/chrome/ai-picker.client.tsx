"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { chromeStrings } from "./i18n";
import { PROVIDERS, providerOf, type ProviderKey } from "../ai";

// ВЫБОР ПРОВАЙДЕРА И МОДЕЛИ — первая карточка настроек. Меню ПОКАЗЫВАЕТ выбранное, эта карточка его
// МЕНЯЕТ: одно объявление в ядре (`passport.ai`), два читателя, разойтись не могут.
//
// ПОЧЕМУ ВЫБОР ПИШЕТСЯ В ЯДРО, А НЕ В ОКРУЖЕНИЕ: ключ провайдера — секрет и общий на весь проект, а
// вот КАКОЙ моделью думает ЭТА автоматизация — её собственное свойство, как тип или жизненный цикл.
// Две автоматизации на одном ключе вправе работать разными моделями.
//
// СМЕНА ПРОВАЙДЕРА СБРАСЫВАЕТ МОДЕЛЬ на первую в его списке — модель принадлежит провайдеру, и
// сохранить `gpt-4o` при выбранном Anthropic значило бы записать в ядро заведомо нерабочую пару.
//
// КЛЮЧ ЗДЕСЬ НЕ ВВОДЯТ. Он идёт карточкой сервиса ниже — тем же механизмом, что у каналов; второго
// способа вводить секреты в продукте нет.
export default function AiPicker({
  provider,
  model,
  lang,
}: {
  provider: ProviderKey;
  model: string;
  lang: string;
}) {
  const L = chromeStrings(lang);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [choice, setChoice] = useState({ provider, model });

  async function save(next: { provider: ProviderKey; model: string }) {
    setChoice(next); // сначала показываем — ожидание записи не должно выглядеть как «не нажалось»
    setBusy(true);
    setFailed(false);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "passport" }, set: { ai: next } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      // МЯГКАЯ СИНХРОНИЗАЦИЯ, НЕ ПЕРЕЗАГРУЗКА: меню читает то же поле ядра — `router.refresh()`
      // перечитывает серверные данные, НЕ роняя страницу и НЕ закрывая окно настроек, поэтому владелец
      // может менять настройки подряд (правка владельца 2026-07-23: `location.reload()` вырубал форму).
      router.refresh();
      setBusy(false);
    } catch {
      setChoice({ provider, model }); // ядро не приняло — возвращаем то, что в нём осталось
      setFailed(true);
      setBusy(false);
    }
  }

  const current = providerOf(choice.provider);

  return (
    <section data-settings="ai" className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">{L.automationLabel}</p>

      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{L.aiProvider}</span>
        <select
          value={choice.provider}
          disabled={busy}
          onChange={(e) => {
            const next = providerOf(e.target.value);
            void save({ provider: next.key, model: next.models[0].id });
          }}
          className="h-8 rounded-md border bg-transparent px-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          {PROVIDERS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{L.aiModel}</span>
        <select
          value={choice.model}
          disabled={busy}
          onChange={(e) => void save({ provider: choice.provider, model: e.target.value })}
          className="h-8 rounded-md border bg-transparent px-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          {/* Модель, которой нет в каталоге, показывается как есть: подменять её молча — врать о том,
              чем автоматизация на самом деле думает. */}
          {current.models.some((m) => m.id === choice.model) ? null : (
            <option value={choice.model}>{choice.model}</option>
          )}
          {current.models.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </label>

      {failed ? <p className="text-xs text-rose-700 dark:text-rose-400">{L.aiSaveFailed}</p> : null}
      <p className="text-xs text-muted-foreground">{L.aiKeyHint}</p>
    </section>
  );
}
