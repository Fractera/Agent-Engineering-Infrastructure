// СЛОВА ШАГА 9 — ПРОЕКТ ЗАПУЩЕН И ВИДЕН НА LOCALHOST:3000 (28-30, 2026-08-28).
//
// 🔒 ВТОРАЯ ПОЛОВИНА РАЗРЕЗАННОГО ВОСЬМОГО ШАГА. Владелец, дословно 2026-08-28:
// «а уже следующий шаг ты перенесешь информацию о том что такое локалхост 3000
// который находится в карточке этого шага… Для завершения следующего шага нужно
// будет отметить чекбокс я вижу такой же проект».
//
// 🔒 ГОЛУБАЯ ПОДСКАЗКА ПЕРЕЕХАЛА СЮДА ЦЕЛИКОМ, А НЕ СКОПИРОВАЛАСЬ. На восьмом
// шаге её больше нет: объяснять разницу локального и опубликованного адреса,
// пока проект не поднят, нечему. Две копии одного текста разошлись бы на первой
// же правке, и человек прочёл бы разное на соседних страницах.
//
// 🔒 ЗДЕСЬ НЕТ КНОПКИ ВЫДАЧИ ОКРУЖЕНИЯ, И ЭТО НЕ ЗАБЫВЧИВОСТЬ. Файл человек
// забрал на восьмом шаге; вторая такая же кнопка означала бы, что первая чего-то
// не отдала, и заставила бы скачивать ключи дважды без причины.
//
// 🔒 ПОДСКАЗКА НАЧИНАЕТСЯ С ТОГО, ЧЕМ КОНЧИЛСЯ ВОСЬМОЙ ШАГ. Агент к этому моменту
// уже стоит в папке проекта с установленными зависимостями, и просить его
// «создай проект» заново значило бы получить второй клон рядом с первым.
//
// 🔒 ЗАНЯТЫЙ ПОРТ НАЗВАН В ПОДСКАЗКЕ ЯВНО. Это самая частая осечка запуска: на
// 3000 уже висит чужой процесс, проект молча уезжает на 3001, и человек,
// открывший localhost:3000, видит чужое приложение и решает, что всё сломано.

export type StepNineStrings = {
  pageTitle: string;
  pageHint: string;
  badge: string;
  title: string;
  lead: string;
  important: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;

  /** Снимок: что на нём (для читалки) и чей это экран (подпись). */
  shotAlt: string;
  shotCaption: string;

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
};

/**
 * Голубая подсказка: чем локальный просмотр отличается от опубликованного.
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

const PROMPT_RU = `Запусти проект, который ты только что подготовил, на localhost:3000.

Если порт 3000 занят — останови процесс, который его держит, и запусти снова. Проект должен открываться именно на 3000, а не на соседнем порту.

Когда всё поднимется, ответь одной строкой: по какому адресу открыть проект в браузере.`;

const PROMPT_EN = `Start the project you have just prepared on localhost:3000.

If port 3000 is taken, stop whatever holds it and start again. The project has to open on 3000 itself, not on a neighbouring port.

When everything is up, answer in one line: which address opens the project in a browser.`;

const ru: StepNineStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг девятый",
  title: "Проект открывается у вас в браузере",
  lead:
    "Материалы привезены — пора посмотреть на дом. Агент поднимает проект на вашей машине, вы открываете адрес и сверяете картинку со снимком ниже.",
  important:
    "Пока окно с запущенным проектом открыто, он работает. Закроете его или выключите машину — адрес перестанет отвечать, и это нормально: проект живёт на вашем компьютере, а не в интернете.",
  actionLead:
    "Отдайте агенту подсказку, дождитесь адреса — и отметьте галочку, когда увидите такую же страницу.",
  bullets: [
    "Первый запуск идёт дольше остальных: проект собирается на ходу",
    "Агент может снова попросить разрешение — разрешите так же, как на прошлом шаге",
    "Открывать нужно именно localhost:3000; если агент назвал другой адрес — значит порт был занят",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",

  shotAlt:
    "Браузер, открытый на localhost:3000. Страница показывает шапку с меню, крупный заголовок «Это стартер вашего приложения» и снимок панели ниже — это и есть только что запущенный проект.",
  shotCaption:
    "Так выглядит запущенный проект на вашей машине. Заголовок и первый экран должны совпасть; ваш язык и содержимое могут отличаться.",

  promptLead: "Подсказка для агента — скопируйте её целиком:",
  promptText: PROMPT_RU,
  copyLabel: "Скопировать",
  copiedLabel: "Скопировано",
  copyToast: "Подсказка скопирована",

  checkLabel: "Я вижу такой же проект",
  cta: "Отметить шаг пройденным",
  busy: "Сохраняем…",
  successTitle: "Вы завершили шаг {n} из {total}",
  successHint: "Следующий шаг появится здесь, когда будет построен",
  failureTitle: "Отметку не удалось сохранить",
  failureFix: "Попробуйте ещё раз; если повторится — сообщите нам",
  goPrev: "К предыдущему шагу",
  goNext: "К следующему шагу",
};

const en: StepNineStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step nine",
  title: "The project opens in your browser",
  lead:
    "The materials are delivered — time to look at the house. The agent starts the project on your machine, you open the address and compare what you see with the shot below.",
  important:
    "The project runs as long as that window stays open. Close it or switch the machine off and the address stops answering — that is normal: the project lives on your computer, not on the internet.",
  actionLead:
    "Hand the agent the prompt, wait for the address — and tick the box once you see the same page.",
  bullets: [
    "The first start takes longer than the rest: the project is being built on the fly",
    "The agent may ask for permission again — allow it the same way as on the previous step",
    "Open localhost:3000 itself; if the agent named another address, the port was taken",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",

  shotAlt:
    "A browser open at localhost:3000. The page shows a header with a menu, a large heading that reads \"This is your application starter\" and a screenshot of the panel below — this is the project that has just been started.",
  shotCaption:
    "This is what the running project looks like on your machine. The heading and the first screen should match; your language and content may differ.",

  promptLead: "The prompt for your agent — copy it whole:",
  promptText: PROMPT_EN,
  copyLabel: "Copy",
  copiedLabel: "Copied",
  copyToast: "The prompt is copied",

  checkLabel: "I see the same project",
  cta: "Mark the step as done",
  busy: "Saving…",
  successTitle: "You finished step {n} of {total}",
  successHint: "The next step will appear here once it is built",
  failureTitle: "The mark could not be saved",
  failureFix: "Try again; if it repeats, tell us",
  goPrev: "To the previous step",
  goNext: "To the next step",
};

const DICT: Record<string, StepNineStrings> = { en, ru };

export function stepNineStrings(lang: string): StepNineStrings {
  return DICT[lang] ?? en;
}
