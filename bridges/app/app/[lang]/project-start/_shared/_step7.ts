// СЛОВА ШАГА 7 — ОТКРЫТЬ ПАПКУ В CLAUDE CODE (28-26, 2026-08-28).
//
// 🔒 ТЕКСТ ВЛАДЕЛЬЦА, из `_content/launch-step-open-folder.ru.md` живого мастера.
// В нём есть то, чего я бы не придумал: способ ПРОВЕРИТЬ, что не промахнулись, —
// спросить у агента дословно, в какой папке он работает. Это и есть настоящая
// проверка шага, и она сформулирована человеком, который на этом обжигался.
//
// 🔒 СНИМОК ЗДЕСЬ ЕСТЬ, И ОН ПРИСЛАН ВЛАДЕЛЬЦЕМ 2026-08-28. Окно Claude Code в
// момент выбора папки: «New» слева, чип с именем папки внизу, полный путь в
// диалоге доверия. Ровно три места, куда человек обязан посмотреть, — поэтому
// на снимке они и пронумерованы 1, 2, 3.
//
// 🔒 ПОДПИСЬ ГОВОРИТ, ЧЕЙ ЭТО ЭКРАН. Это окно Claude Code, а не наша панель:
// картинка без такой подписи заставляет человека искать «Trust workspace» у нас.

export type StepSevenStrings = {
  pageTitle: string;
  pageHint: string;
  badge: string;
  title: string;
  lead: string;
  info: string;
  important: string;
  /**
   * Красная подсказка — цена ошибки (28-27).
   *
   * 🔒 ТЕКСТ ВЛАДЕЛЬЦА 2026-08-28, усиленный по его прямой просьбе «от себя
   * усилить эту беду, если ты меня поддерживаешь». Поддерживаю: два последствия
   * он не назвал, а они хуже перечисленных — чужие ключи в поле зрения агента и
   * правки в соседних проектах, которых никто не заметит.
   */
  danger: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;
  shotAlt: string;
  shotCaption: string;
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

const ru: StepSevenStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг седьмой",
  title: "Откройте папку в Claude Code",
  lead:
    "Запустите Claude Code. При старте он предложит выбрать папку проекта — укажите ту, которую только что создали.",
  info:
    "Это критически важно: агент работает в той папке, которую вы ему назвали, и ни в какой другой. Всё, что он создаст, появится именно там.",
  important:
    "Убедитесь, что не промахнулись. Спросите у агента дословно: «В какой папке ты сейчас работаешь? Назови полный путь». Сверьте ответ с путём вашей папки. Совпал — всё верно. Не совпал — закройте Claude Code и откройте заново, выбрав нужную папку; продолжать в чужой папке нельзя.",
  danger:
    "Что будет, если открыть папку по умолчанию — ту, где лежат все ваши проекты. Агент увидит их все, и чистоту архитектуры вы больше не гарантируете: он учится на соседнем коде и начинает предлагать чужие библиотеки и приёмы как ваши, а ресурсы уходят на чтение лишних файлов. Два последствия замечают позже остальных: в поле зрения агента попадают чужие файлы окружения с ключами и токенами, и менять файлы он может в соседних проектах — там этого никто не ждёт.",
  actionLead:
    "Отметьте галочку, когда агент назвал правильный путь.",
  bullets: [
    "Новая сессия — кнопка «New» слева",
    "Папка выбирается внизу, рядом с полем запроса",
    "Полный путь виден в окне доверия — сверьте его со своим",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",

  shotAlt:
    "Окно Claude Code: слева кнопка «New» под номером 1, внизу чип с именем папки «my-first-app» под номером 2, в середине окно «Trust this workspace?» с полным путём к папке под номером 3.",
  shotCaption:
    "Так это выглядит в Claude Code: 1 — новая сессия, 2 — выбор папки, 3 — полный путь, который надо сверить со своим.",

  checkLabel: "Агент назвал правильный путь к моей папке",
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

const en: StepSevenStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step seven",
  title: "Open the folder in Claude Code",
  lead:
    "Start Claude Code. On launch it offers to pick the project folder — point it at the one you have just created.",
  info:
    "This matters: the agent works in the folder you named and in no other. Everything it creates will appear exactly there.",
  important:
    "Make sure you did not miss. Ask the agent, word for word: «Which folder are you working in right now? Give the full path». Compare the answer with your folder's path. A match means all is well. No match — close Claude Code and open it again with the right folder; carrying on in the wrong folder is not an option.",
  danger:
    "What happens if you open the default folder — the one holding all your projects. The agent sees every one of them, and you no longer guarantee a clean architecture: it learns from the neighbouring code and starts offering other projects' libraries and habits as yours, while resources go on reading files that have nothing to do with this project. Two consequences are noticed last: other projects' environment files, with their keys and tokens, come into the agent's view, and it can change files in those projects — where nobody is expecting it.",
  actionLead:
    "Tick the box once the agent has named the right path.",
  bullets: [
    "A new session — the «New» button on the left",
    "The folder is picked at the bottom, next to the prompt field",
    "The full path is shown in the trust dialog — check it against yours",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",

  shotAlt:
    "The Claude Code window: the «New» button on the left marked 1, a chip with the folder name «my-first-app» at the bottom marked 2, and the «Trust this workspace?» dialog with the full folder path in the middle marked 3.",
  shotCaption:
    "This is how it looks in Claude Code: 1 — a new session, 2 — picking the folder, 3 — the full path to check against yours.",

  checkLabel: "The agent named the right path to my folder",
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

const DICT: Record<string, StepSevenStrings> = { en, ru };

export function stepSevenStrings(lang: string): StepSevenStrings {
  return DICT[lang] ?? en;
}
