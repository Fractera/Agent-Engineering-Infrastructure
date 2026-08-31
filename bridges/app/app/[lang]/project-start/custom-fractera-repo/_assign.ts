// ШАГ ТРИНАДЦАТЫЙ ВТОРОГО ПУТИ: ПРИСВОЕНИЕ И РАЗВЁРТЫВАНИЕ (35-7).
//
// 🔒 ЗДЕСЬ НЕТ «HELLO FRACTERA», И ЭТО СОДЕРЖАТЕЛЬНО, А НЕ ЗАБЫТО. На десятом
// шаге первого пути главная страница ОЧИЩАЕТСЯ: человек начинает с чистого
// листа, и первое изменение обязано быть заметным. Сюда он пришёл ЗА чужим
// дизайном — очистка уничтожила бы причину прихода. Вместо очистки —
// присвоение: чужие реквизиты заменяются его собственными.
//
// 🔒 ЧИНИТ АГЕНТ, А НЕ ПАНЕЛЬ (решение владельца 2026-08-29). Панель видит
// конфиги, но не видит хардкода внутри компонентов, текстов и писем; починив
// половину, она сказала бы «готово», и человек остался бы с чужим именем в
// подвале. Агент читает проект целиком — у него для этого есть глаза.
//
// 🔒 СПИСКА МЕСТ, ГДЕ ЖИВЁТ ХАРДКОД, МЫ НЕ ДАЁМ. Он у каждого донора свой;
// перечислить его заранее значило бы соврать про чужой проект. Поручение
// формулируется по СМЫСЛУ — «найди и замени», — а не по адресам файлов.
//
// 🔒 ФРАЗА РАЗВЁРТЫВАНИЯ ОДНА НА ОБА ПУТИ и берётся из `_shared/deploy-words`.
// Это единственное, что человек унесёт с собой и будет повторять сам; два
// объяснения одного слова разошлись бы.

export type AssignStrings = {
  pageTitle: string;
  pageHint: string;
  title: string;
  lead: string;
  important: string;
  danger: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;
  linkLabel: string;
  noAddress: string;
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

// 🔒 ПОРУЧЕНИЕ, А НЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ. Человек копирует его не читая, поэтому
// оно говорит, ЧТО должно стать правдой, и не описывает агенту, как искать.
// Последняя строка — та самая фраза развёртывания, дословно.
const PROMPT_RU = `Этот проект приехал из чужого репозитория, и в нём остались реквизиты прежнего владельца.

Пройди по проекту и замени их на мои: название проекта, имя владельца или компании, адрес сайта, почту для связи, ссылки на социальные сети, копирайт в подвале. Ищи их везде — в настройках, в текстах страниц, в заголовках для поиска, в шаблонах писем. Спроси у меня то, чего не знаешь, одним списком, а не по одному вопросу.

Дизайн, раскладку и содержание страниц не трогай: я пришёл сюда именно за ними.

Когда закончишь, запусти развёртывание на моём сервере. Когда оно закончится, ответь одной строкой: по какому адресу открывать проект в интернете.`;

const PROMPT_EN = `This project came from someone else's repository, and the previous owner's details are still in it.

Go through the project and replace them with mine: the project name, the owner or company name, the site address, the contact email, the social links, the copyright in the footer. Look everywhere — in the settings, in page texts, in the titles for search, in email templates. Ask me for anything you do not know in one list, not one question at a time.

Do not touch the design, the layout or the contents of the pages: they are exactly what I came here for.

When you are done, deploy this to my server. When the deployment finishes, answer in one line: at what address the project opens on the internet.`;

const ru: AssignStrings = {
  pageTitle: "Присвоение проекта",
  pageHint: "Чужие реквизиты заменяются вашими, и проект уезжает в интернет.",

  title: "Сделайте проект своим",
  lead: "Проект работает и лежит в вашем репозитории, но представляется он всё ещё прежним владельцем. Отдайте агенту подсказку ниже — он найдёт чужие реквизиты и заменит их вашими, а потом развернёт проект.",
  important:
    "Дизайн и содержание страниц остаются как есть: вы пришли сюда за ними. Меняются только реквизиты — имя, адрес, почта, ссылки, копирайт.",
  danger:
    "Не пропускайте этот шаг. Проект, оставшийся с чужим именем и чужой почтой в подвале, вводит в заблуждение ваших посетителей, а письма от него уходят прежнему владельцу.",
  actionLead: "Что сделает агент:",
  bullets: [
    "Найдёт реквизиты прежнего владельца в настройках, текстах, заголовках и письмах.",
    "Спросит у вас одним списком то, чего не знает, — и заменит найденное.",
    "Запустит развёртывание и назовёт адрес, по которому проект открывается.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",
  linkLabel: "ссылка",
  noAddress:
    "Сервер пока не знает своего внешнего адреса — домен ему не назначен. Ссылку мы не показываем: она вела бы в никуда.",

  promptLead: "Скопируйте и отдайте агенту:",
  promptText: PROMPT_RU,
  copyLabel: "Скопировать",
  copiedLabel: "Скопировано",
  copyToast: "Подсказка скопирована",

  checkLabel: "Я открыл свой адрес и вижу проект со своими реквизитами",
  cta: "Отметить шаг закрытым",
  busy: "Отмечаю…",
  successTitle: "Шаг {n} из {total} закрыт",
  successHint: "Остался последний шаг — прощание.",
  failureTitle: "Не получилось отметить",
  failureFix: "Проверьте, отвечает ли панель, и нажмите ещё раз.",
  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",
};

const en: AssignStrings = {
  pageTitle: "Making the project yours",
  pageHint: "Someone else's details are replaced by yours, and the project goes online.",

  title: "Make the project yours",
  lead: "The project runs and sits in your repository, but it still introduces itself as the previous owner. Give the agent the prompt below — it will find the stranger's details, replace them with yours, and then deploy the project.",
  important:
    "The design and the contents of the pages stay as they are: that is what you came for. Only the details change — name, address, email, links, copyright.",
  danger:
    "Do not skip this step. A project left with a stranger's name and a stranger's email in the footer misleads your visitors, and the mail it sends goes to the previous owner.",
  actionLead: "What the agent will do:",
  bullets: [
    "Find the previous owner's details in the settings, texts, titles and email templates.",
    "Ask you in one list for anything it does not know — and replace what it found.",
    "Run the deployment and name the address at which the project opens.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",
  linkLabel: "link",
  noAddress:
    "The server does not know its outside address yet — no domain has been assigned to it. We are not showing a link: it would lead nowhere.",

  promptLead: "Copy this and give it to the agent:",
  promptText: PROMPT_EN,
  copyLabel: "Copy",
  copiedLabel: "Copied",
  copyToast: "Prompt copied",

  checkLabel: "I opened my address and I see the project with my own details",
  cta: "Mark the step as done",
  busy: "Marking…",
  successTitle: "Step {n} of {total} is done",
  successHint: "One step left — the farewell.",
  failureTitle: "Could not mark it",
  failureFix: "Check that the panel answers, then press again.",
  goPrev: "Previous step",
  goNext: "Next step",
};

const DICT: Record<string, AssignStrings> = { en, ru };

export function adoptAssignStrings(lang: string): AssignStrings {
  return DICT[lang] ?? en;
}
