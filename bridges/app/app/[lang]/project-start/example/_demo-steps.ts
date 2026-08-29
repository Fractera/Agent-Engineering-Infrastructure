import type { ExampleStep, ExampleFlowLabels } from "./_components/example-flow.client";

// ЧЕТЫРЕ ШАГА СКЕЛЕТА — ЗАПОЛНИТЕЛИ, А НЕ ТЕКСТ ПРОДУКТА (28-3…28-5, 2026-08-27).
//
// 🔒 СЛОВА ПИШЕТ ВЛАДЕЛЕЦ. Решение 2026-08-27, дословно: «step by step together ,
// i give you new text for each». Поэтому здесь стоят служебные заполнители —
// «Заголовок второго уровня», «Описание шага», — и по ним сразу видно, что это
// не текст мастера. ✗ иначе моя выдумка незаметно становится текстом продукта:
// владелец увидит её на экране, привыкнет и не перепишет, а писал он другое.
//
// 🔒 ЗАЧЕМ ИМЕННО ЧЕТЫРЕ. Это те четыре действия, которые живой мастер сегодня
// требует внутри одного «шага 1 из 13»: адрес репозитория · токен доступа ·
// подключить и проверить · отправить проект. Владелец назвал это дефектом
// пути клиента: «it must to be 4 steps , not 1». Имена действий взяты из его
// же сообщения — это НЕ сочинённый текст, а цитата того, что уже есть в мастере.
//
// 🔒 ЧЕТВЁРТЫЙ ШАГ НАРОЧНО НЕПОЛНЫЙ. У него нет ни подсказок, ни списка — на нём
// проверяется закон «не данная сущность не рисует пустой контейнер». Без такого
// шага доказать это нечем: полная секция выглядит одинаково и когда сущность
// пропускается правильно, и когда она рисуется пустой рамкой.

const ACTION_RU = {
  successTitle: "Вы завершили шаг {n} из {total}",
  successHint: "Перейдёте к следующему шагу через несколько секунд",
  failureTitle: "Шаг не закрыт",
  failureFix: "Здесь будет сказано, что именно нужно сделать, чтобы он закрылся",
  outcomeLabel: "Только на образце — какой исход показать:",
  outcomeSuccess: "удача",
  outcomeFailure: "отказ",
};

const ACTION_EN = {
  successTitle: "You finished step {n} of {total}",
  successHint: "You will move to the next step in a few seconds",
  failureTitle: "The step is not closed",
  failureFix: "This line will say exactly what to do so that it closes",
  outcomeLabel: "Sample only — which outcome to show:",
  outcomeSuccess: "success",
  outcomeFailure: "failure",
};

const ru: ExampleStep[] = [
  {
    badge: "Область бейджа",
    title: "Адрес репозитория",
    lead: "Описание заголовка второго уровня — одна-две строки о том, что это за шаг.",
    info: "Голубая подсказка: то, что полезно знать до действия. Здесь стоит заполнитель.",
    important: "Оранжевая подсказка: то, чем можно навредить себе. Здесь стоит заполнитель.",
    actionLead: "Описание для действия — что человек сделает руками прямо сейчас.",
    bullets: [
      "Пункт немаркированного списка — первый",
      "Пункт немаркированного списка — второй",
      "Пункт немаркированного списка — третий",
    ],
    action: {
      inputLabel: "Подпись поля",
      inputPlaceholder: "значение, которое ждёт шаг",
      cta: "Единственная кнопка шага",
      ...ACTION_RU,
    },
  },
  {
    badge: "Область бейджа",
    title: "Токен доступа",
    lead: "Шаг с полем и галочкой сразу: кнопка загорается от любого из двух.",
    info: "Голубая подсказка: заполнитель.",
    actionLead: "Описание для действия — заполнитель.",
    action: {
      inputLabel: "Подпись поля",
      inputPlaceholder: "значение, которое ждёт шаг",
      checkLabel: "Я это сделал",
      cta: "Единственная кнопка шага",
      ...ACTION_RU,
    },
  },
  {
    badge: "Область бейджа",
    title: "Подключить и проверить",
    lead: "Шаг только с галочкой: поля у него нет вовсе, и пустого поля не рисуется.",
    important: "Оранжевая подсказка: заполнитель.",
    actionLead: "Описание для действия — заполнитель.",
    action: {
      checkLabel: "Я это сделал",
      cta: "Единственная кнопка шага",
      ...ACTION_RU,
    },
  },
  {
    title: "Отправить проект в GitHub",
    lead: "Нарочно неполный шаг: ни бейджа, ни подсказок, ни списка — проверка закона «не данная сущность не рисует пустой контейнер».",
    action: {
      checkLabel: "Я это сделал",
      cta: "Единственная кнопка шага",
      ...ACTION_RU,
    },
  },
];

const en: ExampleStep[] = [
  {
    badge: "Badge area",
    title: "Repository address",
    lead: "Second-level heading description — a line or two about what this step is.",
    info: "Blue hint: what is useful to know before acting. A placeholder stands here.",
    important: "Amber hint: what you can hurt yourself with. A placeholder stands here.",
    actionLead: "Action description — what the person will do by hand right now.",
    bullets: [
      "Unordered list item — first",
      "Unordered list item — second",
      "Unordered list item — third",
    ],
    action: {
      inputLabel: "Field label",
      inputPlaceholder: "the value this step expects",
      cta: "The single button of the step",
      ...ACTION_EN,
    },
  },
  {
    badge: "Badge area",
    title: "Access token",
    lead: "A step with both a field and a checkbox: either one lights the button.",
    info: "Blue hint: placeholder.",
    actionLead: "Action description — placeholder.",
    action: {
      inputLabel: "Field label",
      inputPlaceholder: "the value this step expects",
      checkLabel: "I have done this",
      cta: "The single button of the step",
      ...ACTION_EN,
    },
  },
  {
    badge: "Badge area",
    title: "Connect and verify",
    lead: "A checkbox-only step: it has no field at all, and no empty field is drawn.",
    important: "Amber hint: placeholder.",
    actionLead: "Action description — placeholder.",
    action: {
      checkLabel: "I have done this",
      cta: "The single button of the step",
      ...ACTION_EN,
    },
  },
  {
    title: "Push the project to GitHub",
    lead: "Deliberately incomplete: no badge, no hints, no list — this is the check of the law that a missing entity draws no empty container.",
    action: {
      checkLabel: "I have done this",
      cta: "The single button of the step",
      ...ACTION_EN,
    },
  },
];

const FLOW_RU: ExampleFlowLabels = {
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",
  progress: "Пройдено {n} из {total}",
  restart: "начать образец заново",
  finished: "Пройдены все шаги образца. Отметка «завершён» стоит справа сверху.",
};

const FLOW_EN: ExampleFlowLabels = {
  stepOf: "Step {n} of {total}",
  done: "Step finished",
  progress: "{n} of {total} done",
  restart: "restart the sample",
  finished: "All sample steps are done. The «finished» mark sits at the top right.",
};

const STEPS: Record<string, ExampleStep[]> = { en, ru };
const FLOW: Record<string, ExampleFlowLabels> = { en: FLOW_EN, ru: FLOW_RU };

export function exampleSteps(lang: string): ExampleStep[] {
  return STEPS[lang] ?? en;
}

export function exampleFlowLabels(lang: string): ExampleFlowLabels {
  return FLOW[lang] ?? FLOW_EN;
}
