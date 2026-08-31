// СЛОВА ШАГА ТРЕТЬЕГО: ПРОЕКТ ДОНОРА ОТКРЫВАЕТСЯ ПО ВАШЕМУ АДРЕСУ (35-4).
//
// 🔒 ЭТО ТОЧКА, РАДИ КОТОРОЙ ВЕСЬ ПУТЬ И ЗАТЕВАЛСЯ, и текст обязан это сказать.
// Два предыдущих шага — работа: назвать адрес, подтвердить замену. Здесь впервые
// есть на что посмотреть, и человек смотрит на СВОЁ.
//
// 🔒 ЗАКРЫВАЕТ ЧЕЛОВЕК, И ЭТО ЕДИНСТВЕННЫЙ ЧЕСТНЫЙ СПОСОБ. Сборка прошла — не
// значит, что он увидел то, за чем пришёл: страница могла открыться пустой,
// чужой, не на том языке. У панели нет глаз на его браузере, и делать вид, что
// есть, — ложь. ✗ ровно этим оплачен шаг 25.
//
// 🔒 РАЗНИЦА С ДЕСЯТЫМ ШАГОМ ПЕРВОГО ПУТИ — СОДЕРЖАТЕЛЬНАЯ, А НЕ СЛОВЕСНАЯ. Там
// человек только что развернул СВОИ правки со своей машины и проверяет, доехали
// ли они. Здесь он не писал ни строчки: он смотрит на ЧУЖОЙ проект, который стал
// его, и главный вопрос другой — «это точно то, что я выбирал?».

export type LiveStrings = {
  pageTitle: string;
  pageHint: string;
  title: string;
  lead: string;
  important: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;
  /** Подпись ссылки-действия: слово перед адресом. */
  linkLabel: string;
  /** Сказанное вместо ссылки, когда сервер своего адреса не знает. */
  noAddress: string;
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
 * Голубая подсказка: это уже ВАШ сервер и ВАШ адрес.
 *
 * 🔒 АДРЕС ЖИВОЙ, А НЕ СЛОВА «ВАШ ДОМЕН». Сервер сам знает, работает он за
 * доменом или по IP (`publicSiteUrl()`), и подставляется именно его ответ.
 *
 * 🔒 ВЕТКА БЕЗ АДРЕСА НЕ ЗАПАСНАЯ, А РАВНОПРАВНАЯ. Сервер в защищённом режиме,
 * не прошедший визард домена, честно отвечает «не знаю», и текст обязан читаться
 * связно без адреса — иначе в предложении окажется дыра, а человек прочтёт
 * обрубок как поломку. Ссылки в этом случае нет вовсе: ссылка в никуда хуже её
 * отсутствия (✗ оплачено шагом 34).
 */
export function whatYourAddressMeans(lang: string, siteUrl: string | null): string {
  const ru = siteUrl
    ? `Этот адрес — ${siteUrl} — принадлежит вашему серверу, а не нам. По нему теперь отдаётся ваш форк: панель скачала его, заменила содержимое слота и собрала проект заново. Связь с форком сохранена — сервер знает, откуда брать обновления, а вы вправе менять в нём что угодно. Всё, что вы дальше измените, будет видно здесь же.`
    : `Адрес, по которому открывается ваш проект, принадлежит вашему серверу, а не нам. По нему теперь отдаётся ваш форк: панель скачала его, заменила содержимое слота и собрала проект заново. Связь с форком сохранена — сервер знает, откуда брать обновления. Сейчас сервер своего внешнего адреса не знает: домен ему ещё не назначен, и назвать вам адрес наугад мы не станем.`;
  const en = siteUrl
    ? `This address — ${siteUrl} — belongs to your server, not to us. It now serves your fork: the panel downloaded it, replaced the slot's contents and built the project anew. The link to the fork is kept — the server knows where to take updates from, and you may change anything in it. Everything you change from now on will show up right here.`
    : `The address your project opens at belongs to your server, not to us. It now serves your fork: the panel downloaded it, replaced the slot's contents and built the project anew. The link to the fork is kept — the server knows where to take updates from. Right now the server does not know its own outside address: no domain has been assigned to it yet, and we will not guess one for you.`;
  return lang === "ru" ? ru : en;
}

const ru: LiveStrings = {
  pageTitle: "Проект открывается по вашему адресу",
  pageHint: "Первая возможность посмотреть на подключённый проект глазами постороннего.",

  title: "Откройте свой адрес и посмотрите",
  lead:
    "Замена прошла, сборка закончилась. Теперь по адресу вашего сервера отдаётся проект из вашего форка — откройте его и убедитесь, что это именно то, что вы выбирали.",
  important:
    "Эту отметку ставите вы, а не панель: у неё нет глаз на вашем браузере. Отметка снимается — если позже окажется, что открылось не то, вернитесь сюда и снимите её.",
  actionLead: "На что стоит посмотреть:",
  bullets: [
    "Открывается ли главная страница, и та ли это страница, что была в форкнутом проекте.",
    "Работают ли переходы по разделам — проект приехал целиком, а не одной страницей.",
    "Ваши настройки на месте: файл .env.local замену пережил, а с ним ключи слоя данных.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",
  linkLabel: "ссылка",
  noAddress:
    "Сервер пока не знает своего внешнего адреса — домен ему не назначен. Ссылку мы не показываем: она вела бы в никуда. Назначьте домен, вернитесь сюда и отметьте шаг.",

  checkLabel: "Я открыл свой адрес и вижу подключённый проект",
  cta: "Отметить шаг закрытым",
  busy: "Отмечаю…",
  successTitle: "Шаг {n} из {total} закрыт",
  successHint: "Дальше — присвоение проекта: он станет вашим и в GitHub.",
  failureTitle: "Не получилось отметить",
  failureFix: "Проверьте, отвечает ли панель, и нажмите ещё раз.",
  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",
};

const en: LiveStrings = {
  pageTitle: "The project opens at your address",
  pageHint: "The first chance to look at the connected project through an outsider's eyes.",

  title: "Open your address and look",
  lead:
    "The replacement went through, the build has finished. Your server's address now serves the project from your fork — open it and make sure it is exactly what you chose.",
  important:
    "You place this mark, not the panel: it has no eyes on your browser. The mark can be removed — if it later turns out the wrong thing opened, come back here and take it off.",
  actionLead: "What is worth looking at:",
  bullets: [
    "Whether the home page opens, and whether it is the page the forked project had.",
    "Whether moving between sections works — the project arrived whole, not as a single page.",
    "Your settings are in place: the .env.local file survived the swap, and the data-layer keys with it.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",
  linkLabel: "link",
  noAddress:
    "The server does not know its outside address yet — no domain has been assigned to it. We are not showing a link: it would lead nowhere. Assign a domain, come back here and mark the step.",

  checkLabel: "I opened my address and I can see the connected project",
  cta: "Mark the step as done",
  busy: "Marking…",
  successTitle: "Step {n} of {total} is done",
  successHint: "Next comes making the project yours — in GitHub as well.",
  failureTitle: "Could not mark it",
  failureFix: "Check that the panel answers, then press again.",
  goPrev: "Previous step",
  goNext: "Next step",
};

const DICT: Record<string, LiveStrings> = { en, ru };

export function adoptLiveStrings(lang: string): LiveStrings {
  return DICT[lang] ?? en;
}
