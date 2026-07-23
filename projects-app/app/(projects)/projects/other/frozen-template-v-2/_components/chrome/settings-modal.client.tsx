"use client";

import { useEffect, useState } from "react";
import { chromeStrings } from "./i18n";
import { CloseIcon } from "./icons";
import KeysModal from "../shared/keys-modal.client";
import { keysStrings } from "../shared/keys-i18n";
import { pick } from "../shared/localized";
import { servicesOf, type Service } from "../channels";
import AiPicker from "./ai-picker.client";
import type { ProviderKey } from "../ai";

// НАСТРОЙКИ — здесь настраивают СЕРВИСЫ, и больше ничего.
//
// ЧТО СЮДА НЕ ПОПАДАЕТ И ПОЧЕМУ (правка владельца 2026-07-23). Сначала я положил сюда список всех
// каналов автоматизации с переключателями — восемнадцать строк. Это было неправильно по двум причинам:
//   • ключи ОБЩИЕ НА ПРОЕКТ, поэтому шесть каналов, делящих один токен бота, — это ОДНА настройка,
//     а не шесть строк;
//   • двенадцати каналам ключи не нужны вовсе, и настраивать в них нечего: включают канал на холсте.
// Перегруженный экран с записями для неиспользуемых узлов мешает работе, а не помогает. Понадобится
// ключ карте — карта его объявит, и карточка появится здесь сама: список ВЫВОДИТСЯ из ядра.
//
// ЗАКОН «СНАЧАЛА КЛЮЧИ, ПОТОМ КАНАЛ» ОТСЮДА НЕ ПРОПАЛ — он переехал в ДВЕРЬ (`api/patch`,
// `op: "visibility"`): раскрыть узел с незаданными обязательными ключами она отказывается. Так закон
// действует для любого способа — холста, меню, агента, — а не для одного экрана.
//
// ВЫСОТА 560px, ПРОКРУТКА ВНУТРИ, шапка не уезжает — столько же у самого меню.
export default function SettingsModal({
  lang,
  envKeys,
  ai,
  open,
  onClose,
}: {
  lang: string;
  /** Все имена переменных, объявленные этой автоматизацией. Карточки выводятся из них. */
  envKeys: string[];
  /** Выбранные провайдер и модель — из паспорта; меню показывает их, эта форма меняет. */
  ai: { provider: ProviderKey; model: string };
  open: boolean;
  onClose: () => void;
}) {
  const L = chromeStrings(lang);
  const K = keysStrings(lang);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [asking, setAsking] = useState<Service | null>(null);
  const services = servicesOf(envKeys);

  useEffect(() => {
    if (!open || envKeys.length === 0) return;
    let alive = true;
    void (async () => {
      try {
        const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
        const r = await fetch(`${apiBase}/env?keys=${encodeURIComponent(envKeys.join(","))}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { present: Record<string, boolean> };
        if (alive) setPresent(d.present ?? {});
      } catch {
        /* не смогли спросить — считаем незаданными: безопасная сторона ошибки */
      }
    })();
    return () => { alive = false; };
  }, [open, envKeys.join(",")]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-label={L.settingsItem}
          onClick={(e) => e.stopPropagation()}
          className="flex w-full max-w-[520px] flex-col rounded-lg border bg-background shadow-xl"
          style={{ maxHeight: 560 }}
        >
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">{L.settingsItem}</span>
            <button type="button" onClick={onClose} aria-label={L.cancel} className="text-muted-foreground hover:text-foreground">
              <CloseIcon className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {/* ЧЕМ АВТОМАТИЗАЦИЯ ДУМАЕТ — первым: это её собственное свойство, а карточки ниже
                настраивают внешние сервисы, общие на весь проект. */}
            <AiPicker provider={ai.provider} model={ai.model} lang={lang} />

            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">{K.noKeys}</p>
            ) : (
              services.map((service) => {
                const missing = service.keys.filter((k) => !k.optional && !present[k.env]);
                return (
                  <section key={service.key} data-service={service.key} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">{pick(service.label, lang) || service.key}</span>
                      <button
                        type="button"
                        onClick={() => setAsking(service)}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                      >
                        {missing.length ? K.connect.replace("{k}", pick(service.label, lang) || service.key) : K.change}
                      </button>
                    </div>
                    {/* Состояние КАЖДОГО ключа, а не одна общая галочка: у сервиса их несколько, и
                        владелец должен видеть, какого именно не хватает. Значение не показываем никогда. */}
                    <ul className="space-y-1">
                      {service.keys.map((k) => (
                        <li key={k.env} className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate">
                            {pick(k.label, lang) || k.env}
                            {k.optional ? <span className="ml-1 text-muted-foreground">({K.optional})</span> : null}
                          </span>
                          <span className={present[k.env] ? "shrink-0 text-emerald-600 dark:text-emerald-400" : "shrink-0 text-muted-foreground"}>
                            {present[k.env] ? K.alreadySet : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>

      <KeysModal
        open={Boolean(asking)}
        channelName={asking ? pick(asking.label, lang) || asking.key : ""}
        keys={asking?.keys ?? []}
        present={present}
        lang={lang}
        onCancel={() => setAsking(null)}
        onSaved={() => {
          const service = asking!;
          setPresent((p) => ({ ...p, ...Object.fromEntries(service.keys.map((k) => [k.env, true])) }));
          setAsking(null);
        }}
      />
    </>
  );
}
