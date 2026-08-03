// ФУНКЦИЯ УЗЛА «EVOLUTION» (область voice) — КАК автоматизация говорит (шаг 314, вектор 1).
//
// 🔴 ЧТО ЭТО ЗАКРЫВАЕТ. Владелец сказал: «не нужно эмодзи, отвечай подробнее» — и замер показал границу:
// просьба держалась, пока помнилась (буфер, потом сводка сессии), а в ядре не менялось НИЧЕГО. Значит в
// Telegram той же автоматизации она не действовала, а через десяток тем сводка её вытесняла. Это была
// долгая память, а не обучение.
//
// 🔒 ГОЛОС — СТРУКТУРА, А НЕ ПРОЗА. `{emoji, length, address}` применяется речью детерминированно, его
// нельзя «понять иначе», и он не растёт со временем. Прозаические предпочтения — это `behavior`.
//
// 🔒 ПРЯМАЯ ПРОСЬБА ИСПОЛНЯЕТСЯ СРАЗУ: порог накопления (П2) к ней НЕ применяется — он для слабых
// сигналов, выведенных наблюдением. Человек, сказавший прямо и вынужденный повторить, справедливо считает
// автоматизацию глухой.
// Имя `evolveVoice` — производное от области (закон схемы), не переименовывать.
import type { NodeCtx } from "../executor";
import { readAdjustment } from "../components/conversation/adjustment";
import { evolveAssistantData } from "../components/conversation/self-write";

export async function evolveVoice(ctx: NodeCtx): Promise<NodeCtx> {
  const adj = await readAdjustment(ctx);
  if (!adj.voice) return { voiceEvolution: "no-signal" };
  const asked = adj.voice;

  const said = [
    asked.emoji === null ? "" : asked.emoji ? "emoji welcome" : "no emoji",
    asked.length ? `answers ${asked.length}` : "",
    asked.address ? `address: ${asked.address}` : "",
  ]
    .filter(Boolean)
    .join("; ");

  const changed = await evolveAssistantData(
    (data) => {
      const prev = (data.voice ?? {}) as Record<string, unknown>;
      // Не высказался о чём-то — прежнее остаётся: просьба про эмодзи не отменяет прежнюю просьбу о длине.
      return {
        ...data,
        voice: {
          emoji: asked.emoji === null ? prev.emoji ?? null : asked.emoji,
          length: asked.length === null ? prev.length ?? null : asked.length,
          address: asked.address || String(prev.address ?? ""),
        },
      };
    },
    `voice adjusted at the person's request: ${said}`,
  );
  return { voiceEvolution: changed ? "adjusted" : "no-change" };
}
