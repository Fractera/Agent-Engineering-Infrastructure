// СЛОВА ШАГА 8 — УСТАНОВКА ЗАВИСИМОСТЕЙ (28-29, 2026-08-28).
//
// 🔒 ШАГ РАЗРЕЗАН НАДВОЕ РЕШЕНИЕМ ВЛАДЕЛЬЦА, дословно 2026-08-28: «Я ошибочно в
// прошлый раз попросил тебя два шага провести в одном… мы должны разделить этот
// шаг на два дела… это прохождение установки NPM зависимости. Завершение этого
// шага будет чеклист я установил зависимости, а уже следующий шаг ты перенесешь
// информацию о том что такое локалхост 3000». Здесь остаётся первая половина:
// проект приезжает на машину и получает материалы. Запуск и «я вижу такой же
// проект» живут в шаге девятом (28-30).
//
// 🔒 ЭТОТ ШАГ ПО-ПРЕЖНЕМУ ОТМЕНЯЕТ ЦЕЛУЮ ВЕРЕНИЦУ СТАРЫХ. Владелец, 2026-08-28:
// «у нас бесконечное количество глупых действий было создано на следующих шагах…
// ключи безопасности, для того чтобы получить, нужно было идти в соседнюю вкладку
// и ещё множество дополнительных шагов — это полная чушь. Сейчас переменные
// окружения уже содержат в себе не только ключи, но и адрес GitHub-репозитория».
// Проверено в коде: `api/config/env-export` кладёт в один файл адрес слоя данных с
// точки зрения ПРИНИМАЮЩЕЙ машины, ключ данных, ключ развёртывания, приватный
// ключ доступа к серверу и переменные слота, включая адрес репозитория. Собирать
// по вкладкам нечего: одна кнопка отдаёт всё, одна подсказка объясняет агенту, что
// с этим делать.
//
// 🔒 ГОЛУБАЯ ПОДСКАЗКА ОБЪЯСНЯЕТ НЕ ДЕЙСТВИЕ, А ПРИЧИНУ — прямая просьба
// владельца: «многие люди, которые приходят из классического опыта… HTML… не
// понимают сам принцип». Аналогия его: репозиторий — чертежи и список материалов,
// установка зависимостей — привоз материалов, стройка — отдельное дело.
// 🔒 ОДНА ПОПРАВКА, НАЗВАННАЯ ВСЛУХ И ВНЕСЁННАЯ НАМЕРЕННО: отдельного шага
// «Build» на этом пути нет — локально стройкой занимается сам запуск (`npm run
// dev` собирает на лету, оттого первый запуск и медленный). Поэтому текст говорит
// «стройка на следующем шаге» и указывает на девятый, а не обещает кнопку сборки,
// которой не существует. Обещание несуществующей кнопки — то самое введение в
// заблуждение, против которого владелец и просил проверить его формулировку.
//
// 🔒 ТЕКСТ ПОДСКАЗКИ — СМЫСЛ ВЛАДЕЛЬЦА, ФОРМУЛИРОВКА МОЯ, по его прямой просьбе
// «все используемые здесь тексты нужно оптимизировать». Продиктованный вариант
// содержал распознанные голосом обрывки («Local хост», «репетиторе»), которые
// уехали бы в продукт дословно.
//
// 🔒 ПОДСКАЗКА СНИМАЕТ У АГЕНТА ПОВОД ТОРГОВАТЬСЯ, А НЕ ОТКЛЮЧАЕТ ЕГО ЗАЩИТУ.
// ✗ владелец поймал живьём: агент увидел в окружении приватный ключ доступа к
// серверу, решил, что от него ждут настройки root-SSH и клонирования незнакомого
// репозитория, и остановился словами «I'd rather confirm than silently set up
// root SSH access». Лечение — сузить задачу: сказать прямо, что доступ уже есть,
// ключи сервера трогать не нужно и работа идёт только в папке проекта.
// 🔒 ЧЕГО ПОДСКАЗКА СДЕЛАТЬ НЕ МОЖЕТ — и обещать это человеку нельзя: запрос
// разрешения на `npm install` приходит от самого инструмента, а не от текста.
// Никакая формулировка его не выключит, поэтому шаг ЧЕСТНО предупреждает о
// паузе списком и показывает на снимке оба способа разрешить — значок запуска и
// ответ словами. Обещание «пройдёт без остановок» было бы враньём, которое
// человек поймает через минуту.
//
// 🔒 ПОДСКАЗКА ОБРЕЗАНА ПО ГРАНИЦЕ ШАГА, а не сокращена ради краткости: она
// кончается установкой и прямо говорит «запускать пока не нужно». Иначе агент
// поднимет проект здесь же, и девятый шаг человек откроет с уже сделанной
// работой — то есть увидит галочку без действия, ровно ту бессмыслицу, ради
// устранения которой шаг и разрезан.

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

  /** Снимок чужого экрана: что на нём (для читалки) и чей он (подпись). */
  shotAlt: string;
  shotCaption: string;

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

// 🔒 `localVsPublic()` ОТСЮДА УЕХАЛ ЦЕЛИКОМ В `_step9.ts` (28-30), а не
// скопировался. Его место — там, где человек впервые видит проект в браузере;
// здесь запуска нет, и объяснять разницу с опубликованным адресом ещё нечему.
// Оставленная «на всякий случай» копия разошлась бы с оригиналом на первой же
// правке, и соседние страницы говорили бы человеку разное.

const PROMPT_RU = `Создай проект из GitHub-репозитория. Его адрес и все нужные ключи лежат в переменных окружения, которые я тебе передал файлом.

Это мой репозиторий и мой сервер, доступ у меня уже есть. Настраивать доступ по SSH, трогать ключи сервера и права не нужно — в этой задаче их не касайся. Работай только в папке проекта.

Склонируй проект на эту машину по адресу из окружения, положи файл с переменными окружения в корень проекта и установи зависимости. Запускать проект пока не нужно.

Когда установка закончится, ответь одной строкой: в какой папке лежит проект и сколько пакетов установлено.`;

const PROMPT_EN = `Create the project from the GitHub repository. Its address and every key you need are in the environment variables I handed you as a file.

This is my repository and my server, and I already have access. There is no need to set up SSH access or touch server keys and permissions — leave them alone in this task. Work inside the project folder only.

Clone the project onto this machine using the address from the environment, put the environment file in the project root and install the dependencies. Do not start the project yet.

When the installation is over, answer in one line: which folder holds the project and how many packages were installed.`;

const ru: StepEightStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг восьмой",
  title: "Установка зависимостей",
  lead:
    "Проект приезжает на вашу машину и получает всё, из чего он собран. Агенту для этого нужны две вещи: переменные окружения и одна подсказка. Обе — здесь, на этой странице.",
  info:
    "Репозиторий на GitHub — это ещё не сайт, а подробные чертежи дома и список материалов: что взять и откуда. Установка зависимостей привозит эти материалы на вашу машину — несколько сотен готовых библиотек, из которых собран проект. В репозитории их нет намеренно: они весят много и у каждого ставятся заново. Первый раз это занимает минуты и создаёт большую папку node_modules — так и должно быть. Дом из привезённых материалов ещё не построен: стройка на следующем шаге.",
  important:
    "Файл окружения не выкладывайте в открытый доступ и не отправляйте в GitHub: в нём ключ к вашим данным и ключ доступа к серверу. В проекте он уже закрыт от отправки, поэтому просто оставьте его там, куда положит агент.",
  actionLead:
    "Заберите окружение, отдайте агенту подсказку — и отметьте галочку, когда установка закончится.",
  bullets: [
    "Кнопка ниже отдаёт файл со всеми ключами и адресом вашего репозитория",
    "Подсказку скопируйте целиком — в ней сказано и что сделать, и чем закончить",
    "Работа остановится сама: агент попросит разрешить установку зависимостей. Разрешите одним из двух способов со снимка — значком запуска справа от команды или ответом словами",
    "Ход установки видно в терминале; когда она закончится, агент спросит, продолжать ли дальше",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",

  shotAlt:
    "Окно Claude Code: проект склонирован, файл окружения записан, а установка зависимостей остановлена запросом разрешения. Цифрой 1 отмечен значок запуска справа от строки npm install, цифрой 2 — ответ «I approve, run npm install» в поле ввода. Справа терминал показывает установку: добавлено 1155 пакетов.",
  shotCaption:
    "Так выглядит остановка на вашей машине. Разрешить можно двумя способами: 1 — нажать значок запуска справа от команды, 2 — ответить агенту согласием словами. Справа в терминале виден ход установки.",

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

  checkLabel: "Я установил зависимости",
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
  title: "Install the dependencies",
  lead:
    "The project lands on your machine and gets everything it is built from. For that the agent needs two things: the environment variables and one prompt. Both are on this page.",
  info:
    "A GitHub repository is not a website yet — it is the detailed drawings of a house and a list of materials: what to take and where from. Installing the dependencies brings those materials onto your machine: a few hundred ready-made libraries the project is built from. They are deliberately absent from the repository — they are heavy and everyone installs them anew. The first time it takes minutes and creates a large node_modules folder; that is exactly as it should be. The house is not built from the materials yet: the building happens on the next step.",
  important:
    "Never publish the environment file or send it to GitHub: it holds the key to your data and the access key to your server. The project already keeps it out of commits, so simply leave it where the agent puts it.",
  actionLead:
    "Take the environment, hand the agent the prompt — and tick the box once the installation is over.",
  bullets: [
    "The button below hands you a file with every key and your repository address",
    "Copy the prompt whole — it says both what to do and how to finish",
    "The work will pause by itself: the agent asks you to allow the install. Allow it either way shown on the shot — the run icon next to the command, or a reply in words",
    "The terminal shows the progress; when the install is over the agent asks whether to go on",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",

  shotAlt:
    "A Claude Code window: the project is cloned, the environment file is written, and the dependency install is held back by a permission request. Marker 1 points at the run icon next to the npm install line, marker 2 at the reply \"I approve, run npm install\" in the input. The terminal on the right shows the install: 1155 packages added.",
  shotCaption:
    "This is what the pause looks like on your machine. Two ways to allow it: 1 — press the run icon next to the command, 2 — reply to the agent in words. The terminal on the right shows the install running.",

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

  checkLabel: "I have installed the dependencies",
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
