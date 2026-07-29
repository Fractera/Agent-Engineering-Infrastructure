// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — САМ-ГЕЙТ HOOK-ФРАЗЫ (шаг 307.7, узловой навык №6 библиотеки
// середины). Так РАЗНЫЕ сценарии живут в ОДНОМ канале (один личный чат бота) без запрещённого N-way
// роутера: каждая автоматизация группы слушает тот же чат и в этом узле проверяет СВОЮ триггер-фразу.
//
// Фразы приходят в `ctx.hookPhrases` (их кладёт приёмник/панель настроек группы). Совпала одна → узел
// пропускает поток дальше, положив в `ctx.text` ХВОСТ после фразы (полезная нагрузка), а саму фразу — в
// `ctx.hookPhrase`. Чужая фраза → возврат `null` = «этот прогон не мой», штатная остановка без ошибки
// (контракт движка: `null` из узла останавливает цепочку). Фраз не задано → гейт ОТКРЫТ (проходит как
// есть) — узел бездействует, пока строитель не настроит фразы. Детерминированно, без AI.
// Имя `hookGate` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { matchHook } from "../message";

export function hookGate(ctx: NodeCtx): NodeCtx | null {
  const text = String(ctx.text ?? "").trim();
  const phrases = Array.isArray(ctx.hookPhrases) ? (ctx.hookPhrases as unknown[]).map(String).filter(Boolean) : [];
  if (!phrases.length) return {}; // фраз нет — гейт открыт, поток идёт неизменным
  const hit = matchHook(text, phrases);
  if (!hit) return null; // чужая фраза — прогон не этой автоматизации, штатная остановка
  return { text: hit.payload, hookPhrase: hit.phrase, hookMatched: true };
}
