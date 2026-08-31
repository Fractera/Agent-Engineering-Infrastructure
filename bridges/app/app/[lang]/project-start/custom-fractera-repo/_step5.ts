import type { StepStrings } from "../default-template/_strings";

// ШАГ ПЯТЫЙ ВТОРОГО ПУТИ: ТОКЕН ДОСТУПА (35-6).
//
// 🔒 ТОТ ЖЕ ВОПРОС, ЧТО У ПЕРВОГО ПУТИ, И СВОЙ КЛЮЧ ХРАНЕНИЯ. Общий ключ
// означал бы, что прошедший один путь видит закрытым шаг другого.
//
// 🔒 ПОЛЕ СЕКРЕТНОЕ: значение не показывается, браузер не просят его помнить, а
// сохранённое отдаётся четырьмя последними знаками. Страница панели
// открывается при коллегах, на проекторе и в записи экрана.

const ru: StepStrings = {
  pageTitle: "Токен доступа к вашему репозиторию",
  pageHint: "Ключ, которым панель отправит проект в ваш репозиторий.",

  badge: "Шаг пятый",
  title: "Токен доступа GitHub",
  lead: "Панели нужен ключ, чтобы записать проект в ваш репозиторий. Без него она может только смотреть.",
  info:
    "Что это за ключ. GitHub выдаёт токен вместо пароля: у него можно ограничить срок и права, и его можно отозвать, не меняя пароль. Нужно право записи в содержимое репозитория; больше ничего мы не просим и ничего другого этим токеном не делаем.",
  important:
    "Панель хранит токен на вашем сервере и показывает четырьмя последними знаками — целиком его больше не увидит никто, включая вас.",
  actionLead: "Что понадобится:",
  bullets: [
    "Токен с правом записи в содержимое репозитория (Contents: read and write).",
    "Срок жизни выбираете вы: истёкший токен просто попросят заменить.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",
  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",
  replace: "Заменить токен",
  linkLabel: "Создать токен",

  form: {
    inputLabel: "Токен доступа",
    inputPlaceholder: "github_pat_…",
    inputHint: "Скопируйте токен сразу после создания: GitHub показывает его один раз.",
    cta: "Сохранить токен",
    busy: "Сохраняю…",
    successTitle: "Токен сохранён — шаг {n} из {total} закрыт",
    successHint: "Дальше панель проверит связь с репозиторием.",
    failureTitle: "Не получилось сохранить",
    failureFix: "Проверьте, отвечает ли панель, и нажмите ещё раз.",
  },
};

const en: StepStrings = {
  pageTitle: "Access token for your repository",
  pageHint: "The key the panel will use to send the project to your repository.",

  badge: "Step five",
  title: "GitHub access token",
  lead: "The panel needs a key to write the project into your repository. Without it, it can only look.",
  info:
    "What this key is. GitHub issues a token instead of a password: you can limit its lifetime and its rights, and you can revoke it without changing your password. Write access to repository contents is needed; we ask for nothing more and do nothing else with this token.",
  important:
    "The panel keeps the token on your server and shows only its last four characters — nobody sees it whole again, including you.",
  actionLead: "What you will need:",
  bullets: [
    "A token with write access to repository contents (Contents: read and write).",
    "You choose the lifetime: an expired token simply asks to be replaced.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",
  goPrev: "Previous step",
  goNext: "Next step",
  replace: "Replace the token",
  linkLabel: "Create a token",

  form: {
    inputLabel: "Access token",
    inputPlaceholder: "github_pat_…",
    inputHint: "Copy the token right after creating it: GitHub shows it once.",
    cta: "Save the token",
    busy: "Saving…",
    successTitle: "Token saved — step {n} of {total} is done",
    successHint: "Next the panel checks the connection to the repository.",
    failureTitle: "Could not save",
    failureFix: "Check that the panel answers, then press again.",
  },
};

const DICT: Record<string, StepStrings> = { en, ru };

export function adoptStepFiveStrings(lang: string): StepStrings {
  return DICT[lang] ?? en;
}
