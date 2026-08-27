// СЛОВА ШАГА 3 — ПРОВЕРКА СВЯЗИ (28-16, 2026-08-27).
//
// 🔒 ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ДОПИСКА В `_strings.ts`. У третьего шага НЕТ формы:
// его закрывает машина, а не человек, поэтому тип `StepStrings` с обязательным
// разделом `form` ему не годится. Втиснуть его туда значило бы завести у формы
// «пустой» вид — то есть сделать вид, что шаг чего-то ждёт от рук человека.
//
// 🔒 ТЕКСТ — ИЗ ЖИВОГО МАСТЕРА (`github.step3Title`, `github.step3Body`), а не
// сочинён мной. Владелец: «i give you new text for each»; здесь его слова уже
// существовали.

export type StepThreeStrings = {
  pageTitle: string;
  pageHint: string;
  badge: string;
  title: string;
  lead: string;
  info: string;
  important: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;
  cta: string;
  /** Честная строка о том, чего сейчас не хватает. */
  pendingTitle: string;
  pendingBody: string;
  pendingWhy: string;
};

const ru: StepThreeStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг третий · закрывает система",
  title: "Подключить и проверить",
  lead:
    "Подключение сразу спрашивает у GitHub, действительно ли эти данные достают до указанного репозитория.",
  info:
    "Зелёное состояние означает, что пришёл настоящий ответ от GitHub, а не то, что поля заполнены. Это и есть разница между «введено» и «проверено».",
  important:
    "Этот шаг нельзя закрыть галочкой «я это сделал». У панели нет способа поверить вам на слово: либо GitHub ответил, либо нет.",
  actionLead: "От вас на этом шаге не требуется ничего — только нажать проверку.",
  bullets: [
    "Проверяется адрес из первого шага вместе с токеном из второго",
    "Не примет GitHub — причина появится здесь же, а не позже при отправке",
    "Обычная причина отказа: у токена нет области repo либо адрес указывает не туда",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",
  cta: "Проверить связь",

  pendingTitle: "Проверка пока не подключена.",
  pendingBody:
    "Кнопка выключена намеренно: настоящая проверка спрашивает GitHub и записывает результат в состояние мастера, а трогать его до отдельного распоряжения нельзя.",
  pendingWhy:
    "Кнопка, показывающая «связь проверена» без вопроса к GitHub, была бы ложью о работе шага. Кнопка, всегда отвечающая отказом, — мёртвой. Поэтому она выключена и сказано почему.",
};

const en: StepThreeStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step three · closed by the system",
  title: "Connect and verify",
  lead:
    "Connecting asks GitHub straight away whether these credentials actually reach that repository.",
  info:
    "Green means a real answer came back from GitHub — not that the fields are filled in. That is the whole difference between «entered» and «verified».",
  important:
    "This step cannot be closed with an «I have done this» tick. The panel has no way to take your word for it: either GitHub answered, or it did not.",
  actionLead: "Nothing is required from you on this step — only pressing the check.",
  bullets: [
    "The address from step one is checked together with the token from step two",
    "If GitHub refuses, the reason appears right here, not later during the push",
    "The usual reason: the token lacks the repo scope, or the address points elsewhere",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",
  cta: "Verify the connection",

  pendingTitle: "The check is not wired up yet.",
  pendingBody:
    "The button is disabled on purpose: a real check asks GitHub and writes the result into the wizard's state, and that must not be touched without a separate instruction.",
  pendingWhy:
    "A button reporting «verified» without asking GitHub would be a lie about the step. A button always answering with a refusal would be dead. So it is disabled, and the reason is stated.",
};

const DICT: Record<string, StepThreeStrings> = { en, ru };

export function stepThreeStrings(lang: string): StepThreeStrings {
  return DICT[lang] ?? en;
}
