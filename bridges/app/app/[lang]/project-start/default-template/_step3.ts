// СЛОВА ШАГА 3 — ПРОВЕРКА СВЯЗИ (28-16, 2026-08-27).
//
// 🔒 ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ДОПИСКА В `_strings.ts`. У третьего шага НЕТ формы:
// его закрывает машина, а не человек, поэтому тип `StepStrings` с обязательным
// разделом `form` ему не годится. Втиснуть его туда значило бы завести у формы
// «пустой» вид — то есть сделать вид, что шаг чего-то ждёт от рук человека.
//
// 🔒 ТЕКСТ — ИЗ ЖИВОГО МАСТЕРА (`github.step3Title`, `github.step3Body`), а не
// сочинён мной. Владелец: «i give you new text for each»; здесь его слова уже
// существовали.

export type StepThreeStrings = {
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
  cta: string;
  busy: string;
  successTitle: string;
  successHint: string;
  failureTitle: string;
  /**
   * Причина отказа → ЧТО ДЕЛАТЬ. Ключи — машинные слова двери.
   *
   * 🔒 ЗДЕСЬ НЕ ОПИСАНИЕ ОШИБКИ, А СЛЕДУЮЩЕЕ ДЕЙСТВИЕ. «Токен не подошёл» есть
   * сообщение о состоянии программы; человеку нужно знать, что выпустить новый и
   * отметить область `repo`.
   */
  reasons: Record<string, string>;
  reasonUnknown: string;
  /** Строка о том, когда связь была проверена. */
  verifiedAt: string;
};

const ru: StepThreeStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг третий · закрывает система",
  title: "Подключить и проверить",
  lead:
    "Подключение сразу спрашивает у GitHub, действительно ли эти данные достают до указанного репозитория.",
  info:
    "Зелёное состояние означает, что пришёл настоящий ответ от GitHub, а не то, что поля заполнены. Это и есть разница между «введено» и «проверено».",
  important:
    "Этот шаг нельзя закрыть галочкой «я это сделал». У панели нет способа поверить вам на слово: либо GitHub ответил, либо нет.",
  actionLead: "От вас на этом шаге не требуется ничего — только нажать проверку.",
  bullets: [
    "Проверяется адрес из первого шага вместе с токеном из второго",
    "Не примет GitHub — причина появится здесь же, а не позже при отправке",
    "Обычная причина отказа: у токена нет области repo либо адрес указывает не туда",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",
  cta: "Проверить связь",

  busy: "Спрашиваем GitHub…",
  successTitle: "Связь проверена",
  successHint: "GitHub подтвердил: этот токен достаёт до этого репозитория и может в него писать",
  failureTitle: "Связь не подтверждена",
  reasons: {
    "no-url": "Сначала вернитесь на первый шаг и сохраните адрес репозитория.",
    "no-token": "Сначала вернитесь на второй шаг и сохраните токен доступа.",
    "bad-url": "Адрес не похож на репозиторий GitHub. Он выглядит так: https://github.com/владелец/название",
    "bad-token": "GitHub не принял токен. Выпустите новый classic-токен и отметьте область «repo».",
    "no-repo":
      "GitHub не нашёл этот репозиторий ЭТИМ токеном. Проверьте адрес; если репозиторий приватный, у токена должна стоять область «repo».",
    "no-push":
      "Токен читает репозиторий, но не может в него писать. Выпустите новый и отметьте область «repo» целиком.",
    network: "GitHub не ответил. Это не про ваш токен — попробуйте ещё раз через минуту.",
    "github-error": "GitHub ответил ошибкой на своей стороне. Попробуйте ещё раз через минуту.",
  },
  reasonUnknown: "Причина неизвестна. Попробуйте ещё раз; если повторится — сообщите нам.",
  verifiedAt: "Проверено:",
};

const en: StepThreeStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step three · closed by the system",
  title: "Connect and verify",
  lead:
    "Connecting asks GitHub straight away whether these credentials actually reach that repository.",
  info:
    "Green means a real answer came back from GitHub — not that the fields are filled in. That is the whole difference between «entered» and «verified».",
  important:
    "This step cannot be closed with an «I have done this» tick. The panel has no way to take your word for it: either GitHub answered, or it did not.",
  actionLead: "Nothing is required from you on this step — only pressing the check.",
  bullets: [
    "The address from step one is checked together with the token from step two",
    "If GitHub refuses, the reason appears right here, not later during the push",
    "The usual reason: the token lacks the repo scope, or the address points elsewhere",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",
  cta: "Verify the connection",

  busy: "Asking GitHub…",
  successTitle: "The connection is verified",
  successHint: "GitHub confirmed: this token reaches this repository and can write to it",
  failureTitle: "The connection was not confirmed",
  reasons: {
    "no-url": "Go back to step one and save the repository address first.",
    "no-token": "Go back to step two and save the access token first.",
    "bad-url": "The address does not look like a GitHub repository. It looks like https://github.com/owner/name",
    "bad-token": "GitHub did not accept the token. Issue a new classic token and tick the «repo» scope.",
    "no-repo":
      "GitHub did not find this repository with THIS token. Check the address; if the repository is private, the token needs the «repo» scope.",
    "no-push":
      "The token can read the repository but cannot write to it. Issue a new one with the whole «repo» scope ticked.",
    network: "GitHub did not answer. This is not about your token — try again in a minute.",
    "github-error": "GitHub answered with an error on its side. Try again in a minute.",
  },
  reasonUnknown: "The reason is unknown. Try again; if it repeats, tell us.",
  verifiedAt: "Verified:",
};

const DICT: Record<string, StepThreeStrings> = { en, ru };

export function stepThreeStrings(lang: string): StepThreeStrings {
  return DICT[lang] ?? en;
}
