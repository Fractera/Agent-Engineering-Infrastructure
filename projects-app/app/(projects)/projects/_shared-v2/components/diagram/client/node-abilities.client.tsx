"use client";

// «УЗЕЛ, ЧТО ТЫ УМЕЕШЬ» — режим правого выдвижного ящика (шаг 311.8d, постановка владельца).
//
// Отвечает НЕ на тот вопрос, на который отвечают имя, описание и инструкция вида: те говорят, чем узел
// ЗАДУМАН. Здесь узел рассказывает, как он работает В ЖИВОЙ ЦЕПОЧКЕ — что приходит ему от соседей ИМЕННО
// ЗДЕСЬ, какие исходы он умеет различать и когда честно бессилен.
//
// 🔒 ВЕРДИКТ ВСЕГДА ОТ ИИ (решение владельца): «годится / категорически нельзя / есть решение лучше».
// Решает модель, а не совпадение слов в описании. Это же — проверка перед встраиванием чужого узла из
// корпуса (шаг 310): внешнее описание льстит, и узел, выглядевший подходящим, может оказаться непригоден
// на НАШИХ входных данных. Это нормальная ситуация, а не ошибка корпуса.
//
// Дев-слой: компонент живёт в `_shared-v2` одной копией на все автоматизации; данные берёт из двери
// `api/abilities` той автоматизации, чью страницу открыли (адрес выводится из URL, как у `api/patch`).
import { useCallback, useState } from "react";

type Outcome = { name: string; when: string; puts: string };
type Facts = {
  function?: { validator?: string | null };
  outcomes?: Outcome[];
  chain?: { upstream: string[]; downstream: string[] };
  lineage?: string | null;
  honesty?: string;
  verdict?: { verdict?: string; checked?: string; why?: string; alternative?: string } | null;
  verdictError?: string;
  error?: string;
};

const VERDICT_TONE: Record<string, string> = {
  fits: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  unfit: "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  "better-exists": "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
};

export function NodeAbilities({ cuid }: { cuid: string }) {
  const [facts, setFacts] = useState<Facts | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (withVerdict: boolean) => {
      setBusy(true);
      try {
        const base = location.pathname.replace(/\/+$/, "") + "/api";
        const res = await fetch(`${base}/abilities?cuid=${encodeURIComponent(cuid)}${withVerdict ? "&ask=1" : ""}`, { cache: "no-store" });
        setFacts((await res.json()) as Facts);
      } catch (e) {
        setFacts({ error: e instanceof Error ? e.message : String(e) });
      } finally {
        setBusy(false);
      }
    },
    [cuid],
  );

  const v = facts?.verdict;
  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(false)}
          className="h-7 flex-1 rounded-md border px-2 text-[11px] font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          What can you do?
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(true)}
          className="h-7 flex-1 rounded-md border border-violet-500/50 bg-violet-500/10 px-2 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-500/20 disabled:opacity-50 dark:text-violet-300"
        >
          Ask the AI: does it fit?
        </button>
      </div>

      {busy && <p className="text-[11px] text-muted-foreground">…</p>}
      {facts?.error && <p className="text-[11px] text-rose-600">{facts.error}</p>}

      {facts?.outcomes && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium">Outcomes it can tell apart</p>
          {facts.outcomes.length === 0 && (
            <p className="text-[11px] text-rose-600">none — this node cannot tell a failure from a success</p>
          )}
          {facts.outcomes.map((o) => (
            <p key={o.name} className="text-[11px] text-muted-foreground">
              <code className="text-[10px]">{o.name}</code> — {o.when}
            </p>
          ))}
          {facts.chain && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">In this chain:</span> {facts.chain.upstream.join(", ") || "—"} →{" "}
              <span className="font-medium">here</span> → {facts.chain.downstream.join(", ") || "—"}
            </p>
          )}
          {facts.honesty && <p className="text-[11px] text-muted-foreground">{facts.honesty}</p>}
          {facts.lineage && <p className="text-[11px] text-muted-foreground">pattern: <code className="text-[10px]">{facts.lineage}</code></p>}
        </div>
      )}

      {/* Вердикт — ровно три исхода, четвёртого нет. Модель недоступна → честно говорим об этом, а не
          показываем «наверное подойдёт»: догадка с уверенным тоном хуже отсутствия вердикта. */}
      {v?.verdict && (
        <div className={`space-y-1 rounded-md border p-2 ${VERDICT_TONE[v.verdict] ?? "border-muted"}`}>
          <p className="text-[11px] font-semibold uppercase">{v.verdict}</p>
          {v.why && <p className="text-[11px]">{v.why}</p>}
          {v.alternative && <p className="text-[11px]">Better: {v.alternative}</p>}
          {v.checked && <p className="text-[10px] opacity-80">checked: {v.checked}</p>}
        </div>
      )}
      {facts?.verdictError && <p className="text-[11px] text-amber-700 dark:text-amber-300">{facts.verdictError}</p>}
    </div>
  );
}
