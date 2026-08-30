"use client";

// ЗНАЧЕНИЯ СЛУЖБ: МАСКА, ГЛАЗИК, КОПИРОВАНИЕ (шаг 47, 2026-08-30).
//
// 🔒 ЗАЧЕМ ОСТРОВОК, А НЕ СЕРВЕРНАЯ РАЗМЕТКА. Значение не должно лежать в HTML
// страницы: разметка попадает в историю браузера и в предпросмотр вкладки, а
// нажатие — никуда. Поэтому сервер печатает только маску, а настоящее значение
// приезжает по нажатию, отдельным запросом к `api/config/env-reveal`.
//
// 🔒 ОСТРОВКУ ОТДАЮТСЯ ТОЛЬКО ЕГО СЛОВА, ПЕРЕЧИСЛЕННЫЕ ПОИМЁННО. Тип не сужает
// рантайм: по проводу уезжает всё переданное, даже неотрисованное. Поэтому сюда
// приходят четыре строки подписи, а не словарь раздела.
//
// 🔒 ПОКАЗАННОЕ ПРЯЧЕТСЯ ОБРАТНО ПО ВТОРОМУ НАЖАТИЮ и не остаётся в памяти
// вкладки дольше нужного: человек сверил и закрыл. Автоматически по таймеру не
// прячем — владелец сверяет глазами, и исчезнувшее из-под курсора значение он
// прочитает как сбой.

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export type ServiceSecretRow = {
  name: "telegramToken" | "telegramBot" | "telegramChatId" | "openaiKey";
  label: string;
  shown: string;
  empty: boolean;
  secret: boolean;
};

export function ServiceSecrets({
  rows,
  words,
}: {
  rows: ServiceSecretRow[];
  words: { notSet: string; show: string; hide: string; copy: string; copied: string; failed: string };
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState<string | null>(null);

  async function toggle(name: string) {
    if (values[name] !== undefined) {
      setValues(v => {
        const next = { ...v };
        delete next[name];
        return next;
      });
      return;
    }
    setBusy(name);
    try {
      const r = await fetch("/api/config/env-reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(String(d?.error ?? r.status));
        return;
      }
      setValues(v => ({ ...v, [name]: String(d?.value ?? "") }));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function copy(name: string, fallback: string) {
    // Копируем НАСТОЯЩЕЕ значение, а не то, что на экране: человек может нажать
    // копирование, не открыв глазик, и получить в буфере точки — это худший из
    // возможных исходов, потому что ошибка обнаружится в чужом поле ввода.
    let value = values[name];
    if (value === undefined) {
      try {
        const r = await fetch("/api/config/env-reveal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const d = await r.json().catch(() => ({}));
        value = r.ok ? String(d?.value ?? "") : "";
      } catch {
        value = "";
      }
    }
    if (!value) {
      toast.error(fallback);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setJustCopied(name);
      setTimeout(() => setJustCopied(null), 1500);
      toast.success(words.copied);
    } catch {
      toast.error(words.failed);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(row => {
        const open = values[row.name] !== undefined;
        const text = row.empty ? words.notSet : open ? values[row.name] : row.shown;
        return (
          <div
            key={row.name}
            className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
          >
            <span className="w-40 shrink-0 text-xs font-medium text-muted-foreground">{row.label}</span>
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{text}</code>
            {row.secret && !row.empty && (
              <button
                type="button"
                onClick={() => toggle(row.name)}
                disabled={busy === row.name}
                aria-label={open ? words.hide : words.show}
                title={open ? words.hide : words.show}
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {open ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
            {!row.empty && (
              <button
                type="button"
                onClick={() => copy(row.name, words.notSet)}
                aria-label={words.copy}
                title={words.copy}
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                {justCopied === row.name ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
