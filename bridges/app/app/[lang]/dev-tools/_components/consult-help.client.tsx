"use client";

// «Мне нужна помощь с этими инструментами» (владелец 2026-08-14).
//
// 🔒 ЗАЧЕМ КНОПКА. Названия инструментов человеку ничего не говорят: «Claude
// Code», «расширение для браузера», «редактор» — слова из чужого мира. Тот, кто
// их не понял, уходит молча, и мы даже не узнаём, что потеряли его именно здесь.
// Кнопка превращает молчаливый уход в измеримый запрос.
//
// 🔒 ПИСЬМО УХОДИТ С НАШЕЙ СТОРОНЫ. Первая версия открывала почтовый клиент
// человека с готовым письмом — владелец попробовал и сказал прямо: «почта не
// открывается». Дверь, работающая через раз, хуже отсутствующей: она обещает.
// Теперь панель отдаёт запрос своему серверу, тот — стороне Fractera, где ключ
// почты уже живёт. Браузер в этом не участвует.
//
// 🔒 ОБРАТНЫЙ АДРЕС БЕРЁТСЯ ИЗ СЕССИИ. Спрашивать полем то, что система про
// человека уже знает, — работа, придуманная на ровном месте. Поле появляется
// ТОЛЬКО если адреса в сессии нет.
//
// 🔒 ЗАПАСНОЙ ПУТЬ ОСТАЁТСЯ. Не ушло (нет сети наружу, отказ почты) — окно
// говорит об этом и даёт скопировать письмо. Соврать «отправлено» здесь дороже
// всего: человек будет ждать ответа, которого никто не получал.

import { useState } from "react";
import { Loader2, LifeBuoy, Mail, Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const CONSULT_EMAIL = "admin@fractera.ai";

export type ConsultLabels = {
  action: string; hint?: string;
  title: string; body: string; free: string;
  whatWeSend: string; cancel: string; send: string; sending: string;
  sent: string; sentTo: string;
  notSent: string; emailAsk: string; emailPlaceholder: string;
  copy: string; copied: string; close: string;
  mailSubject: string; mailBody: string;
};

export function ConsultHelp({ labels, topic }: { labels: ConsultLabels; topic: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [askEmail, setAskEmail] = useState(false);
  const [result, setResult] = useState<null | { sent: boolean; email?: string; reason?: string }>(null);

  const pageUrl = typeof window === "undefined" ? "" : window.location.href;
  const letter = labels.mailBody.replace("{page}", pageUrl);

  async function send() {
    setBusy(true);
    try {
      const r = await fetch("/api/support/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pageUrl, topic, email: email.trim() || undefined }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (d?.sent) {
        setResult({ sent: true, email: d.email });
        toast.success(labels.sent, { duration: 9000 });
        return;
      }
      // Адреса нет — спрашиваем его один раз и остаёмся в окне.
      if (d?.reason === "no-email") { setAskEmail(true); toast.error(labels.emailAsk); return; }
      setResult({ sent: false, reason: String(d?.reason ?? "") });
      toast.error(labels.notSent, { duration: 12000 });
    } catch {
      setResult({ sent: false });
      toast.error(labels.notSent, { duration: 12000 });
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

  function close() {
    setOpen(false);
    setResult(null);
    setAskEmail(false);
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

            {result?.sent ? (
              // Отправлено — окно превращается в подтверждение с адресом, на
              // который придёт ответ. Без адреса «отправлено» не проверяемо.
              <p className="mt-3 flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                <Check size={13} className="mt-0.5 shrink-0" />
                <span>{labels.sentTo.replace("{email}", result.email ?? "")}</span>
              </p>
            ) : (
              <>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{labels.body}</p>

                <p className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                  {labels.free}
                </p>

                {/* Что именно уйдёт — показано дословно. Человек вправе увидеть
                    письмо, которое отправляется от его имени. */}
                <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{labels.whatWeSend}</p>
                <div className="mt-1 rounded-md border border-border bg-muted/30 p-2 text-[10px] leading-relaxed text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-medium text-foreground">
                    <Mail size={11} className="shrink-0" />{CONSULT_EMAIL}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{letter}</p>
                </div>

                {askEmail && (
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground">{labels.emailAsk}</p>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={labels.emailPlaceholder}
                      className="mt-1 w-full rounded-md border border-border bg-background p-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {result && !result.sent && (
                  <p className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>{labels.notSent}{result.reason ? ` (${result.reason})` : ""}</span>
                  </p>
                )}
              </>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              {!result?.sent && (
                <button
                  type="button"
                  onClick={copy}
                  className="mr-auto flex items-center gap-1 text-[11px] text-muted-foreground underline hover:text-foreground"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? labels.copied : labels.copy}
                </button>
              )}
              <Button size="sm" variant="outline" className="text-[11px]" onClick={close} disabled={busy}>
                {result?.sent ? labels.close : labels.cancel}
              </Button>
              {!result?.sent && (
                <Button size="sm" className="text-[11px]" onClick={send} disabled={busy}>
                  {busy ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                  {busy ? labels.sending : labels.send}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
