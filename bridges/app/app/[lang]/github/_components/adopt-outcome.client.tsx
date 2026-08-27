"use client";

// Поток B: подключение чужого проекта Fractera и обе развилки отказа (шаг 25-7).
//
// 🔒 РАЗРУШЕНИЕ ТРЕБУЕТ ВТОРОГО ДВИЖЕНИЯ. Кнопка не запускает замену сразу: сначала
// человек видит, что именно будет уничтожено, и подтверждает. Одно нажатие на
// действие, отменить которое нельзя, — приглашение к беде.
//
// 🔒 ОТКАЗ ГОВОРИТ, ЧТО СЛОТ ЦЕЛ. Дверь возвращает `slotIntact`, и это выводится
// человеку словами. Без такой строки любая ошибка читается как «проект уже
// уничтожен», и человек не решается повторить с исправленным адресом.
//
// 🔒 ПИСЬМО — `mailto:` С ГОТОВЫМ ТЕКСТОМ. Своего почтового канала для этого случая
// у панели нет, и делать вид, что есть, значит потерять обращение молча.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, RotateCcw, Mail } from "lucide-react";
import { toast } from "sonner";

// 🔒 ПОДПИСИ РАЗДЕЛЕНЫ ПО РЕЖИМАМ, И ЭТО НЕ АККУРАТНОСТЬ РАДИ АККУРАТНОСТИ.
// Островку уезжает по проводу ВСЁ, что ему передали, — даже то, чего он в этом
// режиме не рисует. На шаге «проект поднялся?» человеку показывают откат и
// письмо, а в разметку вместе с ними уезжала форма замены слота с её кнопкой
// «Да, заменить». Тот же корень, что у утечки словаря в 25-1: клиенту достаётся
// то, чего он не просил.
type CommonLabels = {
  failedPrefix: string; slotIntact: string;
  reasons: Record<string, string>;
};
export type AdoptFormLabels = CommonLabels & {
  urlLabel: string; urlPlaceholder: string;
  cta: string; confirmTitle: string; confirmBody: string;
  confirmYes: string; confirmNo: string; running: string;
};
export type AdoptFailedLabels = CommonLabels & {
  restoreCta: string; restoreRunning: string;
  mailCta: string; mailSubject: string; mailBody: string;
};
export type AdoptLabels = AdoptFormLabels & AdoptFailedLabels;

type Props =
  | { mode: "form"; initialUrl: string; email: string; labels: AdoptFormLabels }
  | { mode: "failed"; initialUrl: string; email: string; labels: AdoptFailedLabels };

export function AdoptOutcome(props: Props) {
  const { initialUrl, mode, email } = props;
  const labels = props.labels as AdoptLabels;
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"" | "adopt" | "restore">("");

  async function call(body: Record<string, unknown>, kind: "adopt" | "restore") {
    setBusy(kind);
    try {
      const r = await fetch("/api/config/launch/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const d = (await r.json().catch(() => ({}))) as
        { ok?: boolean; error?: string; slotIntact?: boolean };
      if (!r.ok || !d.ok) {
        const code = String(d.error ?? "unknown");
        const why = labels.reasons[code] ?? labels.reasons.unknown ?? code;
        toast.error(`${labels.failedPrefix} ${why}${d.slotIntact ? ` ${labels.slotIntact}` : ""}`);
        return;
      }
      router.refresh();
    } catch (e) {
      toast.error(`${labels.failedPrefix} ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
      setConfirming(false);
    }
  }

  if (mode === "failed") {
    const mail =
      `mailto:${email}?subject=${encodeURIComponent(labels.mailSubject)}` +
      `&body=${encodeURIComponent(labels.mailBody.replace("{repoUrl}", url || "—"))}`;
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => call({ restore: true }, "restore")}
          disabled={busy !== ""}
          className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-orange-500 disabled:opacity-60"
        >
          {busy === "restore" ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
          {busy === "restore" ? labels.restoreRunning : labels.restoreCta}
        </button>
        <a
          href={mail}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-[12px] font-medium hover:bg-muted"
        >
          <Mail size={13} />
          {labels.mailCta}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[11px] font-medium text-foreground">{labels.urlLabel}</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={labels.urlPlaceholder}
          className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[11px]"
        />
      </label>

      {confirming ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
            <AlertTriangle size={13} className="shrink-0" />
            {labels.confirmTitle}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{labels.confirmBody}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => call({ repoUrl: url }, "adopt")}
              disabled={busy !== ""}
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-3.5 py-1.5 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy === "adopt" && <Loader2 size={12} className="animate-spin" />}
              {busy === "adopt" ? labels.running : labels.confirmYes}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-border px-3.5 py-1.5 text-[11px] hover:bg-muted"
            >
              {labels.confirmNo}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!url.trim()}
          className="launch-pulse inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {labels.cta}
        </button>
      )}
    </div>
  );
}
