"use client";

// ДВЕ СУЩНОСТИ ВЫДАЧИ — 13-я и 14-я в анатомии шага (28-28, 2026-08-28).
//
// Владелец назвал обе: «кнопка скопировать переменное окружение… не должна быть
// огромной, как нижняя, может занимать небольшой объём, но всё же выглядеть как
// кнопка и привлекать к себе внимание небольшой анимированной пульсацией» и
// «в другой области сразу покажи контейнер для копирования текста».
//
// 🔒 ПОЧЕМУ ЭТО ДВА РАЗНЫХ ЭЛЕМЕНТА, А НЕ ОДИН С ФЛАГОМ. Они отвечают на разные
// вопросы. Кнопка ЗАБИРАЕТ то, чего человек не видит и увидеть не должен: в
// файле окружения лежит приватный ключ доступа к серверу, и показывать его на
// экране незачем. Блок ПОКАЗЫВАЕТ текст, который человек обязан прочитать
// прежде, чем отдать агенту, — подсказку. Слить их значило бы либо спрятать то,
// что надо прочесть, либо вывести на экран ключ.
//
// 🔒 ПУЛЬСАЦИЯ ГАСНЕТ ПОСЛЕ ПЕРВОГО НАЖАТИЯ, КНОПКА ОСТАЁТСЯ РАБОЧЕЙ. Решение
// владельца: «после первого нажатия она становится полупрозрачной, но всё ещё
// кликабельной». Пульсация — это вопрос «вы меня заметили?»; после нажатия
// ответ получен, и продолжать спрашивать значит мешать. Погасить саму кнопку
// нельзя: файл теряют, окно закрывают, второй раз нужен всегда.
//
// 🔒 СОСТОЯНИЕ «НАЖИМАЛИ» ЖИВЁТ ТОЛЬКО ВО ВКЛАДКЕ И НИЧЕГО НЕ ОБЕЩАЕТ. Оно
// косметическое: перезагрузка вернёт пульсацию, и это честно — панель не знает,
// лежит ли файл у человека на диске. Записывать его как факт прохождения шага
// было бы той самой ложью о состоянии, которую этот путь выкорчёвывает.

import { useState } from "react";
import { Download, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Small } from "@/components/ui/typography";

// 🔒 ТОСТ НЕ ГАСНЕТ САМ. В нём инструкция, которую человек выполняет РУКАМИ и не
// здесь: открыть Claude Code, перетащить файл, вставить подсказку. Тост на пять
// секунд исчез бы ровно в тот момент, когда человек отвёл глаза к другому окну.
// Закрывает его крестик — по слову владельца и по здравому смыслу.
const STICKY = { duration: Infinity, closeButton: true };

const BTN =
  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium " +
  "bg-[var(--grab-bg)] text-[var(--grab-fg)] transition-opacity " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--grab-ring)]";

/**
 * 13-я сущность: КНОПКА ВЫДАЧИ ФАЙЛА.
 *
 * Небольшая, оранжевая, пульсирует до первого нажатия. Скачивает то, что стоит
 * за `href`, — сегодня это выгрузка переменных окружения.
 */
export function StepGrabButton({
  href,
  label,
  toastTitle,
  toastBody,
  failureTitle,
}: {
  href: string;
  label: string;
  toastTitle: string;
  toastBody: string;
  /** Что сказать, когда файл не выдался. Молчать здесь нельзя. */
  failureTitle: string;
}) {
  const [used, setUsed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function grab() {
    setBusy(true);
    try {
      // 🔒 ЗАБИРАЕМ ЧЕРЕЗ fetch, А НЕ ПРОСТОЙ ССЫЛКОЙ. Дверь отвечает 401 и 409 —
      // «нет сессии» и «сервер не смог назвать свой адрес». Обычная ссылка
      // показала бы человеку страницу с текстом ошибки вместо файла, и он решил
      // бы, что это и есть его окружение.
      const r = await fetch(href, { cache: "no-store" });
      if (!r.ok) {
        toast.error(failureTitle, { description: `HTTP ${r.status}`, duration: 6000 });
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ".env.local";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setUsed(true);
      // 🔒 ОДИН И ТОТ ЖЕ `id`: повторное нажатие ПОКАЗЫВАЕТ ТОТ ЖЕ тост заново, а
      // не копит десять одинаковых полос друг под другом.
      toast(toastTitle, { ...STICKY, id: "step-grab", description: toastBody });
    } catch {
      toast.error(failureTitle, { duration: 6000 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={grab}
      disabled={busy}
      data-grab={used ? "used" : "fresh"}
      className={`${BTN} ${used ? "opacity-55 hover:opacity-90" : "launch-pulse"}`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Download size={14} aria-hidden />}
      {label}
    </button>
  );
}

/**
 * 14-я сущность: БЛОК КОПИРОВАНИЯ ТЕКСТА.
 *
 * Текст виден целиком и копируется одной кнопкой. 🔒 Виден НАМЕРЕННО: это слова,
 * которые человек отдаст агенту от своего имени, и отдавать вслепую то, чего не
 * прочитал, — плохая привычка, которой не стоит учить на первом же проекте.
 */
export function StepCopyBlock({
  text,
  label,
  copiedLabel,
  toastTitle,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  toastTitle: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 🔒 БУФЕР МОЖЕТ БЫТЬ ЗАПРЕЩЁН (небезопасный контекст, отказ браузера), и
      // тогда молчать нельзя: человек нажал и ждёт. Текст на экране — он выделит
      // его руками, но знать об отказе обязан.
      toast.error(label, { duration: 6000 });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast(toastTitle, { duration: 4000 });
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40">
      <div className="flex items-start justify-between gap-3 p-3">
        <Small className="whitespace-pre-wrap leading-relaxed">{text}</Small>
        <button
          type="button"
          onClick={copy}
          className={`${BTN} shrink-0 ${copied ? "opacity-55" : ""}`}
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied ? copiedLabel : label}
        </button>
      </div>
    </div>
  );
}
