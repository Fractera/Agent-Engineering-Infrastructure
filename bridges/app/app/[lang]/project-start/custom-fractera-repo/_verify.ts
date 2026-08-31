// ШАГ ШЕСТОЙ ВТОРОГО ПУТИ: ПРОВЕРКА СВЯЗИ (35-6).
//
// 🔒 ШАГ ДРУГОГО РОДА, И ЭТО НЕ ОФОРМЛЕНИЕ. Первые два шага сохраняют введённое;
// здесь человек не вводит ничего — вопрос задаёт панель, а отвечает GitHub.
// Втиснуть это в форму значило бы завести форму без поля.
//
// 🔒 ПРИЧИНА ОТКАЗА ПЕРЕВОДИТСЯ В ДЕЙСТВИЕ. Дверь отдаёт машинное слово
// (`bad-token`, `no-repo`, `no-push`); человеку нужно следующее действие, а не код.
// Список закрытый: незнакомое слово даёт общий текст, а не пустоту.

export type MachineStepStrings = {
  pageTitle: string;
  pageHint: string;
  title: string;
  lead: string;
  info: string;
  important: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;
  cta: string;
  busy: string;
  successTitle: string;
  successHint: string;
  failureTitle: string;
  reasons: Record<string, string>;
  reasonUnknown: string;
  verifiedAt: string;
  goPrev: string;
  goNext: string;
};

const ru: MachineStepStrings = {
  pageTitle: "Проверка связи с вашим форком",
  pageHint: "Панель спрашивает GitHub, видит ли она ваш форк и может ли в него писать.",

  title: "Проверить связь",
  lead: "Нажмите — и панель задаст GitHub настоящий вопрос: виден ли ваш форк по названному адресу и разрешает ли токен туда писать.",
  info:
    "Почему это отдельный шаг. Сохранённый адрес и сохранённый токен ещё ничего не значат: в адресе бывает опечатка, у токена — недостаточные права или истёкший срок. Узнать об этом лучше сейчас, чем в ту минуту, когда вы захотите сохранить свои правки.",
  important:
    "Эту отметку ставит машина, а не вы. Пока GitHub не ответил, шаг остаётся открытым — поставить его из вежливости нельзя.",
  actionLead: "Что проверяется:",
  bullets: [
    "Форк по вашему адресу существует и виден по вашему токену.",
    "Токен разрешает запись — без этого сохранить правки в форк будет нечем.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",
  cta: "Проверить связь",
  busy: "Спрашиваю GitHub…",
  successTitle: "Связь есть",
  successHint: "Репозиторий виден, запись разрешена",
  failureTitle: "Связи нет",
  reasons: {
    "no-url": "Адрес форка не сохранён. Вернитесь на первый шаг.",
    "no-token": "Токен не сохранён. Вернитесь на второй шаг.",
    "bad-url": "Адрес не похож на адрес репозитория GitHub. Он должен быть вида https://github.com/ваше-имя/проект.",
    "bad-token": "Токен не принят. Создайте новый и сохраните его на втором шаге.",
    "no-repo": "Форка по этому адресу не видно. Проверьте адрес, а если форк приватный — права токена.",
    "no-push": "Токен видит форк, но писать в него не может. Нужно право Contents: read and write.",
    network: "GitHub не ответил. Попробуйте ещё раз через минуту.",
    "github-error": "GitHub ответил ошибкой. Попробуйте позже.",
  },
  reasonUnknown: "Причина неизвестна. Повторите попытку, а если повторится — напишите нам.",
  verifiedAt: "Проверено",
  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",
};

const en: MachineStepStrings = {
  pageTitle: "Checking the connection to your fork",
  pageHint: "The panel asks GitHub whether it sees your fork and may write into it.",

  title: "Check the connection",
  lead: "Press it and the panel asks GitHub a real question: does a repository exist at the address you named, and does the token allow writing there.",
  info:
    "Why this is a separate step. A saved address and a saved token mean nothing yet: an address can hold a typo, a token can lack rights or have expired. It is better to learn this now than in the middle of the push, when part of the work is already done.",
  important:
    "This mark is placed by the machine, not by you. Until GitHub has answered, the step stays open — you cannot close it out of politeness.",
  actionLead: "What is checked:",
  bullets: [
    "Your fork exists at your address and is visible with your token.",
    "The token allows writing — without that the push will refuse.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",
  cta: "Check the connection",
  busy: "Asking GitHub…",
  successTitle: "The connection is there",
  successHint: "Repository visible, writing allowed",
  failureTitle: "No connection",
  reasons: {
    "no-url": "The fork address is not saved. Go back to step one.",
    "no-token": "The token is not saved. Go back to step two.",
    "bad-url": "The address does not look like a GitHub repository. It must be of the form https://github.com/owner/project.",
    "bad-token": "The token was not accepted. Create a new one and save it on step two.",
    "no-repo": "Your fork is not visible at this address. Check the address, and if it is private — the token rights.",
    "no-push": "The token sees the fork but cannot write into it. Contents: read and write is required.",
    network: "GitHub did not answer. Try again in a minute.",
    "github-error": "GitHub answered with an error. Try again later.",
  },
  reasonUnknown: "The reason is unknown. Try again, and if it repeats — write to us.",
  verifiedAt: "Checked",
  goPrev: "Previous step",
  goNext: "Next step",
};

const DICT: Record<string, MachineStepStrings> = { en, ru };

export function adoptVerifyStrings(lang: string): MachineStepStrings {
  return DICT[lang] ?? en;
}
