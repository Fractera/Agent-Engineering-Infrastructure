"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "../chrome/icons";
import { pick } from "./localized";
import { keysStrings } from "./keys-i18n";
import type { ChannelKey } from "../channels";

// ФОРМА КЛЮЧЕЙ — ОДИН примитив на весь продукт (шаг 293). Её открывают главное меню (при попытке
// включить канал) и календарь (при попытке отметить интеграцию); второй реализации ввода ключей в папке
// быть не должно — тот же закон, что у тоста, ящика и голосового ввода.
//
// ЗАКОН ОТМЕНЫ (требование владельца): закрыл, не заполнив, — НИЧЕГО не произошло. Переключатель,
// который её вызвал, обязан вернуться в исходное положение, и в ядро не уходит ни одной записи. Поэтому
// модалка не переключает канал сама: она лишь сообщает вызывающему `onSaved`, и решение остаётся за ним.
//
// ЗАПОЛНЕННЫЙ КЛЮЧ НЕ ПОКАЗЫВАЕТСЯ. Дверь `api/env` отдаёт только присутствие, поэтому у уже заданного
// ключа поле пустое с пометкой «уже задан»: пустым его оставляют, чтобы сохранить текущее значение.
// Это не неудобство, а отказ печатать секрет в HTML страницы.
//
// ПЕРЕЗАПУСК ОДИН РАЗ: все ключи уходят с `restart: false`, и только последний — с `restart: true`.
// Иначе процесс переехал бы посреди формы и убил запрос на следующий ключ (урок v1).
export default function KeysModal({
  open,
  channelName,
  keys,
  present,
  lang,
  onCancel,
  onSaved,
}: {
  open: boolean;
  /** Имя канала как его называет владелец — стоит в заголовке. */
  channelName: string;
  keys: ChannelKey[];
  /** Что уже задано: ключ → true. */
  present: Record<string, boolean>;
  lang: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const L = keysStrings(lang);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // НАТИВНОЕ СВЯЗЫВАНИЕ TELEGRAM (шаг 296): состояние одной кнопки «Связать мой Telegram». Опрос двери
  // `api/telegram/link` живёт здесь, в таймере; при закрытии формы он гасится, чтобы не течь фоном.
  const [link, setLink] = useState<{ status: "idle" | "opening" | "waiting" | "linked" | "failed"; who?: string }>({ status: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  useEffect(() => {
    if (open) {
      setValues({});
      setFailed(null);
      setLink({ status: "idle" });
    }
    return stopPoll; // закрытие формы (и размонтирование) гасит опрос
  }, [open]);

  const apiBase = () => (typeof location !== "undefined" ? location.pathname.replace(/\/+$/, "") + "/api" : "/api");

  async function startLink(envKey: string) {
    stopPoll();
    setLink({ status: "opening" });
    try {
      const r = await fetch(`${apiBase()}/telegram/link?action=start`);
      const info = (await r.json().catch(() => null)) as { code?: string; deepLink?: string } | null;
      if (!r.ok || !info?.code || !info.deepLink) throw new Error("start");
      window.open(info.deepLink, "_blank", "noopener");
      setLink({ status: "waiting" });
      const startedAt = Date.now();
      pollRef.current = setInterval(async () => {
        // Пятиминутный потолок: пользователь мог передумать — не крутить опрос вечно.
        if (Date.now() - startedAt > 5 * 60_000) { stopPoll(); setLink({ status: "failed" }); return; }
        try {
          const p = await fetch(`${apiBase()}/telegram/link?action=poll&code=${encodeURIComponent(info.code!)}`);
          const s = (await p.json().catch(() => null)) as { status?: string; chatId?: string; who?: string } | null;
          if (s?.status === "linked" && s.chatId) {
            stopPoll();
            setValues((v) => ({ ...v, [envKey]: s.chatId! })); // подставляем в поле; запишет «Сохранить»
            setLink({ status: "linked", who: s.who });
          } else if (s?.status === "expired") {
            stopPoll();
            setLink({ status: "failed" });
          }
        } catch { /* сеть моргнула — следующий тик повторит */ }
      }, 2000);
    } catch {
      setLink({ status: "failed" });
    }
  }

  if (!open) return null;

  // Готовность: у каждого обязательного ключа либо уже есть значение, либо владелец ввёл его сейчас.
  const ready = keys.every((k) => k.optional || present[k.env] || (values[k.env] ?? "").trim().length > 0);

  async function save() {
    setBusy(true);
    setFailed(null);
    // Пишем только то, что владелец действительно ввёл: пустое поле у заданного ключа означает
    // «оставить как есть», а не «стереть».
    const toWrite = keys.map((k) => [k.env, (values[k.env] ?? "").trim()] as const).filter(([, v]) => v.length > 0);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      for (let i = 0; i < toWrite.length; i++) {
        const [key, value] = toWrite[i];
        const r = await fetch(`${apiBase}/env`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key, value, restart: i === toWrite.length - 1 }),
        });
        if (!r.ok) {
          const info = (await r.json().catch(() => null)) as { error?: string } | null;
          throw new Error(info?.error ?? String(r.status));
        }
      }
      onSaved();
    } catch (e) {
      setFailed(e instanceof Error ? e.message : L.failed);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium">{L.connect.replace("{k}", channelName)}</h3>
          <button type="button" onClick={onCancel} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <CloseIcon className="size-4" />
          </button>
        </div>

        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">{L.noKeys}</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">{L.intro}</p>
            <div className="space-y-3">
              {keys.map((k) => (
                <label key={k.env} className="block space-y-1">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium">{pick(k.label, lang) || k.env}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{k.env}</span>
                    {k.optional ? <span className="text-[10px] text-muted-foreground">({L.optional})</span> : null}
                    {present[k.env] ? <span className="text-[10px] text-emerald-600 dark:text-emerald-400">({L.alreadySet})</span> : null}
                  </span>
                  <input
                    type={k.secret ? "password" : "text"}
                    autoComplete="off"
                    value={values[k.env] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [k.env]: e.target.value }))}
                    className="h-8 w-full rounded-md border bg-transparent px-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  {/* ГДЕ ВЗЯТЬ — из каталога, а не из разметки: новый сервис не требует правки формы. */}
                  <span className="block text-xs text-muted-foreground">{pick(k.help, lang)}</span>
                  {/* ОРАНЖЕВОЕ ПРЕДУПРЕЖДЕНИЕ — когда сам ввод ключа имеет неочевидную цену (ключ Anthropic
                      = поштучный API вместо подписки, «неожиданно дорого»). Текст — из каталога, ×10. */}
                  {k.warning ? <span className="block text-xs font-medium text-orange-600 dark:text-orange-400">{pick(k.warning, lang)}</span> : null}
                  {present[k.env] ? <span className="block text-[10px] text-muted-foreground">{L.keepValue}</span> : null}
                  {/* НАТИВНОЕ ОПРЕДЕЛЕНИЕ ЗНАЧЕНИЯ (шаг 296): кнопка узнаёт chat id сама, число подставляется
                      в поле выше; записывает его обычное «Сохранить». */}
                  {k.autoLink === "telegram" ? (
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={link.status === "opening" || link.status === "waiting"}
                        onClick={() => void startLink(k.env)}
                        className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                      >
                        {L.linkBtn}
                      </button>
                      {link.status === "opening" ? <span className="text-[10px] text-muted-foreground">{L.linkOpening}</span> : null}
                      {link.status === "waiting" ? <span className="text-[10px] text-amber-600 dark:text-amber-400">{L.linkWaiting}</span> : null}
                      {link.status === "linked" ? <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{L.linkDone.replace("{k}", link.who ?? "")}</span> : null}
                      {link.status === "failed" ? <span className="text-[10px] text-rose-700 dark:text-rose-400">{L.linkFailed}</span> : null}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </>
        )}

        {failed ? <p className="mt-3 text-sm text-rose-700 dark:text-rose-400">{failed}</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => void save()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? L.saving : L.save}
          </button>
          <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            {L.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
