// СЛОВА ШАГА 5 — CLAUDE CODE (28-23, 2026-08-27).
//
// 🔒 ТЕКСТ ВЛАДЕЛЬЦА, взятый из `_content/launch-step-claude-code.ru.md` живого
// мастера: он там уже написан и разбит ровно на те мысли, которые нужны — две
// дороги (браузер и терминал), обе платформы, условие «подписка оплачена».
//
// 🔒 ССЫЛКА НАЗВАНА ВЛАДЕЛЬЦЕМ: `https://claude.com/download`. Она отвечает на
// тот же вопрос, что ссылки шагов 1 и 2, — КУДА идти делать; репозиторий на шаге
// 4 отвечал на другой, «как убедиться, что получилось».
//
// 🔒 ЭТО ШАГ, ЗАКРЫВАЕМЫЙ ЧЕЛОВЕКОМ, И ИНАЧЕ БЫТЬ НЕ МОЖЕТ. Панель работает на
// сервере, а Claude Code живёт на машине человека: канала, по которому такой
// вопрос можно задать, между ними нет. Спрашивать «а точно поставил?» и рисовать
// зелёное от собственной догадки — тот же дефект, что уже оплачен в шаге 25.
// Здесь единственный честный вид — галочка, и она снимаемая.

export type StepFiveStrings = {
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
  linkLabel: string;
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
  /** ЧТО на снимке — читается вслух тем, кто его не увидит. Не повтор подписи. */
  shotAlt: string;
  /** Подпись под рамкой: чей это экран и на что смотреть. */
  shotCaption: string;
};

const ru: StepFiveStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг пятый",
  title: "Claude Code",
  lead: "Агент, который будет писать ваш код. Дальше проект строит он, а вы им управляете.",
  info:
    "Для начинающих — веб-версия: открывается в браузере, ставить ничего не нужно, папку проекта выбираете прямо в ней. Для тех, кто работал с терминалом, — Claude Code в командной строке плюс ваш редактор: тот же агент, больше контроля, выше порог входа.",
  important:
    "Нужна оплаченная подписка разработчика — без неё агент не запустится. Это единственное на всём пути, за что платят отдельно.",
  actionLead:
    "Поставьте Claude Code и откройте его. Приложение есть и для Windows, и для macOS — берите версию под свою машину.",
  bullets: [
    "Веб-версия — ничего ставить не нужно, всё в браузере",
    "Версия для терминала — для тех, кто уже работал с командной строкой",
    "Подписка оплачивается у Anthropic, не у нас",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",
  linkLabel: "ссылка",

  checkLabel: "Claude Code открыт и подписка оплачена",
  cta: "Отметить шаг пройденным",
  busy: "Сохраняем…",
  successTitle: "Вы завершили шаг {n} из {total}",
  successHint: "Следующий шаг появится здесь, когда будет построен",
  failureTitle: "Отметку не удалось сохранить",
  failureFix: "Попробуйте ещё раз; если повторится — сообщите нам",
  goPrev: "К предыдущему шагу",
  goNext: "К следующему шагу",
  replace: "Изменить отметку",

  shotAlt:
    "Тёмная страница claude.com с заголовком «Download Claude» и двумя кнопками загрузки: обычная для Windows и отдельная для Windows arm64.",
  shotCaption:
    "Так выглядит страница загрузки на claude.com: кнопки предлагают версию под вашу машину — здесь это Windows.",
};

const en: StepFiveStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step five",
  title: "Claude Code",
  lead: "The agent that will write your code. From here on it builds the project and you steer it.",
  info:
    "For beginners — the web version: it opens in a browser, nothing to install, and you pick the project folder inside it. For those who have used a terminal — Claude Code on the command line plus your editor: the same agent, more control, a higher entry bar.",
  important:
    "A paid developer subscription is required — without it the agent will not start. It is the only thing on this whole path that is paid for separately.",
  actionLead:
    "Install Claude Code and open it. The app exists for both Windows and macOS — take the build for your machine.",
  bullets: [
    "The web version — nothing to install, everything in the browser",
    "The terminal version — for those who have worked with a command line",
    "The subscription is paid to Anthropic, not to us",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",
  linkLabel: "link",

  checkLabel: "Claude Code is open and the subscription is paid",
  cta: "Mark the step as done",
  busy: "Saving…",
  successTitle: "You finished step {n} of {total}",
  successHint: "The next step will appear here once it is built",
  failureTitle: "The mark could not be saved",
  failureFix: "Try again; if it repeats, tell us",
  goPrev: "To the previous step",
  goNext: "To the next step",
  replace: "Change the mark",

  shotAlt:
    "A dark claude.com page titled «Download Claude» with two download buttons: the plain Windows one and a separate Windows arm64 one.",
  shotCaption:
    "This is how the download page looks on claude.com: the buttons offer the build for your machine — here it is Windows.",
};

const DICT: Record<string, StepFiveStrings> = { en, ru };

export function stepFiveStrings(lang: string): StepFiveStrings {
  return DICT[lang] ?? en;
}
