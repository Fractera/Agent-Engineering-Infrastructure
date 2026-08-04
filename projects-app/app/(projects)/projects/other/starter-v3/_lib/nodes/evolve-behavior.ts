// ФУНКЦИЯ УЗЛА «EVOLUTION» (область behavior) — ЧТО автоматизация делает и чего не делает (шаг 314).
//
// 🔒 ПРАВКА, А НЕ ПЕРЕЗАПИСЬ (П1). Инструкцию поведения писал сам владелец; узел ДОПИСЫВАЕТ к ней одно
// короткое правило, а не сочиняет текст заново. Полная перезапись отняла бы у владельца понимание, что
// изменилось, и возможность откатить.
//
// 🔒 ПОТОЛОК ОБЪЁМА — И СМЕНА РЕЖИМА НА НЁМ (П3, постановка владельца 2026-08-03). Инструкция едет в модель
// на КАЖДОМ прогоне, поэтому расти бесконечно не может. Достигнут предел — узел перестаёт дописывать и
// начинает УПЛОТНЯТЬ: те же правила, меньше слов. Это не потеря правил, а их сжатие.
//
// 🔒 ЧЕГО ЗДЕСЬ НЕ БУДЕТ — перечня возможностей. Он ВЫВОДИТСЯ из ядра на каждом прогоне (312.4) и потому
// гнить не может: переписывать его нечем и незачем. Требование §4а ТЗ снято вычислением, а вычисление
// строго сильнее любого переписывания.
// Имя `evolveBehavior` — производное от области, не переименовывать.
import type { NodeCtx } from "../executor";
import { askModel } from "../ai";
import { readCore } from "../core-io";
import { allNodes } from "../../_data/automation.schema";
import { readAdjustment } from "../components/conversation/adjustment";
import { evolveAssistantData } from "../components/conversation/self-write";

/** Потолок инструкции: дальше не дописываем, а уплотняем. Цена каждого знака платится на каждом прогоне. */
const INSTRUCTION_LIMIT = 1800;

/**
 * 🔒 ОБЕЩАНИЕ ПО РАСПИСАНИЮ БЕЗ ЧАСОВ — НЕВОЗМОЖНО, И ЭТО РЕШАЕТСЯ БЕЗ МОДЕЛИ (332.E).
 *
 * Порядок разбора (сначала пробел, потом поведение) опирается на ВЕРДИКТ МОДЕЛИ, а он неустойчив: «присылай
 * еженедельный отчёт» изредка проходит как «сборка это умеет», и правило садится в стоячую инструкцию —
 * ровно дефект 314, который считался закрытым. Здесь нужна опора твёрже вердикта.
 *
 * Она есть: САМА СЕБЯ автоматизация запускает только через вход по расписанию. Он скрыт — значит никакое
 * «каждый понедельник» физически неисполнимо, и это видно из ядра, а не из суждения. Признак повторяемости
 * — закрытый список слов на языках кокпита; ошибиться он может только в сторону ОТКАЗА записать правило,
 * а отказ безопасен: просьба уходит в журнал пробелов, где её увидит владелец.
 */
const RECURRENCE = /\b(every|each|weekly|daily|monthly|hourly)\b|каждый|каждую|каждое|еженевно|ежедневн|еженедельн|ежемесячн|по понедельник|по вторник|по средам|по четверг|по пятниц|раз в (день|неделю|месяц)/i;

async function hasScheduleInput(): Promise<boolean> {
  try {
    const core = await readCore();
    return allNodes(core.graph.nodes).some((n) => n.kind === "input" && n.state === "visible" && n.ioType === "cron");
  } catch {
    return true; // ядро недоступно — не берёмся судить и ничего не запрещаем
  }
}

export async function evolveBehavior(ctx: NodeCtx): Promise<NodeCtx> {
  const adj = await readAdjustment(ctx);
  if (!adj.behavior) return { behaviorEvolution: "no-signal" };
  const rule = adj.behavior;

  if (RECURRENCE.test(rule) && !(await hasScheduleInput())) {
    // Исход `no-change` — из объявленных: правило не записано. Причина отказа едет отдельным полем, чтобы
    // её было видно в прогоне и не пришлось гадать, почему инструкция не изменилась.
    return { behaviorEvolution: "no-change", behaviorRefused: rule };
  }

  let overflowed = "";
  const changed = await evolveAssistantData(
    (data) => {
      const current = String(data.instruction ?? "").trim();
      if (current.includes(rule)) return null; // правило уже стоит — писать нечего, и версии не будет
      const appended = current ? `${current} ${rule}` : rule;
      if (appended.length > INSTRUCTION_LIMIT) overflowed = appended;
      return { ...data, instruction: appended };
    },
    `behaviour rule added at the person's request: ${rule}`,
  );

  // Уплотнение — ВТОРЫМ проходом и только при переполнении: обычная правка его не оплачивает. Правило уже
  // записано выше, поэтому неудача сжатия ничего не теряет — текст просто останется длинным до следующего раза.
  if (changed && overflowed) {
    try {
      const shorter = await askModel({
        system:
          `Condense this assistant behaviour instruction to under ${INSTRUCTION_LIMIT} characters. Keep EVERY ` +
          `rule it states: merge overlapping ones, drop repetition and filler, never drop a rule. Same ` +
          `language as the original. Output the instruction only.`,
        user: overflowed,
        maxTokens: 700,
      });
      const tight = String(shorter ?? "").trim();
      if (tight && tight.length < overflowed.length) {
        await evolveAssistantData(
          (data) => ({ ...data, instruction: tight }),
          "behaviour instruction condensed: the same rules in fewer words",
        );
        return { behaviorEvolution: "condensed" };
      }
    } catch {
      /* П7: уплотнить не вышло — правило всё равно записано, прогон не страдает */
    }
  }
  return { behaviorEvolution: changed ? "adjusted" : "no-change" };
}
