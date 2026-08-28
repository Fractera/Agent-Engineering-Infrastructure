// СЛОВА ШАГА 8 — ЗАПУСК НА ЛОКАЛЬНОЙ МАШИНЕ (28-28, 2026-08-28).
//
// 🔒 ЭТОТ ШАГ ОТМЕНЯЕТ ЦЕЛУЮ ВЕРЕНИЦУ СТАРЫХ. Владелец, дословно: «у нас
// бесконечное количество глупых действий было создано на следующих шагах…
// сначала вставить репозиторий, развернуть проект, потом добавить ключи
// безопасности, при этом ключи безопасности, для того чтобы получить, нужно было
// идти в соседнюю вкладку и ещё множество дополнительных шагов — это полная
// чушь. Сейчас переменные окружения уже содержат в себе не только ключи, но и
// адрес GitHub-репозитория».
//
// Он прав, и это проверяется в коде: `api/config/env-export` кладёт в один файл
// адрес слоя данных с точки зрения ПРИНИМАЮЩЕЙ машины, ключ данных, ключ
// развёртывания, приватный ключ доступа к серверу и все прочие переменные слота —
// включая `USER_GITHUB_REPO_URL`. Значит человеку нечего собирать по вкладкам:
// одна кнопка отдаёт всё, и одна подсказка объясняет агенту, что с этим делать.
//
// 🔒 ТЕКСТ ПОДСКАЗКИ — СМЫСЛ ВЛАДЕЛЬЦА, ФОРМУЛИРОВКА МОЯ, по его прямой просьбе
// «все используемые здесь тексты нужно оптимизировать». Продиктованный вариант
// содержал распознанные голосом обрывки («Local хост», «репетиторе»), которые
// уехали бы в продукт дословно.
//
// 🔒 ПОРЯДОК ФРАЗ В ПОДСКАЗКЕ НЕ СЛУЧАЕН: сначала откуда брать (окружение), потом
// что сделать (склонировать, поставить, запустить), потом чем закончить (ответить
// адресом). Последнее предложение — единственный способ человека убедиться, что
// агент дошёл до конца, а не остановился на установке.

export type StepEightStrings = {
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

  /** Кнопка выдачи окружения и её нетающий тост. */
  grabLabel: string;
  grabToastTitle: string;
  grabToastBody: string;
  grabFailure: string;

  /** Блок с подсказкой для агента. */
  promptLead: string;
  promptText: string;
  copyLabel: string;
  copiedLabel: string;
  copyToast: string;

  checkLabel: string;
  cta: string;
  busy: string;
  successTitle: string;
  successHint: string;
  failureTitle: string;
  failureFix: string;
  goPrev: string;
  goNext: string;
  replace: string;
};

/**
 * Голубая подсказка про разницу «локально против опубликованного».
 *
 * 🔒 АДРЕС ПОДСТАВЛЯЕТСЯ ЖИВОЙ, А НЕ ВЫДУМАННЫЙ, и режим определяет сервер:
 * защищённый — домен, иначе IP с портом. Написать здесь «ваш домен» вообще —
 * значит заставить человека угадывать, о чём речь; написать неверный режим —
 * пообещать `https://` тому, кто работает по IP.
 */
export function localVsPublic(lang: string, siteUrl: string | null): string {
  const ru = siteUrl
    ? `Проект на localhost:3000 живёт только на вашей машине — интернет о нём не знает. По адресу ${siteUrl} по-прежнему открывается то, что развёрнуто на сервере, и ваши изменения туда пока не попали. Чтобы попали, нужна сборка проекта — это следующий шаг.`
    : `Проект на localhost:3000 живёт только на вашей машине — интернет о нём не знает. На сервере по-прежнему работает то, что развёрнуто раньше, и ваши изменения туда пока не попали. Чтобы попали, нужна сборка проекта — это следующий шаг.`;
  const en = siteUrl
    ? `The project on localhost:3000 lives on your machine only — the internet knows nothing about it. At ${siteUrl} people still see what is deployed on the server, and your changes have not reached it yet. Getting them there takes a build — that is the next step.`
    : `The project on localhost:3000 lives on your machine only — the internet knows nothing about it. The server still serves what was deployed earlier, and your changes have not reached it yet. Getting them there takes a build — that is the next step.`;
  return lang === "ru" ? ru : en;
}

const PROMPT_RU = `Создай проект из GitHub-репозитория. Его адрес и все нужные ключи лежат в переменных окружения, которые я тебе передал файлом.

Склонируй проект на эту машину, положи переменные окружения в корень проекта, установи зависимости и запусти проект на localhost:3000. Если порт занят — останови процесс, который его держит, и запусти снова.

Когда всё поднимется, ответь одной строкой: по какому адресу открыть проект в браузере.`;

const PROMPT_EN = `Create the project from the GitHub repository. Its address and every key you need are in the environment variables I handed you as a file.

Clone the project onto this machine, put the environment file in the project root, install the dependencies and start the project on localhost:3000. If the port is taken, stop whatever holds it and start again.

When everything is up, answer in one line: which address opens the project in a browser.`;

const ru: StepEightStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг восьмой",
  title: "Запуск на локальной машине",
  lead:
    "Чтобы проект заработал у вас, агенту нужны две вещи: переменные окружения и одна подсказка. Обе — здесь, на этой странице.",
  info: "",
  important:
    "Файл окружения не выкладывайте в открытый доступ и не отправляйте в GitHub: в нём ключ к вашим данным и ключ доступа к серверу. В проекте он уже закрыт от отправки, поэтому просто оставьте его там, куда положит агент.",
  actionLead:
    "Заберите окружение, отдайте агенту подсказку — и отметьте галочку, когда увидите проект в браузере.",
  bullets: [
    "Кнопка ниже отдаёт файл со всеми ключами и адресом вашего репозитория",
    "Подсказку скопируйте целиком — в ней сказано и что сделать, и чем закончить",
    "Собирать что-либо по другим вкладкам не нужно: всё нужное уже в файле",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",

  grabLabel: "Забрать переменные окружения",
  grabToastTitle: "Файл окружения у вас",
  grabToastBody:
    "Откройте Claude Code, перетащите скачанный файл прямо в поле ввода — и следом вставьте подсказку с этой страницы.",
  grabFailure: "Не удалось выдать файл окружения",

  promptLead: "Подсказка для агента — скопируйте её целиком:",
  promptText: PROMPT_RU,
  copyLabel: "Скопировать",
  copiedLabel: "Скопировано",
  copyToast: "Подсказка скопирована",

  checkLabel: "Я выполнил все действия и увидел проект в браузере на localhost:3000",
  cta: "Отметить шаг пройденным",
  busy: "Сохраняем…",
  successTitle: "Вы завершили шаг {n} из {total}",
  successHint: "Следующий шаг появится здесь, когда будет построен",
  failureTitle: "Отметку не удалось сохранить",
  failureFix: "Попробуйте ещё раз; если повторится — сообщите нам",
  goPrev: "К предыдущему шагу",
  goNext: "К следующему шагу",
  replace: "Изменить отметку",
};

const en: StepEightStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step eight",
  title: "Run it on your machine",
  lead:
    "To get the project running on your side the agent needs two things: the environment variables and one prompt. Both are on this page.",
  info: "",
  important:
    "Never publish the environment file or send it to GitHub: it holds the key to your data and the access key to your server. The project already keeps it out of commits, so simply leave it where the agent puts it.",
  actionLead:
    "Take the environment, hand the agent the prompt — and tick the box once you see the project in a browser.",
  bullets: [
    "The button below hands you a file with every key and your repository address",
    "Copy the prompt whole — it says both what to do and how to finish",
    "Nothing has to be collected from other tabs: it is all in that one file",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",

  grabLabel: "Take the environment variables",
  grabToastTitle: "The environment file is yours",
  grabToastBody:
    "Open Claude Code, drag the downloaded file straight into the input field — then paste the prompt from this page.",
  grabFailure: "The environment file could not be issued",

  promptLead: "The prompt for your agent — copy it whole:",
  promptText: PROMPT_EN,
  copyLabel: "Copy",
  copiedLabel: "Copied",
  copyToast: "The prompt is copied",

  checkLabel: "I did everything and saw the project in a browser on localhost:3000",
  cta: "Mark the step as done",
  busy: "Saving…",
  successTitle: "You finished step {n} of {total}",
  successHint: "The next step will appear here once it is built",
  failureTitle: "The mark could not be saved",
  failureFix: "Try again; if it repeats, tell us",
  goPrev: "To the previous step",
  goNext: "To the next step",
  replace: "Change the mark",
};

const DICT: Record<string, StepEightStrings> = { en, ru };

export function stepEightStrings(lang: string): StepEightStrings {
  return DICT[lang] ?? en;
}
