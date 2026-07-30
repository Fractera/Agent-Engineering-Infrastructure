// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — УТОЧНЕНИЕ ИЗМЕРЕНИЯ ТРАТЫ (шаг 310, требование владельца). Стоит ПОСЛЕ
// dedupeGuard и ПЕРЕД deliverDatabase, гейт `finance`. Две задачи в одном узле (как askAddress/dedupeGuard):
//
//   1) РЕЗОЛВ. В чате висит вопрос об измерении (`pending.kind === "dim-survey"`) → ЭТО сообщение = ответ:
//      сопоставляем его со значениями текущего спрашиваемого измерения, дописываем значение в ПРИДЕРЖАННУЮ
//      строку finance; если остались неуточнённые измерения — спрашиваем следующее; иначе пишем строку.
//      Во всех исходах `skipDatabase`, чтобы склад не записал ответ отдельной строкой.
//   2) ПРОСТАВЛЕНИЕ при записи. Есть активные измерения (`finance-dimensions`) и записывается трата →
//      пытаемся ОПРЕДЕЛИТЬ значение каждого измерения из текста (детерминированно). Все определились →
//      кладём в `ctx.financeDims` (склад впишет их в строку), поток идёт дальше. Что-то не ясно → ДЕРЖИМ
//      строку finance и СПРАШИВАЕМ владельца («дом или работа?») — с этого момента трата не записывается,
//      пока не уточнят (закон владельца «ты должен уточнять»).
//
// Имя `dimensionTag` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { servesIntent } from "../message";
import { addRow } from "../rows";
import { loadChat, setPending } from "../components/conversation/state";
import { listDimensions, inferValue, type Dimension } from "../components/conversation/dimensions";
import { financeRowFrom } from "./deliver-database";

type Held = { row: Record<string, unknown>; remaining: Dimension[]; askedField: string };

/** Сопоставить ответ владельца одному из значений измерения (стем-совпадение). */
function matchAnswer(text: string, dim: Dimension): string | null {
  return inferValue(text, dim);
}

export async function dimensionTag(ctx: NodeCtx): Promise<NodeCtx> {
  const chatId = String(ctx.telegramChatId ?? "").trim();

  // ── 1. РЕЗОЛВ висящего вопроса об измерении ──────────────────────────────────
  if (chatId) {
    const state = await loadChat(chatId);
    if (state.pending && state.pending.kind === "dim-survey") {
      const held = state.pending.payload as unknown as Held;
      const dims: Dimension[] = Array.isArray(held?.remaining) ? held.remaining : [];
      const asked = dims.find((d) => d.field === held.askedField) ?? dims[0];
      const row = { ...(held?.row ?? {}) } as Record<string, unknown>;
      if (asked) {
        const val = matchAnswer(String(ctx.text ?? ""), asked);
        if (val) row[asked.field] = val; // не совпало — оставляем поле пустым, не зацикливаемся
      }
      const rest = dims.filter((d) => d.field !== (asked?.field ?? ""));
      const nextUnknown = rest.find((d) => row[d.field] == null);
      if (nextUnknown) {
        await setPending(chatId, { kind: "dim-survey", at: new Date().toISOString(), payload: { row, remaining: rest, askedField: nextUnknown.field } as unknown as Record<string, unknown> });
        return { skipDatabase: true, dimensionAsk: { question: nextUnknown.question, field: nextUnknown.field } };
      }
      await addRow("finance", row);
      await setPending(chatId, null);
      return { skipDatabase: true, dimensionResolved: "written" };
    }
  }

  // ── 2. ПРОСТАВЛЕНИЕ при записи ───────────────────────────────────────────────
  if (ctx.skipDatabase === true) return {}; // dedupeGuard уже придержал — не вмешиваемся
  if (!servesIntent(ctx, "finance")) return {};
  const frow = financeRowFrom(ctx);
  if (!frow) return {};
  const dims = await listDimensions();
  if (!dims.length) return {}; // измерений нет — как раньше

  const text = String(ctx.text ?? "");
  const inferred: Record<string, string> = {};
  const unknown: Dimension[] = [];
  for (const d of dims) {
    const v = inferValue(text, d);
    if (v) inferred[d.field] = v; else unknown.push(d);
  }
  if (!unknown.length) return { financeDims: inferred }; // всё ясно — склад впишет значения, поток идёт дальше

  // Что-то не определилось → держим строку (с уже определёнными измерениями) и спрашиваем.
  const row = financeRowFrom({ ...ctx, financeDims: inferred }) as Record<string, unknown>;
  const first = unknown[0];
  if (chatId) await setPending(chatId, { kind: "dim-survey", at: new Date().toISOString(), payload: { row, remaining: unknown, askedField: first.field } as unknown as Record<string, unknown> });
  return { skipDatabase: true, dimensionAsk: { question: first.question, field: first.field } };
}
