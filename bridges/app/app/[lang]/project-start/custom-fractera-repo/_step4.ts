import type { StepStrings } from "../default-template/_strings";

// ШАГ ЧЕТВЁРТЫЙ ВТОРОГО ПУТИ: АДРЕС СВОЕГО ПУСТОГО РЕПОЗИТОРИЯ (35-6).
//
// 🔒 ЗДЕСЬ ВТОРОЙ ПУТЬ ОБЪЯСНЯЕТ ТО, ЧЕГО У ПЕРВОГО НЕТ ВОВСЕ. У первого пути
// репозиторий заводится ПЕРВЫМ действием — он пуст, и в него потом уезжает
// шаблон. Здесь человек уже видел свой проект работающим по своему адресу, и
// вопрос «а зачем мне теперь репозиторий?» возникает сам собой. Ответ обязан
// стоять в тексте шага, а не подразумеваться.
//
// 🔒 ТИП БЕРЁТСЯ У ПЕРВОГО ПУТИ, А НЕ ПИШЕТСЯ ЗАНОВО: анатомия шага одна.

const ru: StepStrings = {
  pageTitle: "Свой репозиторий для проекта",
  pageHint: "Место, где проект будет жить между развёртываниями.",

  badge: "Шаг четвёртый",
  title: "Адрес вашего пустого репозитория",
  lead: "Заведите на GitHub пустой репозиторий и назовите его адрес. Туда уедет проект, который сейчас работает на вашем сервере.",
  info:
    "Зачем он нужен, если проект уже работает. Сейчас проект живёт только на вашем сервере: правки некуда сохранять, откатить нечего, а агенту на вашей машине неоткуда его взять. Репозиторий — дом проекта между развёртываниями. Заводится он пустым: ни одного файла, ни README, ни лицензии — всё приедет из проекта.",
  important:
    "Отправить проект в этот репозиторий можно только потому, что на втором шаге он был отвязан от донора. Без отвязки первая же отправка ушла бы в чужой репозиторий или отказала по правам.",
  actionLead: "Что понадобится:",
  bullets: [
    "Пустой репозиторий на GitHub — приватный или публичный, решаете вы.",
    "Его адрес целиком, вида https://github.com/владелец/проект.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",
  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",
  replace: "Заменить адрес",
  linkLabel: "Создать репозиторий",

  form: {
    inputLabel: "Адрес вашего репозитория",
    inputPlaceholder: "https://github.com/владелец/проект",
    inputHint: "Полный адрес страницы репозитория. Скопируйте его из адресной строки браузера.",
    cta: "Сохранить адрес",
    busy: "Сохраняю…",
    successTitle: "Адрес сохранён — шаг {n} из {total} закрыт",
    successHint: "Дальше понадобится токен доступа.",
    failureTitle: "Не получилось сохранить",
    failureFix: "Проверьте, отвечает ли панель, и нажмите ещё раз.",
  },
};

const en: StepStrings = {
  pageTitle: "Your own repository for the project",
  pageHint: "The place where the project will live between deployments.",

  badge: "Step four",
  title: "The address of your empty repository",
  lead: "Create an empty repository on GitHub and name its address. The project now running on your server will go there.",
  info:
    "Why it is needed when the project already runs. Right now the project lives on your server only: there is nowhere to save changes, nothing to roll back to, and nowhere for the agent on your machine to take it from. The repository is the project home between deployments. It starts empty: no files, no README, no licence — everything arrives from the project.",
  important:
    "Sending the project to this repository is possible only because it was detached from the donor on step two. Without that, the very first push would have gone into a stranger repository or been refused on rights.",
  actionLead: "What you will need:",
  bullets: [
    "An empty repository on GitHub — private or public, you decide.",
    "Its full address, of the form https://github.com/owner/project.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",
  goPrev: "Previous step",
  goNext: "Next step",
  replace: "Replace the address",
  linkLabel: "Create a repository",

  form: {
    inputLabel: "Your repository address",
    inputPlaceholder: "https://github.com/owner/project",
    inputHint: "The full address of the repository page. Copy it from the browser address bar.",
    cta: "Save the address",
    busy: "Saving…",
    successTitle: "Address saved — step {n} of {total} is done",
    successHint: "An access token comes next.",
    failureTitle: "Could not save",
    failureFix: "Check that the panel answers, then press again.",
  },
};

const DICT: Record<string, StepStrings> = { en, ru };

export function adoptStepFourStrings(lang: string): StepStrings {
  return DICT[lang] ?? en;
}
