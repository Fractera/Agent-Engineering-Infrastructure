// ФУНКЦИЯ УЗЛА «EVOLUTION» (область examples) — образцы ответов (шаг 314).
//
// 🔴 СИЛЬНЕЙШИЙ СИГНАЛ §5 — ПОПРАВКА ЧЕЛОВЕКА. «Нет, я имел в виду другое» это прямое расхождение
// ожидания и ответа, и оно ценнее любого наблюдения: человек уже сформулировал, КАК было надо. Пара
// «вопрос → правильный ответ» ложится в примеры, и в следующий раз речь отвечает в этом стиле сама
// (`converse` подбирает образец по совпадению слов).
//
// 🔒 ПРИМЕРЫ НЕ РАСТУТ БЕСКОНЕЧНО: они едут в модель вместе с инструкцией. Достигнут предел — вытесняется
// самый старый. Ограничение той же природы, что потолок инструкции (П3).
// Имя `evolveExamples` — производное от области, не переименовывать.
import type { NodeCtx } from "../executor";
import { readAdjustment } from "../components/conversation/adjustment";
import { evolveAssistantData } from "../components/conversation/self-write";

const MAX_EXAMPLES = 12;

export async function evolveExamples(ctx: NodeCtx): Promise<NodeCtx> {
  const adj = await readAdjustment(ctx);
  if (!adj.example) return { examplesEvolution: "no-signal" };
  const pair = adj.example;

  const changed = await evolveAssistantData(
    (data) => {
      const qa = Array.isArray(data.qa) ? (data.qa as { q?: unknown; a?: unknown }[]) : [];
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      if (qa.some((p) => norm(String(p.q ?? "")) === norm(pair.q))) return null; // такой вопрос уже есть
      const next = [...qa, pair];
      return { ...data, qa: next.length > MAX_EXAMPLES ? next.slice(next.length - MAX_EXAMPLES) : next };
    },
    `an example learned from a correction: "${pair.q}"`,
  );
  return { examplesEvolution: changed ? "learned" : "no-change" };
}
