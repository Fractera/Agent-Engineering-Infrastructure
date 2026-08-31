import type { MachineStepStrings } from "./_verify";

// ШАГ СЕДЬМОЙ ВТОРОГО ПУТИ: ОТПРАВКА ПРОЕКТА (35-6).
//
// 🔒 ЭТО МЕСТО, ГДЕ ОТВЯЗКА 35-2 СТАНОВИТСЯ ВИДНОЙ, И СКАЗАТЬ ЭТО НАДО ПРЯМО.
// Без неё слот нёс бы remote донора, и первая отправка ушла бы в чужой
// репозиторий или отказала по правам. Человек об этом знать не обязан — но
// обязан прочитать, ПОЧЕМУ проект теперь принадлежит ему.
//
// 🔒 ТИП ТОТ ЖЕ, ЧТО У ПРОВЕРКИ СВЯЗИ, И ЭТО НЕ ЛЕНЬ. Оба шага машинные и
// устроены одинаково: одна кнопка, ответ сервера, закрытый список причин отказа.
// Отличаются они дверью и словами — ровно то, что и должно отличаться.

const ru: MachineStepStrings = {
  pageTitle: "Отправка проекта в ваш репозиторий",
  pageHint: "Проект, приехавший от донора, уезжает в ваш собственный репозиторий.",

  title: "Отправить проект",
  lead: "Панель отправит содержимое вашего сервера в репозиторий, который вы назвали. После этого проект будет и на сервере, и у вас в GitHub.",
  info:
    "Почему это стало возможно. На втором шаге проект был отвязан от репозитория донора: история отсечена, чужой адрес удалён, и у проекта остался один корневой коммит. Не будь этого, отправка ушла бы в репозиторий прежнего владельца или отказала по правам — и разбираться пришлось бы уже с испорченным чужим проектом.",
  important:
    "Отправляется то, что сейчас лежит на сервере. Файл .env.local с ключами не уезжает — он закрыт от отправки и принадлежит машине, а не проекту.",
  actionLead: "Что произойдёт по нажатию:",
  bullets: [
    "Панель соберёт всё содержимое проекта в один коммит.",
    "И отправит его в вашу ветку main по сохранённому токену.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",
  cta: "Отправить проект",
  busy: "Отправляю…",
  successTitle: "Проект отправлен",
  successHint: "Откройте репозиторий — файлы уже там",
  failureTitle: "Отправка не прошла",
  reasons: {
    "not-verified": "Связь не проверена. Вернитесь на шестой шаг и нажмите «Проверить связь».",
    "no-project": "Папка проекта не найдена. Это дефект сервера — напишите нам.",
    "push-rejected": "GitHub отказал в записи. Чаще всего репозиторий не пуст: заведите пустой или очистите этот.",
    network: "GitHub не ответил. Попробуйте ещё раз через минуту.",
  },
  reasonUnknown: "Причина неизвестна. Повторите попытку, а если повторится — напишите нам.",
  verifiedAt: "Отправлено",
  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",
};

const en: MachineStepStrings = {
  pageTitle: "Sending the project to your repository",
  pageHint: "The project that arrived from the donor goes into your own repository.",

  title: "Send the project",
  lead: "The panel will send the contents of your server into the repository you named. After that the project lives both on the server and in your GitHub.",
  info:
    "Why this became possible. On step two the project was detached from the donor repository: the history was cut, the stranger address removed, and one root commit was left. Without that, the push would have gone into the previous owner repository or been refused on rights — and you would be sorting it out with someone else project already spoiled.",
  important:
    "What is on the server right now is what gets sent. The .env.local file with the keys does not travel — it is excluded from the push and belongs to the machine, not to the project.",
  actionLead: "What happens when you press:",
  bullets: [
    "The panel gathers the whole project into a single commit.",
    "And sends it into your main branch using the saved token.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",
  cta: "Send the project",
  busy: "Sending…",
  successTitle: "The project is sent",
  successHint: "Open the repository — the files are already there",
  failureTitle: "The push did not go through",
  reasons: {
    "not-verified": "The connection is not checked. Go back to step six and press Check the connection.",
    "no-project": "The project folder was not found. This is a server defect — write to us.",
    "push-rejected": "GitHub refused the write. Most often the repository is not empty: create an empty one or clear this one.",
    network: "GitHub did not answer. Try again in a minute.",
  },
  reasonUnknown: "The reason is unknown. Try again, and if it repeats — write to us.",
  verifiedAt: "Sent",
  goPrev: "Previous step",
  goNext: "Next step",
};

const DICT: Record<string, MachineStepStrings> = { en, ru };

export function adoptPushStrings(lang: string): MachineStepStrings {
  return DICT[lang] ?? en;
}
