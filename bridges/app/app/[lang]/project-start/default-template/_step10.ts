// СЛОВА ШАГА 10 — ПЕРВОЕ ИЗМЕНЕНИЕ И РАЗВЁРТЫВАНИЕ В ИНТЕРНЕТ (28-31, 2026-08-29).
//
// 🔒 ПОСЛЕДНИЙ РАБОЧИЙ ШАГ ПУТИ. Владелец, дословно 2026-08-29: «реально
// связанные с разработкой это будет последний шаг»; одиннадцатый — прощание и
// пара советов. Поэтому здесь путь не обрывается на полуслове, а закрывает круг:
// проект, который до этого жил на машине человека, впервые становится виден
// посторонним.
//
// 🔒 ДВА ПОРУЧЕНИЯ В ОДНОЙ ПОДСКАЗКЕ — ЭТО НЕ НАРУШЕНИЕ ЗАКОНА «ОДНО ДЕЙСТВИЕ НА
// ШАГ». Закон считает действия ЧЕЛОВЕКА, а не строки внутри подсказки: человек
// делает ровно одно — отдаёт агенту текст. Разрезать очистку и развёртывание на
// два шага значило бы оставить его между ними с пустой главной страницей,
// которую никто не видит, — то есть с половиной результата и без повода понять,
// зачем он её очищал. Требование владельца прямое: «команда которая скопирует
// пользователь должна будет содержать в себе команду разверни это на моем
// сервере».
//
// 🔒 ФРАЗА РАЗВЁРТЫВАНИЯ НАЗВАНА ДОСЛОВНО И ПОВТОРЕНА ДВАЖДЫ — в голубой
// подсказке и в самом тексте для агента. Это не избыточность: подсказка
// объясняет, ЧТО эта фраза делает, а текст её ПРИМЕНЯЕТ. Человек, прочитавший
// объяснение и увидевший ту же фразу в подсказке, узнаёт её в лицо и сможет
// повторить развёртывание завтра, уже без мастера. Ради этого шаг и написан.
//
// 🔒 ПОЧЕМУ РАЗВЁРТЫВАНИЕ ОБЪЯСНЯЕТСЯ СЛОВАМИ, А НЕ УПОМИНАЕТСЯ. Владелец:
// «Объяснить как это работает нужно потому что раньше мы объясняли о том что
// такое Local host … о том что такое NPM инстал». Путь ни разу не оставил
// незнакомое слово без объяснения, и оборвать эту привычку на последнем шаге
// значит оставить человека наедине с самым важным словом из всех.
//
// 🔒 ЗДЕСЬ НЕТ МАШИННОЙ ПРОВЕРКИ, И ЭТО ЧЕСТНОСТЬ, А НЕ ЛЕНЬ. Панель не видит ни
// машины человека, ни того, что он открыл в браузере; спросить неоткуда, значит
// закрывает шаг он сам, и отметка снимаемая. Нарисовать зелёное от имени панели
// значило бы поздравить его с развёртыванием, которого могло не быть, — ✗ ровно
// этим оплачен шаг 25.

export type StepTenStrings = {
  pageTitle: string;
  pageHint: string;
  badge: string;
  title: string;
  lead: string;
  important: string;
  danger: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;

  /** Подпись ссылки-действия: слово, стоящее перед адресом. */
  linkLabel: string;

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

// 🔒 ТЕКСТ ПОДСКАЗКИ — ПОРУЧЕНИЕ, А НЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ. Отступ назван цифрой
// (владелец: «с отступом 200 пикселей от верха»), надпись — дословно, всё
// остальное сказано отрицанием: «больше ничего». Описывать агенту разметку и
// классы значило бы писать за него код в поле, которое человек копирует не
// читая.
const PROMPT_RU = `Очисти главную страницу проекта полностью: убери с неё всё содержимое и весь дизайн.

Оставь на ней одну надпись — Hello Fractera. Крупным шрифтом, с отступом 200 пикселей от верха страницы. Больше на главной странице не должно быть ничего.

Остальные страницы, настройки и данные проекта не трогай.

Затем запусти развёртывание на моём сервере. Когда оно закончится, ответь одной строкой: по какому адресу открывать проект в интернете.`;

const PROMPT_EN = `Clear the project home page completely: remove all of its content and all of its design.

Leave one line on it — Hello Fractera. In a large font, with a 200 pixel offset from the top of the page. Nothing else belongs on the home page.

Do not touch the other pages, the settings or the project data.

Then deploy this to my server. When it is done, answer in one line: which address opens the project on the internet.`;

const ru: StepTenStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг десятый",
  title: "Первое изменение — и оно уезжает в интернет",
  lead:
    "Всё готово к работе, и мы приступаем к разработке. Сейчас вы сделаете первое изменение руками агента и тем же поручением отправите его на свой сервер: главная страница станет чистым листом с надписью Hello Fractera, и ровно так её увидят в интернете.",
  important:
    "Главная страница будет очищена намеренно: это чистый лист, с которого начинается ваш проект, а не потеря. Всё остальное остаётся на месте — панель управления, слой данных, авторизация, ваши настройки. С этой пустой страницы вы и начнёте проектировать своё предложение.",
  danger:
    "После развёртывания стартовый экран Fractera по вашему адресу больше не появится: посетители увидят именно эту страницу с надписью Hello Fractera. Так и задумано — но знать об этом лучше до, а не после.",
  actionLead:
    "Скопируйте подсказку целиком и отдайте её агенту. В ней два поручения подряд: очистить главную страницу и запустить развёртывание на вашем сервере.",
  bullets: [
    "Агент правит только главную страницу — остальной проект он не трогает",
    "Развёртывание идёт несколько минут: файлы уезжают на сервер и собираются там заново",
    "Когда агент скажет, что развёртывание закончено, откройте свой адрес и обновите страницу",
    "Увидели старую страницу — обновите ещё раз с очисткой кэша: браузер держит прежнюю версию",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",

  linkLabel: "ваш адрес в интернете",

  promptLead: "Подсказка для агента — скопируйте её целиком:",
  promptText: PROMPT_RU,
  copyLabel: "Скопировать",
  copiedLabel: "Скопировано",
  copyToast: "Подсказка скопирована",

  checkLabel: "Я вижу Hello Fractera по своему адресу",
  cta: "Отметить шаг пройденным",
  busy: "Сохраняем…",
  successTitle: "Вы завершили шаг {n} из {total}",
  successHint: "Остался последний шаг — он появится здесь, когда будет построен",
  failureTitle: "Отметку не удалось сохранить",
  failureFix: "Попробуйте ещё раз; если повторится — сообщите нам",
  goPrev: "К предыдущему шагу",
  goNext: "К следующему шагу",
};

const en: StepTenStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step ten",
  title: "Your first change — and it goes to the internet",
  lead:
    "Everything is ready, and development starts here. You are about to make your first change through the agent and, in the same request, send it to your server: the home page becomes a blank sheet with the line Hello Fractera, and that is exactly what the internet will show.",
  important:
    "The home page is cleared on purpose: it is the blank sheet your project starts from, not a loss. Everything else stays — the control panel, the data layer, authentication, your settings. This empty page is where designing your own offer begins.",
  danger:
    "After the deployment the Fractera starter screen will no longer appear at your address: visitors will see this very page with Hello Fractera on it. That is the intent — but it is better known before than after.",
  actionLead:
    "Copy the prompt whole and hand it to your agent. It carries two requests in a row: clear the home page and deploy to your server.",
  bullets: [
    "The agent edits the home page only — the rest of the project stays untouched",
    "The deployment takes a few minutes: files travel to the server and are built there anew",
    "Once the agent reports the deployment is finished, open your address and reload the page",
    "Still the old page? Reload again bypassing the cache: the browser keeps the previous version",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",

  linkLabel: "your address on the internet",

  promptLead: "The prompt for your agent — copy it whole:",
  promptText: PROMPT_EN,
  copyLabel: "Copy",
  copiedLabel: "Copied",
  copyToast: "The prompt is copied",

  checkLabel: "I see Hello Fractera at my address",
  cta: "Mark the step as done",
  busy: "Saving…",
  successTitle: "You finished step {n} of {total}",
  successHint: "One step is left — it will appear here once it is built",
  failureTitle: "The mark could not be saved",
  failureFix: "Try again; if it repeats, tell us",
  goPrev: "To the previous step",
  goNext: "To the next step",
};

const DICT: Record<string, StepTenStrings> = { en, ru };

export function stepTenStrings(lang: string): StepTenStrings {
  return DICT[lang] ?? en;
}
