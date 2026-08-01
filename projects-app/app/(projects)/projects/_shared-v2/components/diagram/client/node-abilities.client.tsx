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

// ─── i18n подписей (правило 4г: строки кокпита — на десяти языках) ──────────────────────────────────
// Словарь детерминированный, в коде: перевод, зависящий от вызова модели, при её недоступности оставил бы
// пустой интерфейс. ЯЗЫК ОТВЕТА ИИ — тот же (его выбирает дверь по `NEXT_PUBLIC_DEFAULT_LOCALE`), поэтому
// подписи и вердикт всегда говорят на одном языке.
type Lang = "en" | "es" | "fr" | "it" | "ru" | "de" | "pt" | "pl" | "tr" | "nl";

type Labels = { what: string; ask: string; outcomes: string; none: string; chain: string; here: string; pattern: string; better: string; checked: string; classified: string; unclassified: string };

const DICT: Record<Lang, Labels> = {
  en: { what: "What can you do?", ask: "Ask the AI: does it fit?", outcomes: "Outcomes it can tell apart", none: "none — this node cannot tell a failure from a success", chain: "In this chain", here: "here", pattern: "pattern", better: "Better", checked: "checked", classified: "a failure cannot look like a success here", unclassified: "no validator: a failure would pass as success" },
  es: { what: "¿Qué sabes hacer?", ask: "Pregunta a la IA: ¿encaja?", outcomes: "Resultados que distingue", none: "ninguno: este nodo no distingue un fallo de un éxito", chain: "En esta cadena", here: "aquí", pattern: "patrón", better: "Mejor", checked: "comprobado", classified: "aquí un fallo no puede parecer un éxito", unclassified: "sin validador: un fallo pasaría como éxito" },
  fr: { what: "Que sais-tu faire ?", ask: "Demander à l'IA : convient-il ?", outcomes: "Issues qu'il distingue", none: "aucune — ce nœud ne distingue pas un échec d'un succès", chain: "Dans cette chaîne", here: "ici", pattern: "motif", better: "Mieux", checked: "vérifié", classified: "ici un échec ne peut pas ressembler à un succès", unclassified: "sans validateur : un échec passerait pour un succès" },
  it: { what: "Cosa sai fare?", ask: "Chiedi all'IA: è adatto?", outcomes: "Esiti che distingue", none: "nessuno: questo nodo non distingue un fallimento da un successo", chain: "In questa catena", here: "qui", pattern: "schema", better: "Meglio", checked: "verificato", classified: "qui un fallimento non può sembrare un successo", unclassified: "senza validatore: un fallimento passerebbe per successo" },
  ru: { what: "Что ты умеешь?", ask: "Спросить ИИ: подходит ли?", outcomes: "Исходы, которые он различает", none: "нет ни одного — этот узел не отличает провал от успеха", chain: "В этой цепочке", here: "здесь", pattern: "паттерн", better: "Лучше", checked: "проверено", classified: "провал здесь не может выглядеть успехом", unclassified: "валидатора нет: провал прошёл бы как успех" },
  de: { what: "Was kannst du?", ask: "Die KI fragen: passt er?", outcomes: "Ergebnisse, die er unterscheidet", none: "keine — dieser Knoten unterscheidet Fehler nicht von Erfolg", chain: "In dieser Kette", here: "hier", pattern: "Muster", better: "Besser", checked: "geprüft", classified: "ein Fehler kann hier nicht wie ein Erfolg aussehen", unclassified: "kein Validator: ein Fehler ginge als Erfolg durch" },
  pt: { what: "O que sabes fazer?", ask: "Perguntar à IA: serve?", outcomes: "Resultados que distingue", none: "nenhum — este nó não distingue uma falha de um sucesso", chain: "Nesta cadeia", here: "aqui", pattern: "padrão", better: "Melhor", checked: "verificado", classified: "aqui uma falha não pode parecer um sucesso", unclassified: "sem validador: uma falha passaria por sucesso" },
  pl: { what: "Co potrafisz?", ask: "Zapytaj AI: czy pasuje?", outcomes: "Wyniki, które rozróżnia", none: "żadnych — ten węzeł nie odróżnia porażki od sukcesu", chain: "W tym łańcuchu", here: "tutaj", pattern: "wzorzec", better: "Lepiej", checked: "sprawdzono", classified: "tutaj porażka nie może wyglądać jak sukces", unclassified: "brak walidatora: porażka przeszłaby jako sukces" },
  tr: { what: "Ne yapabilirsin?", ask: "Yapay zekâya sor: uygun mu?", outcomes: "Ayırt ettiği sonuçlar", none: "hiçbiri — bu düğüm başarısızlığı başarıdan ayırt edemiyor", chain: "Bu zincirde", here: "burada", pattern: "desen", better: "Daha iyi", checked: "kontrol edildi", classified: "burada bir hata başarı gibi görünemez", unclassified: "doğrulayıcı yok: hata başarı sayılırdı" },
  nl: { what: "Wat kun je?", ask: "Vraag de AI: past het?", outcomes: "Uitkomsten die het onderscheidt", none: "geen — deze node onderscheidt een fout niet van een succes", chain: "In deze keten", here: "hier", pattern: "patroon", better: "Beter", checked: "gecontroleerd", classified: "een fout kan hier niet op succes lijken", unclassified: "geen validator: een fout zou als succes doorgaan" },
};

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

export function NodeAbilities({ cuid, lang }: { cuid: string; lang: string }) {
  const T = DICT[(lang as Lang) in DICT ? (lang as Lang) : "en"];
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
          {T.what}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(true)}
          className="h-7 flex-1 rounded-md border border-violet-500/50 bg-violet-500/10 px-2 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-500/20 disabled:opacity-50 dark:text-violet-300"
        >
          {T.ask}
        </button>
      </div>

      {busy && <p className="text-[11px] text-muted-foreground">…</p>}
      {facts?.error && <p className="text-[11px] text-rose-600">{facts.error}</p>}

      {facts?.outcomes && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium">{T.outcomes}</p>
          {facts.outcomes.length === 0 && (
            <p className="text-[11px] text-rose-600">{T.none}</p>
          )}
          {facts.outcomes.map((o) => (
            <p key={o.name} className="text-[11px] text-muted-foreground">
              <code className="text-[10px]">{o.name}</code> — {o.when}
            </p>
          ))}
          {facts.chain && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">{T.chain}:</span> {facts.chain.upstream.join(", ") || "—"} →{" "}
              <span className="font-medium">{T.here}</span> → {facts.chain.downstream.join(", ") || "—"}
            </p>
          )}
          {facts.honesty && <p className="text-[11px] text-muted-foreground">{facts.honesty === "classified" ? T.classified : T.unclassified}</p>}
          {facts.lineage && <p className="text-[11px] text-muted-foreground">{T.pattern}: <code className="text-[10px]">{facts.lineage}</code></p>}
        </div>
      )}

      {/* Вердикт — ровно три исхода, четвёртого нет. Модель недоступна → честно говорим об этом, а не
          показываем «наверное подойдёт»: догадка с уверенным тоном хуже отсутствия вердикта. */}
      {v?.verdict && (
        <div className={`space-y-1 rounded-md border p-2 ${VERDICT_TONE[v.verdict] ?? "border-muted"}`}>
          <p className="text-[11px] font-semibold uppercase">{v.verdict}</p>
          {v.why && <p className="text-[11px]">{v.why}</p>}
          {v.alternative && <p className="text-[11px]">{T.better}: {v.alternative}</p>}
          {v.checked && <p className="text-[10px] opacity-80">{T.checked}: {v.checked}</p>}
        </div>
      )}
      {facts?.verdictError && <p className="text-[11px] text-amber-700 dark:text-amber-300">{facts.verdictError}</p>}
    </div>
  );
}
