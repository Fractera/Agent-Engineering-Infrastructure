// ФУНКЦИЯ УЗЛА «OUTPUT» (канал toast) — НЕОТКЛЮЧАЕМЫЙ ИСХОД ПРОГОНА (шаг 311.8, требование владельца).
//
// 🔒 ЗАЧЕМ. До этого узла `condition-failure` имел ЗАПРЕЩЁННЫЙ выход: упавший прогон не доходил ни до
// одного выхода, и человек не узнавал ни того, что случилось, ни почему. Тост принимает ОБЕ ветки — и
// успеха, и провала — и всегда открыт: у реального проекта он не может быть спрятан (закон запуска в
// схеме). Автоматизация, умеющая молча падать, перестала быть выразимой.
//
// ЧЕСТНАЯ ГРАНИЦА (записана и в `output.toast.md`): тост — поверхность СВОЕЙ страницы и журнала прогонов.
// Для человека, который написал из бота, последнее слово всё равно за каналом-источником: тост не
// притворяется доставкой в чужой канал. Он гарантирует, что исход ЗАФИКСИРОВАН и виден на месте.
//
// Строка ложится в таблицу `toast`: исход · причина · момент · канал. Это не дубль журнала: журнал —
// машинный след прогона, а тост — то, что читает человек.
// Имя `deliverToast` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { addRow } from "../rows";

/** Почему прогон закончился так, как закончился — из того, что оставили узлы; иначе честное «без причин». */
function reasonOf(ctx: NodeCtx): string {
  for (const key of ["subjectError", "objectError", "subjectMissing", "refusal"]) {
    const v = String(ctx[key] ?? "").trim();
    if (v) return key === "subjectMissing" ? `nothing found about “${v}”` : v;
  }
  if (ctx.skipStores === true) return "the middle found nothing to store";
  return "";
}

export async function deliverToast(ctx: NodeCtx): Promise<{ toastRowId: string; toastOutcome: string }> {
  const m = messageOf(ctx);
  const outcome = String(ctx.outcome ?? "").trim() || "completed";
  const reason = reasonOf(ctx);
  const row = await addRow("toast", {
    outcome,
    reason,
    title: m.title,
    source: m.source,
    date: m.at,
  });
  return { toastRowId: row.id, toastOutcome: outcome };
}
