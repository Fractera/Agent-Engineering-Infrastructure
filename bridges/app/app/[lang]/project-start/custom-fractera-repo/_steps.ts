import { adminHref } from "@/lib/admin-nav";
import {
  flowDone, flowMarked, flowVerified, flowPushed, flowAdopted,
} from "@/lib/launch-flow";
import { TAIL_STEPS } from "../_shared/tail-steps";
import { ADOPT_BUILT_STEPS, adoptStepOneStrings } from "./_strings";
import { adoptStepTwoStrings } from "./_step2";
import { adoptStepThreeStrings } from "./_step3";
import { adoptStepFourStrings } from "./_step4";
import { adoptStepFiveStrings } from "./_step5";
import { adoptStepSixStrings } from "./_step6";
import { adoptStepSevenStrings } from "./_step7";

// ПЕРЕЧИСЛЕНИЕ ШАГОВ ВТОРОГО ПУТИ И ЗАЩИТА ОТ ПРЫЖКА (35-6, 2026-08-31).
//
// 🔒 ОБЕЩАНО В 35-1 И ОТДАНО ЗДЕСЬ. Тогда защиты не было намеренно: она читает
// перечисление шагов пути, а построен был один шаг, и прыгать было некуда.
// Теперь построено двенадцать — без защиты человек попадал бы на двенадцатый,
// не сделав ничего, и читал бы это как поломку.
//
// 🔒 ПОРЯДОК ЗДЕСЬ, А ЗНАЧЕНИЯ — В `launch-flow.ts`. Там живёт, ЧТО хранится;
// здесь — В КАКОМ ПОРЯДКЕ путь это спрашивает. У первого пути свой такой файл, и
// порядок у них разный: второй начинает с чужого проекта, первый — со своего
// пустого репозитория.
//
// 🔒 ХВОСТ ЗАКРЫВАЕТСЯ ТЕМИ ЖЕ ОТМЕТКАМИ, ЧТО У ПЕРВОГО ПУТИ, И ЭТО РЕШЕНИЕ, А
// НЕ НЕДОСМОТР. «Claude Code поставлен», «папка заведена», «проект открылся на
// localhost» — факты о МАШИНЕ ЧЕЛОВЕКА, а не о пути: человек ставит Claude Code
// один раз, каким бы путём он ни шёл. Заводить вторую отметку значило бы
// спросить его дважды об одном и том же и объявить незакрытым то, что он уже
// сделал. Отличается это от репозитория и токена, которые у путей РАЗНЫЕ по
// существу, — и потому у тех ключи свои.

export type AdoptStep = { n: number; slug: string; title: string; done: boolean };

/** Заголовки берутся у самих шагов — второй список названий разошёлся бы с первым. */
export function adoptSteps(lang: string): AdoptStep[] {
  // 🔒 ЗАГОЛОВОК БЕРЁТСЯ У САМОГО ШАГА. Второй список названий разошёлся бы с
  // первым — и разошёлся бы в том, который реже открывают.
  const tail = TAIL_STEPS.map((t) => t.strings(lang).title);

  const all: AdoptStep[] = [
    // 1–3: свой проект в слоте. 4–5: сохранённое значение. 6: ответ GitHub.
    // 7: коммит на удалённой `main`. 8–12: отметки человека (общий хвост).
    { n: 1, slug: "step-1", title: adoptStepOneStrings(lang).title, done: flowDone("donor-url") },
    { n: 2, slug: "step-2", title: adoptStepTwoStrings(lang).title, done: flowAdopted() },
    { n: 3, slug: "step-3", title: adoptStepThreeStrings(lang).title, done: flowMarked("adopt-live-seen") },
    { n: 4, slug: "step-4", title: adoptStepFourStrings(lang).title, done: flowDone("adopt-repo-url") },
    { n: 5, slug: "step-5", title: adoptStepFiveStrings(lang).title, done: flowDone("adopt-token") },
    { n: 6, slug: "step-6", title: adoptStepSixStrings(lang).title, done: flowVerified("adopt") },
    { n: 7, slug: "step-7", title: adoptStepSevenStrings(lang).title, done: flowPushed("adopt") },
    ...tail.map((title, i) => ({
      n: 8 + i,
      slug: `step-${8 + i}`,
      title,
      done: flowMarked(TAIL_STEPS[i].mark),
    })),
  ];

  // Карта показывает то, что ПОСТРОЕНО, а не то, что задумано.
  return all.filter((s) => ADOPT_BUILT_STEPS.includes(s.n));
}

/**
 * Открыт ли шаг: закрыты все предыдущие.
 *
 * 🔒 ПРОЙДЕННЫЙ ШАГ ОСТАЁТСЯ ОТКРЫТЫМ. Вернуться и заменить значение человек
 * вправе (28-18); запертая дорога назад превратила бы путь в допрос.
 */
export function adoptStepOpen(steps: AdoptStep[], n: number): boolean {
  return steps.filter((s) => s.n < n).every((s) => s.done);
}

/** Первый незакрытый шаг — туда и возвращают забредшего вперёд. */
export function adoptCurrentStep(steps: AdoptStep[]): AdoptStep | undefined {
  return steps.find((s) => !s.done);
}

export type AdoptLocked = { message: string; backHref: string; backLabel: string };

const LOCKED: Record<string, { message: string; back: string }> = {
  en: {
    message: "This step is not open yet: step {n} comes first.",
    back: "Go to step {n}",
  },
  ru: {
    message: "Этот шаг ещё не открыт: сначала шаг {n}.",
    back: "Перейти к шагу {n}",
  },
};

/**
 * Решение о запрете для шага `n`, готовое к передаче в страницу.
 *
 * 🔒 ОДНА ФУНКЦИЯ НА ВСЕ ДВЕНАДЦАТЬ СТРАНИЦ. Двенадцать одинаковых блоков
 * разъехались бы — это уже замерено на анатомии шага (28-2, 28-20).
 */
export function adoptLockedFor(lang: string, n: number): AdoptLocked | null {
  const steps = adoptSteps(lang);
  if (adoptStepOpen(steps, n)) return null;

  const back = adoptCurrentStep(steps);
  const backN = back ? back.n : 1;
  const w = LOCKED[lang] ?? LOCKED.en;
  return {
    message: w.message.replace("{n}", String(backN)),
    backHref: `${adminHref(lang, "project-start")}/custom-fractera-repo/step-${backN}`,
    backLabel: w.back.replace("{n}", String(backN)),
  };
}
