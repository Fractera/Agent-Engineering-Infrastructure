// СЛОВА ШАГА 6 — ОТДЕЛЬНАЯ ПАПКА ПРОЕКТА (28-26, 2026-08-28).
//
// 🔒 ТЕКСТ ВЛАДЕЛЬЦА, взятый из `_content/launch-step-folder.ru.md` живого
// мастера, а не сочинённый мной. Там он уже написан и уже содержит главное —
// довод, ради которого шаг вообще существует: агент видит всё, что рядом, и
// чужие папки съедают его внимание.
//
// 🔒 У ЭТОГО ШАГА НЕТ ССЫЛКИ, И ЭТО НЕ ЗАБЫВЧИВОСТЬ. Ссылка-действие отвечает на
// вопрос «КУДА идти делать». Папка заводится в проводнике на своей машине —
// адреса у этого действия не существует, и поставить сюда ссылку значило бы
// выдумать ей назначение.
//
// 🔒 СНИМКА ЗДЕСЬ ТОЖЕ НЕТ. Снимок показывает ЧУЖОЙ экран, который человек
// увидит своими глазами; пустая папка в проводнике у каждого своя, и картинка
// чужого проводника не объясняет ничего, а рамку «это не здесь» заполняет
// шумом. Присланный владельцем снимок изображает ОКНО CLAUDE CODE — он уехал на
// шаг 7, где ему и место.

export type StepSixStrings = {
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

const ru: StepSixStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг шестой",
  title: "Отдельная папка проекта",
  lead:
    "Заведите на своём компьютере отдельную пустую папку — только под этот проект. В неё приедет репозиторий, и в ней будет работать агент.",
  info:
    "Назовите её понятно — например, именем вашего проекта. Путь запомните: он понадобится на следующем шаге, когда вы будете открывать папку в Claude Code.",
  important:
    "Не пропускайте этот шаг. Классическая ошибка большинства разработчиков — запустить проект в общем рабочем пространстве, среди десятка чужих папок. Агент видит всё, что рядом, и его внимание расходуется на чужой код: качество разработки падает, ошибок становится больше, а причина остаётся невидимой. Отдельная папка стоит одной минуты и экономит недели.",
  actionLead:
    "Создайте папку и отметьте галочку, когда она готова.",
  bullets: [
    "Папка пустая — ничего внутри быть не должно",
    "Отдельная — не внутри других проектов и не среди них",
    "Путь запомните: он понадобится на шаге седьмом",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",

  checkLabel: "Пустая папка под проект создана",
  cta: "Отметить шаг пройденным",
  busy: "Сохраняем…",
  successTitle: "Вы завершили шаг {n} из {total}",
  successHint: "Дальше — открыть эту папку в Claude Code",
  failureTitle: "Отметку не удалось сохранить",
  failureFix: "Попробуйте ещё раз; если повторится — сообщите нам",
  goPrev: "К предыдущему шагу",
  goNext: "К следующему шагу",
  replace: "Изменить отметку",
};

const en: StepSixStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step six",
  title: "A separate project folder",
  lead:
    "Create a separate, empty folder on your computer — for this project only. The repository will land there, and the agent will work there.",
  info:
    "Give it a clear name — your project's name, for instance. Remember the path: you will need it on the next step, when you open the folder in Claude Code.",
  important:
    "Do not skip this. The classic mistake most developers make is starting the project inside a shared workspace, among a dozen unrelated folders. The agent sees everything nearby, and its attention is spent on other people's code: quality drops, errors multiply, and the cause stays invisible. A separate folder costs one minute and saves weeks.",
  actionLead:
    "Create the folder and tick the box once it exists.",
  bullets: [
    "The folder is empty — nothing should be inside",
    "Separate — not inside other projects and not among them",
    "Remember the path: you will need it on step seven",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",

  checkLabel: "An empty project folder has been created",
  cta: "Mark the step as done",
  busy: "Saving…",
  successTitle: "You finished step {n} of {total}",
  successHint: "Next — open that folder in Claude Code",
  failureTitle: "The mark could not be saved",
  failureFix: "Try again; if it repeats, tell us",
  goPrev: "To the previous step",
  goNext: "To the next step",
  replace: "Change the mark",
};

const DICT: Record<string, StepSixStrings> = { en, ru };

export function stepSixStrings(lang: string): StepSixStrings {
  return DICT[lang] ?? en;
}
