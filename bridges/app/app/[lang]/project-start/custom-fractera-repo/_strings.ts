import type { StepStrings } from "../default-template/_strings";

// СЛОВА ВТОРОГО ПУТИ — «СВОЙ РЕПОЗИТОРИЙ FRACTERA» (35-1, 2026-08-31).
//
// 🔒 ТИП БЕРЁТСЯ У ПЕРВОГО ПУТИ, А НЕ ПИШЕТСЯ ЗАНОВО. Анатомия шага одна на оба
// пути: бейдж, заголовок, лид, подсказки, действие, навигация. Второй тип с теми
// же полями означал бы, что правка формы шага доезжает до одного пути и не
// доезжает до другого — и заметить это можно было бы, только открыв оба подряд.
//
// 🔒 СЛОВА ЖЕ СВОИ, И ЭТО НЕ ПРОТИВОРЕЧИЕ. Асимметрия путей содержательная: в
// первом человек ОТПРАВЛЯЕТ свой проект в свой пустой репозиторий, во втором
// сначала ПРИНИМАЕТ чужой и должен освободить его от прежнего владельца. Одни и
// те же слова на двух разных действиях врали бы о том, что происходит.
//
// 🛑 ТЕКСТЫ ЗДЕСЬ СЛУЖЕБНЫЕ — заполнители, поставленные до слов владельца.
// Решение шага 35: «сочинение текстов шагов в шаг не входит: их даёт владелец, в
// коде стоят служебные заполнители». Заменяются его словами по мере прохождения
// пути, ровно как это шло у первого.

/**
 * Сколько шагов у пути ЗАДУМАНО.
 *
 * 🔒 ЧЕТЫРНАДЦАТЬ, А НЕ ОДИННАДЦАТЬ, И РАЗНИЦА НЕ В ДЛИНЕ. У второго пути есть
 * то, чего у первого нет вовсе: принять донора, отвязать его от чужого
 * репозитория, присвоить проект себе. Общий хвост при этом тот же.
 */
export const ADOPT_PATH_TOTAL = 14;

/**
 * Какие шаги ПОСТРОЕНЫ на сегодня.
 *
 * 🔒 ПЕРЕЧИСЛЕНИЕ, А НЕ ЧИСЛО, И ЭТО НЕ УСЛОЖНЕНИЕ (35-5). У первого пути шаги
 * строились подряд, и числа хватало. Второй путь строится с ДЫРОЙ: общий хвост
 * 8–12 приехал переиспользованием готового, а шаги своего репозитория 4–7 ещё
 * впереди (35-6). Число «построено 12» сделало бы ссылками отрезки 4–7 —
 * то есть увело бы человека в 404 ровно тем способом, которым это уже было
 * оплачено 2026-08-27.
 *
 * 🔒 ИСТОЧНИК ОДИН. Шкала, навигация «вперёд/назад» и ссылки крошек читают эту
 * же строку: второй список разошёлся бы с первым в тот день, когда появятся 4–7.
 */
export const ADOPT_BUILT_STEPS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** Построен ли шаг под этим номером. */
export const adoptStepBuilt = (n: number): boolean => ADOPT_BUILT_STEPS.includes(n);

const ru: StepStrings = {
  pageTitle: "Свой репозиторий Fractera",
  pageHint: "Путь для проекта, который уже построен на Fractera: слот принимает его вместо шаблона.",

  badge: "Шаг первый",
  title: "Адрес проекта-донора",
  lead: "Репозиторий, из которого приедет проект. Это может быть чужой публичный проект на Fractera или ваш собственный, лежащий в другом месте.",
  info:
    "Проект приедет целиком, вместе со своим оформлением и настройками — за ним вы сюда и пришли. От прежнего владельца он будет освобождён: история и связь с его репозиторием отсекаются, и дальше проект ваш.",
  important:
    "Сейчас ничего не заменяется. Этот шаг только запоминает адрес: замена — отдельный шаг, и он предупредит о себе отдельно.",
  actionLead: "Что понадобится:",
  bullets: [
    "Адрес репозитория целиком, вида https://github.com/владелец/проект.",
    "Право читать его: публичный читается сразу, закрытый — по вашему токену, который спросит следующий шаг.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",

  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",
  replace: "Заменить адрес",
  linkLabel: "Открыть GitHub",

  form: {
    inputLabel: "Адрес репозитория-донора",
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
  pageTitle: "Your own Fractera repository",
  pageHint: "The way for a project already built on Fractera: the slot takes it in place of the template.",

  badge: "Step one",
  title: "Address of the donor project",
  lead: "The repository the project will come from. It can be someone else's public Fractera project or your own, living elsewhere.",
  info:
    "The project arrives whole, with its look and its settings — that is what you came for. It will be freed from its previous owner: the history and the link to his repository are cut, and from then on the project is yours.",
  important:
    "Nothing is replaced yet. This step only remembers the address: the swap is a separate step, and it will warn you on its own.",
  actionLead: "What you will need:",
  bullets: [
    "The full repository address, of the form https://github.com/owner/project.",
    "The right to read it: a public one reads straight away, a private one by your token, which the next step will ask for.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",

  goPrev: "Previous step",
  goNext: "Next step",
  replace: "Replace the address",
  linkLabel: "Open GitHub",

  form: {
    inputLabel: "Donor repository address",
    inputPlaceholder: "https://github.com/owner/project",
    inputHint: "The full address of the repository page. Copy it from your browser's address bar.",
    cta: "Save the address",
    busy: "Saving…",
    successTitle: "Address saved — step {n} of {total} is done",
    successHint: "An access token comes next.",
    failureTitle: "Could not save",
    failureFix: "Check that the panel answers, then press again.",
  },
};

const DICT: Record<string, StepStrings> = { en, ru };

export function adoptStepOneStrings(lang: string): StepStrings {
  return DICT[lang] ?? en;
}

// ── СЛОВА БЛОКА РЕКОМЕНДОВАННЫХ ДОНОРОВ (35-1а) ─────────────────────────────
//
// 🔒 ОБЕЩАНИЕ СФОРМУЛИРОВАНО КАК «СОБРАНО НАМИ», А НЕ «ЗАПУСТИТСЯ НА 100%».
// Слово владельца пришлось ослабить, и это не редактура: наш собственный пример
// упадёт при другой версии Node, при незаполненных ключах, при чужих настройках
// сервера. Обещание, которого продукт не держит, человек проверяет в свой худший
// день (✗ оплачено шагом 65).
//
// 🔒 СТРОКА ПРО СВОЁ ПОЛЕ ОБЯЗАТЕЛЬНА. Рекомендация ничего не запрещает, и это
// надо сказать словами — иначе список наших проектов читается как перечень
// допустимого, а человек со своим проектом решает, что пришёл не туда.

export type DonorPickerStrings = {
  title: string;
  promise: string;
  pick: string;
  ownHint: string;
};

const PICKER: Record<string, DonorPickerStrings> = {
  en: {
    title: "Projects we assembled ourselves",
    promise:
      "Each of these was built by us from this template and checked: it is a whole project, not a demo. Start with one of them if you only want to see how the path works.",
    pick: "Put this address in the field",
    ownHint:
      "Your own address is just as welcome — put any repository in the field below. These are a safe starting point, not a list of what is allowed.",
  },
  ru: {
    title: "Проекты, собранные нами",
    promise:
      "Каждый из них собран нами из этого шаблона и проверен: это целый проект, а не витрина. Начните с одного из них, если хотите просто увидеть, как работает путь.",
    pick: "Подставить этот адрес",
    ownHint:
      "Свой адрес принимается ровно так же — впишите в поле ниже любой репозиторий. Это безопасное начало, а не перечень допустимого.",
  },
};

export function adoptPickerStrings(lang: string): DonorPickerStrings {
  return PICKER[lang] ?? PICKER.en;
}

// ── СЛОВА ВХОДА В ПУТЬ ──────────────────────────────────────────────────────
//
// 🔒 ВХОД НЕ ПОКАЗЫВАЕТ СПИСОК ИЗ ЧЕТЫРНАДЦАТИ ПУНКТОВ. У первого пути карта
// появилась решением владельца (28-13) и отвечает на вопрос «где я» — но она
// показывает ПРОЙДЕННОЕ. Здесь пройденного пока нет: построен один шаг, и карта
// из одной строки была бы не картой, а кнопкой с лишней рамкой. Карта придёт
// вместе с шагами (35-6), а не раньше них.

export type AdoptPathStrings = { lead: string; startLabel: string };

const PATH: Record<string, AdoptPathStrings> = {
  en: {
    lead: "Fourteen steps: take in the donor project, free it from its previous owner, make it yours, and put it online at your address.",
    startLabel: "Start from step one",
  },
  ru: {
    lead: "Четырнадцать шагов: принять проект-донор, освободить его от прежнего владельца, присвоить себе и вывести в интернет по своему адресу.",
    startLabel: "Начать с первого шага",
  },
};

export function adoptPathStrings(lang: string): AdoptPathStrings {
  return PATH[lang] ?? PATH.en;
}
