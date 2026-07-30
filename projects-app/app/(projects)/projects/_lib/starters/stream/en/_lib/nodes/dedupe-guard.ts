// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — КОНТРОЛЬ ДУБЛЕЙ (шаг 310, требование владельца). Стоит ПЕРЕД
// `deliverDatabase` и гейтит `save|finance`. Две задачи в одном узле (как askAddress держит место):
//
//   1) РЕЗОЛВ. В чате висит вопрос о дубле (`pending.kind === "dup-confirm"`) → ЭТО сообщение = ответ.
//      «да / второй раз / запиши» → пишем ПРИДЕРЖАННЫЕ строки (payload из pending) и снимаем вопрос;
//      «нет / не надо» → снимаем вопрос, ничего не пишем; невнятно → снимаем вопрос и обрабатываем
//      текущее сообщение как новое (не задваиваем молча). Во всех исходах ставим `skipDatabase`, чтобы
//      склад не записал повторно то, что решил этот узел.
//   2) ОБНАРУЖЕНИЕ. Иначе строим строки, которые ЗАПИСАЛ БЫ склад (общие билдеры `financeRowFrom`/
//      `noteRowFrom` — одна форма в одном месте), ищем похожую существующую (`dedupe.ts`, строгий порог).
//      Нашли → НЕ пишем; кладём payload в `pending` и просим подтверждение (`duplicateAsk`) + `skipDatabase`.
//      Не нашли → пропускаем поток без изменений (склад пишет как обычно).
//
// Почему hold-and-confirm, а не тихое слияние: владелец сказал «по крайней мере уточни» — может, Дима
// правда отдал 10€ второй раз, а может, это повтор. Решает человек, не эвристика.
// Имя `dedupeGuard` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { servesAnyIntent } from "../message";
import { addRow, listRows } from "../rows";
import { loadChat, setPending } from "../components/conversation/state";
import { financeDuplicate, noteDuplicate, readYesNo } from "../components/conversation/dedupe";
import { financeRowFrom, noteRowFrom } from "./deliver-database";

const GATED = ["save", "finance"] as const;

type Held = { table: string; values: Record<string, unknown> };

/** Короткая человекочитаемая подпись совпавшей строки для вопроса владельцу. */
function matchSummary(r: Record<string, unknown>): string {
  if (r.amount != null) {
    const store = String(r.store ?? "").trim();
    return `${r.amount}${r.currency ? " " + r.currency : ""}${store ? " · " + store : ""} — ${String(r.name ?? r.summary ?? "").trim()}`.trim();
  }
  return String(r.name ?? r.text ?? "").trim().slice(0, 80);
}

export async function dedupeGuard(ctx: NodeCtx): Promise<NodeCtx> {
  const chatId = String(ctx.telegramChatId ?? "").trim();

  // ── 1. РЕЗОЛВ висящего вопроса о дубле ───────────────────────────────────────
  if (chatId) {
    const state = await loadChat(chatId);
    if (state.pending && state.pending.kind === "dup-confirm") {
      const answer = readYesNo(String(ctx.text ?? ""));
      const held = (state.pending.payload?.rows as Held[] | undefined) ?? [];
      if (answer === "yes") {
        for (const h of held) await addRow(h.table, h.values);
        await setPending(chatId, null);
        return { skipDatabase: true, duplicateResolved: "written", duplicateCount: held.length };
      }
      if (answer === "no") {
        await setPending(chatId, null);
        return { skipDatabase: true, duplicateResolved: "skipped" };
      }
      // Невнятно — владелец сменил тему. Снимаем вопрос и НЕ пишем придержанное (безопасно: не задваиваем
      // без явного согласия); падаем в обнаружение по текущему сообщению.
      await setPending(chatId, null);
    }
  }

  // ── 2. ОБНАРУЖЕНИЕ дубля перед записью ───────────────────────────────────────
  if (!servesAnyIntent(ctx, GATED)) return {}; // не содержательное — не наше дело

  // Строим ВСЕ строки, которые записал бы склад в этом прогоне (та же форма — общие билдеры).
  const candidates: Held[] = [];
  const frow = financeRowFrom(ctx);
  if (frow) candidates.push({ table: "finance", values: frow });
  const nrow = noteRowFrom(ctx);
  if (nrow) candidates.push({ table: "database", values: nrow });
  if (!candidates.length) return {};

  // Ищем похожую существующую хотя бы для одной части.
  let match = "";
  if (frow) {
    const dup = financeDuplicate(frow, (await listRows("finance", Infinity)) as (Record<string, unknown> & { id: string })[]);
    if (dup) match = matchSummary(dup);
  }
  if (!match && nrow) {
    const dup = noteDuplicate(String(nrow.text ?? ""), (await listRows("database", Infinity)) as (Record<string, unknown> & { id: string })[]);
    if (dup) match = matchSummary(dup);
  }
  if (!match) return {}; // дублей нет — склад пишет как обычно

  // Нашли вероятный дубль → держим ВСЕ строки прогона (на «да» пишутся все, на «нет» — ни одной: составное
  // сообщение не теряет свою не-дубль часть и не двоит дубль) и спрашиваем владельца.
  if (chatId) await setPending(chatId, { kind: "dup-confirm", at: new Date().toISOString(), payload: { rows: candidates } });
  return { skipDatabase: true, duplicateAsk: { match } };
}
