"use client";

// «Мне нужна помощь с этими инструментами» (владелец 2026-08-14).
//
// 🔒 ЗАЧЕМ КНОПКА. Названия инструментов человеку ничего не говорят: «Claude
// Code», «расширение для браузера», «редактор» — это слова из чужого мира. Тот,
// кто их не понял, уходит молча, и мы даже не узнаём, что потеряли его именно
// здесь. Кнопка превращает молчаливый уход в измеримый запрос.
//
// 🔒 ПИСЬМО ОТПРАВЛЯЕТ ЧЕЛОВЕК, А СЧИТАЕТ СЕРВЕР. На сервере пользователя
// отправителя почты нет (ни Resend, ни SMTP, ни почты в слое каналов), поэтому
// «Отправить» открывает готовое письмо в ЕГО почте — обратный адрес получается
// настоящим сам собой, без единого поля. А нажатие фиксируется на сервере
// отдельно: спрос считается по нажатиям, иначе передумавшие в почтовом клиенте
// исчезали бы из статистики вместе со своим сигналом.
//
// 🔒 ЕСТЬ ЗАПАСНОЙ ПУТЬ. Почтовый клиент открывается не у всех (веб-почта,
// запрет браузера), поэтому рядом всегда стоит адрес и кнопка «скопировать
// письмо». Дверь, работающая через раз, хуже отсутствующей: она обещает.

import { useState } from "react";
import { Loader2, LifeBuoy, Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const CONSULT_EMAIL = "admin@fractera.ai";

export type ConsultLabels = {
  action: string;
  title: string;
  body: string;
  free: string;
  whatWeSend: string;
  cancel: string;
  send: string;
  sending: string;
  sent: string;
  copy: string;
  copied: string;
  mailSubject: string;
  /** Тело письма; {page} — адрес страницы, откуда позвали. */
  mailBody: string;
};

export function ConsultHelp({ labels, topic }: { labels: ConsultLabels; topic: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const pageUrl = typeof window === "undefined" ? "" : window.location.href;
  const letter = labels.mailBody.replace("{page}", pageUrl);

  async function send() {
    setBusy(true);
    try {
      // Считаем спрос ДО открытия почты: почтовый клиент может увести фокус со
      // страницы, и всё, что не успело уйти, ушло бы в никуда.
      await fetch("/api/support/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pageUrl, topic }),
        credentials: "include",
      }).catch(() => { /* счётчик наш, путь человека он ломать не вправе */ });

      const href = `mailto:${CONSULT_EMAIL}?subject=${encodeURIComponent(labels.mailSubject)}&body=${encodeURIComponent(letter)}`;
      window.location.href = href;
      toast.success(labels.sent, { duration: 9000 });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${CONSULT_EMAIL}\n\n${labels.mailSubject}\n\n${letter}`);
      setCopied(true);
      toast.success(labels.copied);
      setTimeout(() => setCopied(false), 3000);
    } catch { /* буфер недоступен — текст виден в окне и его можно выделить */ }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setOpen(true)}>
        <LifeBuoy size={11} />{labels.action}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-16 w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-2xl">
            <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <LifeBuoy size={14} className="shrink-0 text-primary" />
              {labels.title}
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{labels.body}</p>

            <p className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
              {labels.free}
            </p>

            {/* Что именно уйдёт — показано дословно, а не описано словами.
                Человек вправе увидеть письмо до того, как оно уйдёт от его
                имени; описанное своими словами обещание тут не годится. */}
            <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{labels.whatWeSend}</p>
            <div className="mt-1 rounded-md border border-border bg-muted/30 p-2 text-[10px] leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Mail size={11} className="shrink-0" />{CONSULT_EMAIL}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{letter}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={copy}
                className="mr-auto flex items-center gap-1 text-[11px] text-muted-foreground underline hover:text-foreground"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? labels.copied : labels.copy}
              </button>
              <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setOpen(false)} disabled={busy}>
                {labels.cancel}
              </Button>
              <Button size="sm" className="text-[11px]" onClick={send} disabled={busy}>
                {busy ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                {busy ? labels.sending : labels.send}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
