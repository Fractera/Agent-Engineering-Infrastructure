// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — САМ-ГЕЙТ HOOK-ФРАЗЫ (шаг 307.7, узловой навык №6 библиотеки
// середины). Так РАЗНЫЕ сценарии живут в ОДНОМ канале (один личный чат бота) без запрещённого N-way
// роутера: каждая автоматизация группы слушает тот же чат и в этом узле проверяет СВОЮ триггер-фразу.
//
// Фразы приходят в `ctx.hookPhrases` (их кладёт панель настроек группы при прогоне с пульта); когда
// прогон пришёл из РЕАЛЬНОГО канала (слушатель бота фраз не знает — и не должен), узел берёт фразы из
// СВОЕГО ядра: поле `hookPhrases` узла hookGate в `automation.json` (аддитив 307.14R — git несёт фразы
// между серверами, redeploy их не теряет). Совпала одна → узел пропускает поток дальше, положив в
// `ctx.text` ХВОСТ после фразы (полезная нагрузка), а саму фразу — в `ctx.hookPhrase`. Чужая фраза →
// возврат `null` = «этот прогон не мой», штатная остановка без ошибки (контракт движка: `null` из узла
// останавливает цепочку). Фраз не задано нигде → гейт ОТКРЫТ (проходит как есть) — узел бездействует,
// пока строитель не настроит фразы. Детерминированно, без AI.
// Имя `hookGate` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { matchHook } from "../message";
import { readCore } from "../core-io";
import { allNodes } from "../_data/automation.schema";

export async function hookGate(ctx: NodeCtx): Promise<NodeCtx | null> {
  const text = String(ctx.text ?? "").trim();
  let phrases = Array.isArray(ctx.hookPhrases) ? (ctx.hookPhrases as unknown[]).map(String).filter(Boolean) : [];
  if (!phrases.length) {
    // Прогон фраз не принёс — единственный их дом это собственное ядро (узел hookGate).
    try {
      const own = allNodes((await readCore()).graph.nodes).find((n) => n.function.name === "hookGate");
      if (own && Array.isArray(own.hookPhrases)) phrases = own.hookPhrases.map(String).filter(Boolean);
    } catch {
      // ядро недоступно/невалидно — гейт остаётся открытым, как при пустых фразах (узел не судья ядру)
    }
  }
  if (!phrases.length) return {}; // фраз нет — гейт открыт, поток идёт неизменным
  const hit = matchHook(text, phrases);
  if (!hit) return null; // чужая фраза — прогон не этой автоматизации, штатная остановка
  return { text: hit.payload, hookPhrase: hit.phrase, hookMatched: true };
}
