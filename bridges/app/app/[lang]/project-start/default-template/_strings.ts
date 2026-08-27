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

export type StepOneStrings = {
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
  form: StepFormLabels;
};

const ru: StepOneStrings = {
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

  form: {
    inputLabel: "Адрес репозитория",
    inputPlaceholder: "https://github.com/owner/repository",
    inputHint: "Токен доступа спросим на следующем шаге — здесь только адрес.",
    cta: "Сохранить адрес",
    busy: "Проверяем…",
    successTitle: "Вы завершили шаг {n} из {total}",
    // 🔒 ОБЕЩАНИЕ ПЕРЕХОДА УБРАНО, ПОКА ПЕРЕХОДИТЬ НЕКУДА. Здесь стояло
    // «Перейдёте к следующему шагу через несколько секунд», а шага второго ещё
    // нет: тост обещал бы способность, которой нет.
    successHint: "Следующий шаг — токен доступа; он появится здесь, когда будет построен",
    failureTitle: "Адрес не принят",
    failureFix: "Проверьте, что репозиторий существует и адрес скопирован целиком",
  },
};

const en: StepOneStrings = {
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

  form: {
    inputLabel: "Repository address",
    inputPlaceholder: "https://github.com/owner/repository",
    inputHint: "The access token is asked on the next step — here only the address.",
    cta: "Save the address",
    busy: "Checking…",
    successTitle: "You finished step {n} of {total}",
    successHint: "The next step is the access token; it will appear here once it is built",
    failureTitle: "The address was not accepted",
    failureFix: "Check that the repository exists and the address was copied in full",
  },
};

const DICT: Record<string, StepOneStrings> = { en, ru };

export function stepOneStrings(lang: string): StepOneStrings {
  return DICT[lang] ?? en;
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
