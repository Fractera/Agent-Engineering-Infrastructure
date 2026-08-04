"use client";

import { controlPanelStrings, pick } from "../../i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ОТЧЁТ ПРОГОНА — что вернула дверь api/run: цепочка узлов чипами (образец v1) и одна строка исхода.
// Общий компонент публичной половины: так отчитывается любой пульт вкладки.
export type NodeReport = { cuid: string; name: string; fn: string; status: "ok" | "stopped" | "fail"; error?: string };
export type RunCost = { nodeFunctions: number; modelCalls: number };
export type Outcome =
  | { ok: boolean; nodes: NodeReport[]; cost?: RunCost; error?: string; context?: Record<string, unknown> }
  | { refusal: string };

/** Ошибка узла приходит либо строкой, либо JSON-картой десяти языков (так бросает `receiveRequest`). */
export function readError(raw: unknown, lang: string): string {
  const s = String(raw ?? "");
  if (!s.startsWith("{")) return s;
  try {
    return pick(JSON.parse(s), lang) || s;
  } catch {
    return s;
  }
}

export default function RunReport({ outcome, lang }: { outcome: Outcome; lang: string }) {
  const L = controlPanelStrings(lang);

  if ("refusal" in outcome) {
    // ОБУЧАЮЩИЙ ОТКАЗ движка (замороженный шаблон, нет видимых узлов) — показываем как есть, не прячем.
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-sm text-rose-700 dark:text-rose-400">{L.refused.replace("{k}", outcome.refusal)}</p>
      </div>
    );
  }

  // ОТВЕТ АССИСТЕНТА (309): тот же разговорный ответ, что ушёл бы в Telegram, приходит и в ПУЛЬТ —
  // `api/run` достраивает `context.reply`. Спросил в пульте — ответ в пульте, а не только в мессенджере.
  const reply = typeof outcome.context?.reply === "string" ? outcome.context.reply.trim() : "";

  // 🔒 ОТКУДА ЭТО ВСПОМНИЛОСЬ (330.8, требование владельца). Когда ответ опирается на долгую память, под
  // ним показываются ИСТОЧНИКИ — дата разговора и выдержка, выделенные цветом. Человек видит, что фраза
  // пришла из беседы двухнедельной давности, а не выдумана сейчас. Всё хранилище НЕ показываем: только
  // источник конкретного ответа.
  const sources = Array.isArray(outcome.context?.recallSources)
    ? (outcome.context!.recallSources as { at?: string; channel?: string; excerpt?: string }[])
    : [];

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      {reply ? (
        <p className="whitespace-pre-wrap rounded-md bg-background p-2 text-sm">{reply}</p>
      ) : outcome.error ? (
        <p className="text-sm text-rose-700 dark:text-rose-400">{readError(outcome.error, lang)}</p>
      ) : (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{L.done}</p>
      )}
      {sources.length ? (
        <div className="space-y-1 rounded-md border border-rose-300/60 bg-rose-50/60 p-2 dark:border-rose-900/60 dark:bg-rose-950/30">
          <p className="text-[11px] font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">{L.recalledFrom}</p>
          {sources.map((s, i) => (
            <p key={i} className="text-xs text-rose-800 dark:text-rose-200">
              {s.at ? <span className="font-semibold">{String(s.at).slice(0, 10)} · </span> : null}
              {s.excerpt}
            </p>
          ))}
        </div>
      ) : null}
      {/* 🔒 ЦЕНА ПРОГОНА НАЗЫВАЕТСЯ ВСЛУХ (доктрина масштаба, 2026-08-04). Движок исполняет КАЖДЫЙ видимый
          узел на КАЖДОМ прогоне, и это платится на каждом сообщении, включая «привет». Пока число не видно,
          «много узлов» звучит как аккуратность, а не как счёт; здесь оно рядом с ответом. */}
      {outcome.cost ? (
        <p className="text-xs text-muted-foreground">
          {L.price.replace("{f}", String(outcome.cost.nodeFunctions)).replace("{m}", String(outcome.cost.modelCalls))}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {outcome.nodes.map((n) => (
          <Badge
            key={n.cuid}
            variant="outline"
            title={readError(n.error, lang)}
            className={cn(
              n.status === "ok"
                ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                : n.status === "stopped"
                  ? "border-border text-muted-foreground"
                  : "border-rose-500/40 text-rose-700 dark:text-rose-400",
            )}
          >
            {n.name} · {n.status}
          </Badge>
        ))}
      </div>
    </div>
  );
}
