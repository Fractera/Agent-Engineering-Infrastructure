// ФУНКЦИЯ УЗЛА «TRANSFORM» (середина) — ПОКРЫВАЕТ ЛИ СБОРКА ТО, О ЧЁМ ПРОСЯТ (шаг 314, вектор 2).
//
// 🔴 ПОЧЕМУ ЭТО СЕРЕДИНА, А НЕ ЭВОЛЮЦИЯ. Слой эволюции по закону портов стоит ПОСЛЕ выхода: когда он
// работает, речь уже сказала своё. Значит вопрос, заданный оттуда, человеку не уйдёт — он услышит его
// только следующим сообщением, которого не будет. Уточняющий диалог обязан начаться ДО речи, а середина —
// единственное место перед ней. Эволюции остаётся её собственная работа: записать пробел в журнал и (когда
// человек ответит) превратить просьбу в кейс.
//
// 🔒 ОДИН РАЗБОР НА ПРОГОН. Этот узел зовёт `readAdjustment` ПЕРВЫМ и платит за модельный вызов; слой
// эволюции получит тот же разбор из кэша по `runId` бесплатно. Возможности выводятся из ядра здесь же —
// без них модель не может судить, что «вне сборки», и пробел не находится вовсе (доказано живьём).
//
// 🔒 ЦЕПОЧКА, А НЕ ТУПИК. Просьба о невозможном больше не заканчивается вежливым отказом: узел задаёт ОДИН
// вопрос о сценарии и придерживает просьбу в плоскости диалога. Ответ на него превращается в КЕЙС — первый
// этап рождения любой способности в этом продукте.
// Имя `checkCoverage` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { readCore, writeCore } from "../core-io";
import { abilitiesBrief, abilitiesOf } from "../components/conversation/abilities";
import { readAdjustment } from "../components/conversation/adjustment";

const cuid = () => `cuc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * ЗВЕНО 3 — ТРЕБОВАНИЕ СТАНОВИТСЯ КЕЙСОМ. Кейс, а не «создай мне узел»: в этом продукте пользовательский
 * сценарий — ПЕРВЫЙ этап рождения любой способности, и обойти его значит строить вслепую.
 *
 * 🔒 ПОДПИСЬ РЕВЬЮ СБРАСЫВАЕТСЯ. Набор кейсов изменился, значит прежнее «я прочитал и подтверждаю»
 * владельца больше не действует (ревью-гейт шага 231). Статус `new`: ассистент довёл до двери, открывает
 * её владелец.
 */
async function writeUseCase(title: string, text: string): Promise<number> {
  const core = await readCore();
  const cases = core.useCases.cases;
  const number = cases.reduce((m, c) => Math.max(m, c.number), 0) + 1;
  cases.push({ cuid: cuid(), number, title: title.slice(0, 120), text: text.slice(0, 2000), status: "new" });
  core.useCases.reviewedSignature = "";
  const result = await writeCore(core);
  return result.ok ? number : 0;
}

export async function checkCoverage(ctx: NodeCtx): Promise<NodeCtx> {
  // ЗВЕНО 2, вторая половина: человек ответил на наш же уточняющий вопрос — сценарий стал достаточно
  // подробным, и просьба превращается в кейс. Ответ приносит класс «продолжение» (`answerTo`).
  const answerTo = ctx.answerTo as { kind?: string; payload?: { asked?: string } } | undefined;
  if (answerTo?.kind === "capability-gap" && answerTo.payload?.asked) {
    const asked = String(answerTo.payload.asked);
    const detail = String(ctx.answerText ?? ctx.text ?? "").trim();
    const number = await writeUseCase(asked, `${asked}\n\nIn the person's own words: ${detail}`);
    if (!number) return { coverage: "not-asked" }; // ядро отказало — молчим, ответ человеку важнее
    return {
      coverage: "case-written",
      caseNumber: number,
      // ЗВЕНО 4–5: речь зовёт владельца и честно называет цену. Адрес выведен из прогона, не выдуман.
      speechAct: "invite-owner",
      speechAbout: `case #${number}: ${asked}`,
    };
  }

  // 🔒 ЧЕЛОВЕК ВЫБРАЛ ЗАДАЧУ ИЗ СПИСКА — ПРОВЕРЯТЬ НЕЧЕГО (доктрина масштаба). Он нажал кнопку кейса,
  // то есть выбрал из того, что автоматизация УМЕЕТ: пробела здесь быть не может по построению. Значит
  // модельный вызов не нужен вовсе — выбор из списка делает прогон и точнее, и дешевле. Это и есть
  // причина, по которой список стал главным путём, а разбор прозы — запасным.
  if (String(ctx.taskCase ?? "").trim()) return { coverage: "covered" };

  // Смотрим только туда, где просьба вообще может быть: остальные прогоны эволюции не касаются, и платить
  // за них нельзя (тот же гейт, что внутри `readAdjustment`).
  const cls = String(ctx.intentClass ?? "");
  if (cls !== "control" && cls !== "unclaimed") return { coverage: "not-asked" };

  let facts = "";
  try {
    facts = abilitiesBrief(abilitiesOf(await readCore()));
  } catch {
    return { coverage: "not-asked" }; // ядро недоступно — судить не о чем, прогон продолжается
  }

  // Возможности кладём в контекст ДО разбора: `readAdjustment` читает их оттуда, а слой эволюции получит
  // и разбор, и факты уже готовыми.
  const adj = await readAdjustment({ ...ctx, abilitiesFacts: facts });
  if (!adj.gap) return { coverage: "covered", abilitiesFacts: facts };

  // Придерживаем просьбу и спрашиваем ОДИН уточняющий вопрос. Висящий вопрос переживает прогон — ровно та
  // ось, ради которой строилась плоскость диалога (312.3), и ровно то, что делает класс «продолжение»
  // способным подхватить ответ.
  return {
    coverage: "gap",
    abilitiesFacts: facts,
    pendingQuestion: { kind: "capability-gap", at: new Date().toISOString(), payload: { asked: adj.gap } },
    speechAct: "ask-scenario",
    speechAbout: adj.gap,
  };
}
