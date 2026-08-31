// СЛОВА ШАГА 11 — ПРОЩАНИЕ И ГЛАВНЫЙ СОВЕТ (65-2, 2026-08-31).
//
// 🔒 ПОСЛЕДНИЙ ШАГ ПУТИ, И ОН НЕ РАБОЧИЙ. Владелец 2026-08-29: «реально
// связанные с разработкой это будет последний шаг» — про десятый; одиннадцатый
// он назвал прощанием и парой советов. Поэтому здесь нет задания: человек уже
// всё сделал, и просить его о чём-то ещё значило бы не отпустить.
//
// 🔒 ДВА МЕСТА ИЗ ТЕКСТА ВЛАДЕЛЬЦА ПРИВЕДЕНЫ К ПРАВДЕ, И ЭТО НЕ РЕДАКТУРА.
//
// ПЕРВОЕ. Он написал, что проект «понимает не только пространство своего порта,
// но и все другие порты». Как сказано — неверно: агент внутри проекта соседние
// порты НЕ ВИДИТ, у него нет ни доступа за свою папку, ни права ходить на 3001
// или 3300. Правда рядом и не слабее: он знает соседей ПО КОНТРАКТАМ — что за
// дверь, что она принимает и что возвращает, — и потому умеет ими пользоваться,
// не имея к ним доступа. Человек проверит первое утверждение в первый же день, и
// если оно окажется неправдой, он перестанет верить остальному тексту.
//
// ВТОРОЕ. «Вернись к тому состоянию, когда это работало, и он отменит все
// изменения» — половина правды. Измерено: платформа сама возвращает последнюю
// РАБОЧУЮ сборку, если новая собралась и не отвечает (`api/deploy`, ветка
// rollback). Кнопки «вернись к рабочему состоянию» у продукта нет; правки
// откатывает агент через git. Решение владельца 2026-08-31: обещать ровно то,
// что есть.
//
// 🔒 СОВЕТ НАЗЫВАЕТ НАВЫК ПОИМЁННО. `explain-this-project` живёт в проекте
// человека (65-1); без имени совет «спросите проект» был бы пожеланием, а не
// дверью, и первый же ответ агента оказался бы пересказом вместо исследования.
//
// 🔒 КРАСНОГО ТОНА ЗДЕСЬ НЕТ НАМЕРЕННО. Красный говорит, что будет, если сделать
// иначе; на прощании пугать нечем и незачем — один красный на шаг, и лучше ни
// одного (28-27).

export type StepElevenStrings = {
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

  promptLead: string;
  promptText: string;
  copyLabel: string;
  copiedLabel: string;
  copyToast: string;
  copyFailed: string;

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

const ru: StepElevenStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг одиннадцатый",
  title: "Дальше — ваш проект",
  lead:
    "Путь пройден: пустой репозиторий стал сайтом, который видят посетители. Всё, что кажется сложным сейчас, со временем станет привычным и понятным — это происходит быстрее, чем кажется на одиннадцатом шаге.",

  info:
    "Проект хорошо знает сам себя. Своё пространство — порт 3000, где живёт ваше приложение, — он видит целиком: файлы, страницы, блоки, правила. Соседей — авторизацию, слой данных, карту, каналы, панель управления — он знает по договорам: какая дверь что принимает и что возвращает. Поэтому он умеет ими пользоваться, не имея к ним прямого доступа, и честно скажет, если чего-то не видит. Такая форма и позволяет проекту расти до миллионов строк кода, не тяжелея: страницы собираются из блоков, разметку печатает сервер, движение живёт островками поверх готового.",

  important:
    "Главный совет на всё путешествие: как можно чаще спрашивайте проект о нём самом. Просто скажите: «расскажи, как это работает и как это можно использовать». Агент возьмёт свой навык explain-this-project, исследует нужную часть архитектуры — не по памяти, а открывая файлы, — и предложит решение. Хотите глубже: исходный код платформы открыт для чтения на github.com/Fractera/Agent-Engineering-Infrastructure, а стартер, из которого вырос ваш проект, — на github.com/Fractera/fractera-next-starter.",

  actionLead: "Не бойтесь экспериментировать — обратный путь есть всегда:",
  bullets: [
    "Скажите агенту «отмени последние правки» — он вернёт код к прежнему состоянию и пересоберёт проект.",
    "Если новая сборка окажется нерабочей, сервер сам вернёт последнюю рабочую: сайт не останется лежать.",
    "Каждое развёртывание записано в журнале панели — видно, что и когда уехало на сервер.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",

  promptLead: "Фраза, с которой стоит начинать любой разговор о проекте:",
  promptText: "Расскажи, как это работает и как это можно использовать.",
  copyLabel: "Скопировать фразу",
  copiedLabel: "Скопировано",
  copyToast: "Фраза скопирована",
  copyFailed: "Скопировать не удалось — браузер не даёт доступ к буферу на незашифрованном адресе. Текст выделен: нажмите Ctrl+C.",

  checkLabel: "Я прочитал и готов работать сам",
  cta: "Завершить путь",
  busy: "Сохраняю…",
  successTitle: "Путь пройден полностью",
  successHint: "Возвращаться сюда можно в любой момент — все шаги остаются открытыми.",
  failureTitle: "Не получилось сохранить",
  failureFix: "Проверьте, отвечает ли панель, и нажмите ещё раз.",
  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",
};

const en: StepElevenStrings = {
  pageTitle: "Starter template",
  pageHint: "From an empty repository to a working site — one step at a time.",

  badge: "Step eleven",
  title: "From here it is your project",
  lead:
    "The way is done: an empty repository became a site that visitors can see. Everything that feels complicated right now becomes ordinary sooner than it seems on step eleven.",

  info:
    "The project knows itself well. Its own space — port 3000, where your application lives — it sees whole: files, pages, blocks, rules. Its neighbours — authentication, the data layer, the map, channels, the control panel — it knows by contract: which door takes what and returns what. That is how it uses them without direct access, and it will tell you plainly when it cannot see something. This shape is also what lets the project grow to millions of lines without getting heavier: pages are lists of blocks, the server prints the markup, motion lives in islands over what is already there.",

  important:
    "The one piece of advice for the whole journey: ask the project about itself as often as you can. Just say: \"tell me how this works and how I can use it\". The agent will take its explain-this-project skill, look into the part of the architecture your question is about — by opening files, not from memory — and offer you a solution. Want to go deeper: the platform's source is open to read at github.com/Fractera/Agent-Engineering-Infrastructure, and the starter your project grew from is at github.com/Fractera/fractera-next-starter.",

  actionLead: "Do not be afraid to experiment — there is always a way back:",
  bullets: [
    "Tell the agent \"undo the last changes\" — it returns the code to its previous state and rebuilds.",
    "If a new build turns out broken, the server puts the last working one back: the site does not stay down.",
    "Every deployment is written into the panel's journal — you can see what went to the server and when.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",

  promptLead: "The sentence worth starting any conversation about the project with:",
  promptText: "Tell me how this works and how I can use it.",
  copyLabel: "Copy the sentence",
  copiedLabel: "Copied",
  copyToast: "Sentence copied",
  copyFailed: "Copying failed — the browser blocks clipboard access on an unencrypted address. The text is selected: press Ctrl+C.",

  checkLabel: "I have read this and I am ready to work on my own",
  cta: "Finish the way",
  busy: "Saving…",
  successTitle: "The way is complete",
  successHint: "You can come back any time — every step stays open.",
  failureTitle: "Could not save",
  failureFix: "Check that the panel answers, then press again.",
  goPrev: "Previous step",
  goNext: "Next step",
};

const DICT: Record<string, StepElevenStrings> = { en, ru };

export function stepElevenStrings(lang: string): StepElevenStrings {
  return DICT[lang] ?? en;
}
