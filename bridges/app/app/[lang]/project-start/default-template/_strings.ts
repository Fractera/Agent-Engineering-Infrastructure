import type { StepFormLabels } from "../../_components/launch/step-form.client";

// СЛОВА ПУТИ «СТАРТОВЫЙ ШАБЛОН» (шаг 28-9, 2026-08-27).
//
// 🔒 ТЕКСТ ШАГА 1 — НЕ МОЙ. Он взят из ЖИВОГО мастера, раздел
// `github.step1Title` и соседние строки словаря панели: это уже написанный
// владельцем текст продукта, а не моя выдумка. Разделение на четыре шага —
// его требование («it must to be 4 steps , not 1»), и первый из четырёх есть
// ровно «Адрес репозитория»; слова к нему уже существовали.
//
// 🔒 ЧЕГО Я НЕ ДЕЛАЛ: не сочинял новых формулировок. Владелец сказал «step by
// step together , i give you new text for each» — значит правки текста придут от
// него. То, что стоит здесь, — либо его слова из живого мастера, либо служебные
// подписи интерфейса (кнопка, состояние загрузки, тост).
//
// 🔒 ПОЧЕМУ НЕ В ОБЩЕМ СЛОВАРЕ. Строки шага ещё меняются: владелец ведёт работу
// шаг за шагом. Заезжать в `admin-translations.json` текст обязан тогда, когда
// устоялся, иначе восемьдесят переводов делаются дважды. Записанный долг.

export type StepStrings = {
  /** Заголовок и подсказка страницы шага. */
  pageTitle: string;
  pageHint: string;
  /** Сущности секции шага. */
  badge: string;
  title: string;
  lead: string;
  info: string;
  important: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;
  /** Подписи навигации пройденного шага и замены значения (28-18). */
  goPrev: string;
  goNext: string;
  replace: string;
  /** Подпись ссылки-действия: слово, стоящее перед адресом. */
  linkLabel: string;
  /**
   * Снимок чужого экрана — две РАЗНЫЕ строки, и путать их нельзя.
   *
   * `shotAlt` — ЧТО на снимке; читается вслух тем, кто его не увидит, поэтому
   * называет содержимое, а не повторяет подпись. `shotCaption` — чей это экран
   * и на что смотреть; её видят все.
   */
  shotAlt?: string;
  shotCaption?: string;
  /**
   * Слова формы БЕЗ подписей навигации.
   *
   * 🔒 `goPrev`, `goNext` и `replace` живут на уровне ШАГА, а не формы, и это не
   * мелочь размещения. Они одинаковы у всех шагов пути: «к следующему шагу»
   * значит одно и то же на первом и на десятом. Положи их внутрь формы — и
   * шестнадцать шагов получат шестнадцать копий одной фразы, которые разойдутся
   * при первой правке текста.
   */
  form: Omit<StepFormLabels, "goPrev" | "goNext" | "replace">;
};

const ru1: StepStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг первый",
  title: "Репозиторий на GitHub",
  lead: "Пустой репозиторий — место, где будет жить ваш проект.",
  info:
    "Ваш проект живёт на этом сервере. GitHub — единственная дорога, по которой он может оттуда уехать: на вашу машину, на другой сервер, к коллеге. Без него работа существует ровно в одном месте, и это место — арендованная машина.",
  important:
    "Приватный или публичный — ваш выбор. Безопаснее приватный: в репозитории окажутся ваши файлы настроек.",
  actionLead:
    "Заведите пустой репозиторий на GitHub и вставьте его адрес ниже. Больше на этом шаге ничего не потребуется.",
  bullets: [
    "Откройте свой репозиторий на GitHub",
    "Скопируйте адрес из строки браузера или из зелёной кнопки «Code»",
    "Он выглядит так: https://github.com/владелец/название",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",
  goPrev: "К предыдущему шагу",
  goNext: "К следующему шагу",
  replace: "Заменить значение",
  linkLabel: "ссылка",
  shotAlt:
    "Страница GitHub «Create a new repository»: слева выбор владельца, справа обязательное поле «Repository name», ниже необязательное описание и выбор видимости — публичный или приватный.",
  shotCaption: "Так это выглядит на GitHub: заполняется только имя, остальное можно оставить как есть.",

  form: {
    inputLabel: "Адрес репозитория",
    inputPlaceholder: "https://github.com/owner/repository",
    inputHint: "Токен доступа спросим на следующем шаге — здесь только адрес.",
    cta: "Сохранить адрес",
    busy: "Проверяем…",
    successTitle: "Вы завершили шаг {n} из {total}",
    // 🔒 ОБЕЩАНИЕ ВЕРНУЛОСЬ ВМЕСТЕ С ШАГОМ 2 (28-10): переходить теперь есть
    // куда. Несколькими часами раньше здесь стояла честная строка «появится,
    // когда будет построен» — ровно потому, что шага 2 не существовало.
    successHint: "Перейдёте к следующему шагу — токен доступа — через несколько секунд",
    failureTitle: "Адрес не принят",
    failureFix: "Проверьте, что репозиторий существует и адрес скопирован целиком",
  },
};

const en1: StepStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step one",
  title: "A repository on GitHub",
  lead: "An empty repository — the place where your project will live.",
  info:
    "Your project lives on this server. GitHub is the only road by which it can leave: to your machine, to another server, to a colleague. Without it the work exists in exactly one place, and that place is a rented machine.",
  important:
    "Private or public is your choice. Private is safer: your settings files will end up in the repository.",
  actionLead:
    "Create an empty repository on GitHub and paste its address below. Nothing else is needed on this step.",
  bullets: [
    "Open your repository on GitHub",
    "Copy the address from the browser bar or from the green «Code» button",
    "It looks like this: https://github.com/owner/repository",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",
  goPrev: "To the previous step",
  goNext: "To the next step",
  replace: "Replace the value",
  linkLabel: "link",
  shotAlt:
    "The GitHub page «Create a new repository»: the owner picker on the left, the required «Repository name» field on the right, then an optional description and the visibility choice — public or private.",
  shotCaption: "This is how it looks on GitHub: only the name is filled in, the rest can stay as it is.",

  form: {
    inputLabel: "Repository address",
    inputPlaceholder: "https://github.com/owner/repository",
    inputHint: "The access token is asked on the next step — here only the address.",
    cta: "Save the address",
    busy: "Checking…",
    successTitle: "You finished step {n} of {total}",
    successHint: "You will move to the next step — the access token — in a few seconds",
    failureTitle: "The address was not accepted",
    failureFix: "Check that the repository exists and the address was copied in full",
  },
};

const DICT1: Record<string, StepStrings> = { en: en1, ru: ru1 };

export function stepOneStrings(lang: string): StepStrings {
  return DICT1[lang] ?? en1;
}

// ── ШАГ 2: ТОКЕН ДОСТУПА ────────────────────────────────────────────────────
//
// 🔒 ТЕКСТ СНОВА НЕ МОЙ. Шесть пунктов ниже — строка в строку `github.step2Steps`
// из словаря панели: подробная инструкция по выпуску classic-токена, которую
// владелец уже написал. Разделение на отдельный шаг — его требование, слова —
// его же.
//
// 🔒 ОДНА ВЕЩЬ ИЗ ЖИВОГО МАСТЕРА СЮДА НЕ ПЕРЕЕХАЛА НАМЕРЕННО: ссылка «открыть
// страницу токенов» (`github.step2Link`). Она ведёт на GitHub с параметрами
// нужных прав и полезна — но это ВТОРОЕ действие на шаге, а закон «одно
// действие — один шаг» здесь и проверяется. Ссылка вернётся тогда, когда
// владелец скажет, считать ли её действием или частью описания.

const ru2: StepStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг второй",
  title: "Токен доступа",
  lead: "Ключ, которым сервер получает право писать в ваш репозиторий.",
  info:
    "Токен хранится только на вашем сервере. Публичный репозиторий можно читать без токена, но запись в любой репозиторий требует токена.",
  important:
    "«Select scopes» — длинный список прав. Отметьте РОВНО ОДНО: «repo», первая строка, подписанная «Full control of private repositories». Пять вложенных пунктов отметятся сами. Больше не трогайте ничего: каждая лишняя галочка расширяет то, что сможет сделать украденный токен.",
  actionLead:
    "Выпустите classic-токен на GitHub и вставьте его ниже. Раздел называется «Tokens (classic)»: «Generate new token» → «Generate new token (classic)».",
  bullets: [
    "«Note» — название для себя, чтобы узнать этот токен через год. GitHub его не использует.",
    "«Expiration» — срок жизни. Когда он истечёт, отправка просто перестанет работать. Длинный срок удобнее, короткий безопаснее.",
    "Прокрутите вниз и нажмите «Generate token».",
    "Скопируйте значение сразу: GitHub показывает его ОДИН раз. Уйдёте со страницы — прочитать больше нельзя, только заменить.",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",
  goPrev: "К предыдущему шагу",
  goNext: "К следующему шагу",
  replace: "Заменить значение",
  linkLabel: "ссылка",
  shotAlt:
    "Страница GitHub «New personal access token (classic)»: поле Note, срок жизни «No expiration» с предупреждением, и список прав, где отмечена одна галочка «repo», а пять вложенных отметились сами.",
  shotCaption: "Так это выглядит на GitHub: отмечена РОВНО одна галочка — «repo».",

  form: {
    inputLabel: "Токен доступа (classic, область repo)",
    inputPlaceholder: "ghp_…",
    inputHint: "Токен хранится на вашем сервере и не показывается больше нигде.",
    cta: "Сохранить токен",
    busy: "Проверяем…",
    successTitle: "Вы завершили шаг {n} из {total}",
    successHint: "Перейдёте к следующему шагу — проверка связи — через несколько секунд",
    failureTitle: "Токен не принят",
    failureFix: "Обычно у токена нет области repo либо он скопирован не целиком — выпустите новый",
  },
};

const en2: StepStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step two",
  title: "Access token",
  lead: "The key with which the server gets the right to write to your repository.",
  info:
    "The token is stored only on your server. A public repository can be read without a token, but writing to any repository requires one.",
  important:
    "«Select scopes» is a long list of rights. Tick EXACTLY ONE: «repo», the first line, marked «Full control of private repositories». Five nested items tick themselves. Touch nothing else: every extra tick widens what a stolen token could do.",
  actionLead:
    "Issue a classic token on GitHub and paste it below. The section is «Tokens (classic)»: «Generate new token» → «Generate new token (classic)».",
  bullets: [
    "«Note» is a name for yourself, so you recognise this token in a year. GitHub does not use it.",
    "«Expiration» is its lifetime. When it expires, pushing simply stops working. A long term is more convenient, a short one is safer.",
    "Scroll down and press «Generate token».",
    "Copy the value at once: GitHub shows it ONCE. Leave the page and it can no longer be read, only replaced.",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",
  goPrev: "To the previous step",
  goNext: "To the next step",
  replace: "Replace the value",
  linkLabel: "link",
  shotAlt:
    "The GitHub page «New personal access token (classic)»: the Note field, «No expiration» with a warning, and the scope list where exactly one box — «repo» — is ticked, with five nested ones ticked by themselves.",
  shotCaption: "This is how it looks on GitHub: EXACTLY one box is ticked — «repo».",

  form: {
    inputLabel: "Access token (classic, repo scope)",
    inputPlaceholder: "ghp_…",
    inputHint: "The token is kept on your server and shown nowhere else.",
    cta: "Save the token",
    busy: "Checking…",
    successTitle: "You finished step {n} of {total}",
    successHint: "You will move to the next step — the connection check — in a few seconds",
    failureTitle: "The token was not accepted",
    failureFix: "Usually the token lacks the repo scope or was not copied in full — issue a new one",
  },
};

const DICT2: Record<string, StepStrings> = { en: en2, ru: ru2 };

export function stepTwoStrings(lang: string): StepStrings {
  return DICT2[lang] ?? en2;
}

/**
 * Сколько шагов в пути стартового шаблона.
 *
 * 🔒 ЧИСЛО ЗДЕСЬ ВРЕМЕННОЕ И НАЗВАНО ТАКИМ. Единственный источник порядка шагов
 * живого мастера — `lib/launch.shared.ts` (`starter` 13 шагов), и трогать его
 * нельзя: правка порядка есть изменение живого мастера. Но разделение «шага 1 из
 * 13» на четыре отдельных шага, которого требует владелец, это число меняет.
 * Пока новый путь строится страница за страницей, счётчик живёт здесь; он
 * вернётся в `launch.shared.ts` одной правкой, когда владелец скажет.
 */
export const DEFAULT_TEMPLATE_TOTAL = 16;

/**
 * Сколько шагов пути ПОСТРОЕНО на сегодня.
 *
 * 🔒 ОТДЕЛЬНОЕ ЧИСЛО, А НЕ `DEFAULT_TEMPLATE_TOTAL`, И РАЗНИЦА СОДЕРЖАТЕЛЬНАЯ.
 * Первое говорит, сколько шагов у пути ЗАДУМАНО, второе — сколько существует
 * страницами. Шкала прогресса рисует шестнадцать отрезков (задумано), но
 * ссылками делает только построенные: ссылка на несуществующий шаг ведёт в 404.
 * ✗ оплачено 2026-08-27 проверкой в браузере — нажатие на пятый отрезок увело
 * на `step-5`, которого нет.
 *
 * Число растёт на единицу с каждым новым шагом. Забыть его — значит получить
 * мёртвую ссылку, и это ловится нажатием, а не чтением.
 */
export const DEFAULT_TEMPLATE_BUILT = 9;
