"use client";

import { controlPanelStrings, pick } from "../../i18n";

// ОТЧЁТ ПРОГОНА — что вернула дверь api/run: цепочка узлов чипами (образец v1) и одна строка исхода.
// Общий компонент публичной половины: так отчитывается любой пульт вкладки.
export type NodeReport = { cuid: string; name: string; fn: string; status: "ok" | "stopped" | "fail"; error?: string };
export type Outcome =
  | { ok: boolean; nodes: NodeReport[]; error?: string; context?: Record<string, unknown> }
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

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      {outcome.error ? (
        <p className="text-sm text-rose-700 dark:text-rose-400">{readError(outcome.error, lang)}</p>
      ) : (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{L.done}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {outcome.nodes.map((n) => (
          <span
            key={n.cuid}
            title={readError(n.error, lang)}
            className={`rounded-md border px-2 py-1 text-xs ${
              n.status === "ok"
                ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                : n.status === "stopped"
                  ? "border-border text-muted-foreground"
                  : "border-rose-500/40 text-rose-700 dark:text-rose-400"
            }`}
          >
            {n.name} · {n.status}
          </span>
        ))}
      </div>
    </div>
  );
}
