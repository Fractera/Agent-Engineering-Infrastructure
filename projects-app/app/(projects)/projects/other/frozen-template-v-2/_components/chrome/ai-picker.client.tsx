"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chromeStrings } from "./i18n";
import { keysStrings } from "../shared/keys-i18n";
import { PROVIDERS, providerOf, type ProviderKey } from "../ai";
import { keysOf } from "../channels";
import KeysModal from "../shared/keys-modal.client";

// ВЫБОР ПРОВАЙДЕРА, МОДЕЛИ И КЛЮЧА — первая карточка настроек. Меню ПОКАЗЫВАЕТ выбранное, эта карточка
// его МЕНЯЕТ: одно объявление в ядре (`passport.ai`), два читателя, разойтись не могут.
//
// ТРИ ВЕЩИ В ОДНОЙ КАРТОЧКЕ, И ЭТО НАМЕРЕННО:
//   • ПРОВАЙДЕР — из двух неизменных (Anthropic · OpenAI);
//   • МОДЕЛЬ — ЖИВОЙ список от моста платформы (дверь `api/ai-models`), НЕ хардкод: хардкод устаревает
//     молча (правка владельца 2026-07-23). Мост отдаёт список без ключа;
//   • КЛЮЧ ВЫБРАННОГО ПРОВАЙДЕРА — его статус и ввод здесь же. Ключ провайдера — свойство ВЫБОРА, а не
//     узла, поэтому его карточка идёт за выбором: выбран OpenAI и ключ задан → зелёное «уже задан»;
//     выбран Anthropic без ключа → кнопка «Подключить» (правка владельца 2026-07-23). В списке сервисов
//     ключей провайдеров больше нет — иначе всплывала бы карточка невыбранного провайдера.
//
// СМЕНА ПРОВАЙДЕРА СБРАСЫВАЕТ МОДЕЛЬ на первую живую в его списке — модель принадлежит провайдеру, и
// сохранить пару чужого провайдера значило бы записать в ядро заведомо нерабочую комбинацию.
//
// МЯГКАЯ СИНХРОНИЗАЦИЯ: после записи `router.refresh()`, а не `location.reload()` — окно настроек не
// закрывается, владелец меняет настройки подряд (правка владельца 2026-07-23).
type ModelOption = { id: string; label: string };

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
  const K = keysStrings(lang);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [choice, setChoice] = useState({ provider, model });
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsError, setModelsError] = useState(false);
  const [present, setPresent] = useState<boolean | null>(null); // задан ли ключ ВЫБРАННОГО провайдера
  const [asking, setAsking] = useState(false);

  const current = providerOf(choice.provider);
  const apiBase = () => (typeof location !== "undefined" ? location.pathname.replace(/\/+$/, "") + "/api" : "/api");

  // ЖИВЫЕ МОДЕЛИ выбранного провайдера — из двери; список обновляется при смене провайдера.
  useEffect(() => {
    let alive = true;
    setModels([]);
    setModelsError(false);
    void (async () => {
      try {
        const r = await fetch(`${apiBase()}/ai-models?provider=${encodeURIComponent(choice.provider)}`, { cache: "no-store" });
        const d = (await r.json().catch(() => null)) as { models?: ModelOption[] } | null;
        if (!alive) return;
        if (d?.models?.length) setModels(d.models);
        else setModelsError(true); // мост молчит — покажем выбранную модель как есть + подсказку
      } catch {
        if (alive) setModelsError(true);
      }
    })();
    return () => { alive = false; };
  }, [choice.provider]);

  // СТАТУС КЛЮЧА выбранного провайдера — живая правда из двери `api/env` (присутствие, не значение).
  useEffect(() => {
    let alive = true;
    setPresent(null);
    void (async () => {
      try {
        const r = await fetch(`${apiBase()}/env?keys=${encodeURIComponent(current.envKey)}`, { cache: "no-store" });
        const d = (await r.json().catch(() => null)) as { present?: Record<string, boolean> } | null;
        if (alive) setPresent(Boolean(d?.present?.[current.envKey]));
      } catch {
        if (alive) setPresent(false);
      }
    })();
    return () => { alive = false; };
  }, [current.envKey]);

  async function save(next: { provider: ProviderKey; model: string }) {
    setChoice(next); // сначала показываем — ожидание записи не должно выглядеть как «не нажалось»
    setBusy(true);
    setFailed(false);
    try {
      const r = await fetch(`${apiBase()}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "passport" }, set: { ai: next } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      router.refresh(); // меню читает то же поле — мягко, без перезагрузки и закрытия окна
      setBusy(false);
    } catch {
      setChoice({ provider, model }); // ядро не приняло — возвращаем то, что в нём осталось
      setFailed(true);
      setBusy(false);
    }
  }

  const providerKey = keysOf([current.envKey]);
  const modelKnown = models.some((m) => m.id === choice.model);

  return (
    <section data-settings="ai" className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">{L.automationLabel}</p>

      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{L.aiProvider}</span>
        <select
          value={choice.provider}
          disabled={busy}
          onChange={(e) => {
            // смена провайдера: модель ставим временно на прежнюю, живой список подтянется эффектом и
            // первая его модель станет умолчанием ниже; сохраняем сразу выбранный провайдер.
            const nextProvider = providerOf(e.target.value).key;
            void save({ provider: nextProvider, model: choice.model });
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
          disabled={busy || models.length === 0}
          onChange={(e) => void save({ provider: choice.provider, model: e.target.value })}
          className="h-8 rounded-md border bg-transparent px-2 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        >
          {/* Выбранная модель, которой нет в живом списке, показывается как есть: подменять её молча —
              врать о том, чем автоматизация на самом деле думает. */}
          {modelKnown ? null : <option value={choice.model}>{choice.model}</option>}
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </label>
      {modelsError ? <p className="text-xs text-amber-600 dark:text-amber-400">{L.aiModelsUnavailable}</p> : null}

      {/* КЛЮЧ ВЫБРАННОГО ПРОВАЙДЕРА — статус и ввод здесь же, по выбору. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
        <span className="text-xs">
          <span className="text-muted-foreground">{current.label}</span>{" "}
          {present === null ? (
            <span className="text-muted-foreground">…</span>
          ) : present ? (
            <span className="text-emerald-600 dark:text-emerald-400">{K.alreadySet}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
        >
          {present ? K.change : K.connect.replace("{k}", current.label)}
        </button>
      </div>

      {failed ? <p className="text-xs text-rose-700 dark:text-rose-400">{L.aiSaveFailed}</p> : null}
      <p className="text-xs text-muted-foreground">{L.aiKeyHint}</p>

      <KeysModal
        open={asking}
        channelName={current.label}
        keys={providerKey}
        present={{ [current.envKey]: Boolean(present) }}
        lang={lang}
        onCancel={() => setAsking(false)}
        onSaved={() => { setPresent(true); setAsking(false); router.refresh(); }}
      />
    </section>
  );
}
