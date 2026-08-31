import type { StepStrings } from "../default-template/_strings";

/**
 * Анатомия шага второго пути — та же, что у первого, **минус бейдж**.
 *
 * 🔒 БЕЙДЖ УБРАН ИЗ СЛОВ НАМЕРЕННО (75-2): он выводится из позиции шага
 * (`stepBadge`), а не пишется руками в каждом модуле. Первый путь свои бейджи
 * по-прежнему пишет словами, и трогать его тип нельзя: сделать поле
 * необязательным значило бы разрешить первому пути молча потерять бейдж.
 *
 * 🔒 `Omit` ОТ ОБЩЕГО ТИПА, А НЕ ВТОРОЙ СПИСОК ПОЛЕЙ. Так правка анатомии
 * доезжает до обоих путей сразу или не доезжает ни до одного — третьего исхода
 * нет. Свой список полей разошёлся бы с первым на первой же правке формы шага.
 */
export type AdoptStepStrings = Omit<StepStrings, "badge">;

// СЛОВА ВТОРОГО ПУТИ — «СВОЙ РЕПОЗИТОРИЙ FRACTERA» (35-1, переписаны 75-1).
//
// 🪦 ПЕРВЫЙ ШАГ СПРАШИВАЛ АДРЕС ЧУЖОГО ПРОЕКТА-ДОНОРА. Владелец назвал эту
// модель неверной 2026-08-31: «предполагается что пользователь сделал Fork
// существующего проекта а потом начал с ним работать уже сразу своим
// репозитории». Теперь шаг спрашивает адрес ЕГО ФОРКА — то есть репозитория,
// который уже принадлежит ему.
//
// 🔒 РАЗНИЦА НЕ В СЛОВАХ, А В ТОМ, ЧЕЙ РЕПОЗИТОРИЙ. Из донора проект надо было
// вынимать и отвязывать; из форка — просто взять, потому что он уже свой. Отсюда
// и исчезли два шага пути: заводить пустой репозиторий и отправлять в него
// проект больше незачем.
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
 * 🔒 ДВЕНАДЦАТЬ, А НЕ ОДИННАДЦАТЬ, И РАЗНИЦА НЕ В ДЛИНЕ. У второго пути есть
 * то, чего у первого нет вовсе: принять донора, отвязать его от чужого
 * репозитория, присвоить проект себе. Общий хвост при этом тот же.
 */
/**
 * Как называется путь. Показывается заголовком на КАЖДОМ его шаге.
 *
 * ✗ 🔒 ШЕСТЬ ШАГОВ ИЗ ДВЕНАДЦАТИ ПРЕДСТАВЛЯЛИСЬ «СТАРТОВЫМ ШАБЛОНОМ» — именем
 * ПЕРВОГО пути (измерено 75-4: 14 совпадений на пути). Слова хвоста общие, и
 * заголовок приходил вместе с ними. Теперь имя пути своё, а слова шага общие.
 */
const PATH_NAME: Record<string, { title: string; hint: string }> = {
  ru: {
    title: "Свой репозиторий Fractera",
    hint: "Путь для проекта, который уже построен на Fractera: вы делаете форк и работаете в нём.",
  },
  en: {
    title: "Your own Fractera repository",
    hint: "The way for a project already built on Fractera: you fork it and work in your fork.",
  },
};

export function adoptPathName(lang: string): { title: string; hint: string } {
  return PATH_NAME[lang] ?? PATH_NAME.en;
}

export const ADOPT_PATH_TOTAL = 12;

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
// ── БЕЙДЖ ШАГА — ОДИН ИСТОЧНИК ВМЕСТО ШЕСТНАДЦАТИ (75-2) ────────────────────
//
// ✗ 🔒 БЕЙДЖИ БЫЛИ НАПИСАНЫ РУКАМИ В КАЖДОМ МОДУЛЕ СЛОВ: «Шаг третий», «Step
// three» — шестнадцать строк на семь шагов. Пока путь строился подряд, это
// работало; но шаг 75 двигает нумерацию ДВАЖДЫ (здесь и в 75-4), и каждый сдвиг
// требовал бы переписать бейдж вручную в каждом задетом модуле. Забытый бейдж не
// ломает сборку и не виден в замере разметки: страница просто называет себя
// чужим номером, и человек верит ей.
//
// 🔒 БЕЙДЖ ВЫВОДИТСЯ ИЗ ПОЗИЦИИ, А ПОЗИЦИЯ ЖИВЁТ В ОДНОМ МЕСТЕ — в перечислении
// шагов пути. Значит переставить шаги теперь можно, не трогая ни одного слова.
//
// 🔒 ПОРЯДКОВЫЕ ПИШУТСЯ СЛОВАМИ, А НЕ ЦИФРОЙ. «Шаг 3» и «Шаг третий» — разный
// тон; второй выбран владельцем на первом пути, и второй путь обязан звучать так
// же, иначе два пути одного продукта заговорят по-разному.
const ORDINALS: Record<string, readonly string[]> = {
  ru: ["первый", "второй", "третий", "четвёртый", "пятый", "шестой", "седьмой",
       "восьмой", "девятый", "десятый", "одиннадцатый", "двенадцатый",
       "тринадцатый", "четырнадцатый"],
  en: ["one", "two", "three", "four", "five", "six", "seven",
       "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen"],
};

/** Бейдж шага по его номеру. Номер вне списка — бейджа нет вовсе, а не «Шаг undefined». */
export function stepBadge(lang: string, n: number): string | undefined {
  const words = ORDINALS[lang] ?? ORDINALS.en;
  const word = words[n - 1];
  if (!word) return undefined;
  return lang === "ru" ? `Шаг ${word}` : `Step ${word}`;
}

export const ADOPT_BUILT_STEPS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Построен ли шаг под этим номером. */
export const adoptStepBuilt = (n: number): boolean => ADOPT_BUILT_STEPS.includes(n);

const ru: AdoptStepStrings = {
  pageTitle: "Свой репозиторий Fractera",
  pageHint: "Путь для проекта, который уже построен на Fractera: слот принимает его вместо шаблона.",

  title: "Форк проекта, который вы будете развивать",
  lead: "Найдите на GitHub проект на Fractera, который хотите взять за основу, и нажмите на его странице кнопку Fork. Потом назовите здесь адрес получившегося репозитория — вашего.",
  info:
    "Что такое форк. Это ваша собственная копия чужого репозитория, которую GitHub делает одним нажатием. Она сразу лежит в вашей учётной записи, под вашим именем, и вы вправе менять в ней что угодно — исходный проект от этого не меняется. Именно поэтому дальше не понадобится ни заводить пустой репозиторий, ни отправлять туда проект: он уже ваш и уже на месте.",
  important:
    "Назовите адрес ВАШЕГО форка, а не исходного проекта. Отличить просто: в адресе форка стоит ваше имя на GitHub, а не чужое.",
  actionLead: "Что понадобится:",
  bullets: [
    "Учётная запись на GitHub — форк делается от вашего имени.",
    "Адрес вашего форка целиком, вида https://github.com/ваше-имя/проект.",
    "Форк можно сделать приватным: следующий шаг спросит токен, и панель прочитает его по нему.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",

  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",
  replace: "Заменить адрес",
  linkLabel: "Что такое форк",

  form: {
    inputLabel: "Адрес вашего форка",
    inputPlaceholder: "https://github.com/ваше-имя/проект",
    inputHint: "Откройте свой форк на GitHub и скопируйте адрес из адресной строки браузера.",
    cta: "Сохранить адрес",
    busy: "Сохраняю…",
    successTitle: "Адрес сохранён — шаг {n} из {total} закрыт",
    successHint: "Дальше понадобится токен доступа.",
    failureTitle: "Не получилось сохранить",
    failureFix: "Проверьте, отвечает ли панель, и нажмите ещё раз.",
  },
};

const en: AdoptStepStrings = {
  pageTitle: "Your own Fractera repository",
  pageHint: "The way for a project already built on Fractera: the slot takes it in place of the template.",

  title: "A fork of the project you will develop",
  lead: "Find a Fractera project on GitHub you want to build on and press Fork on its page. Then name the address of the repository you get — your own.",
  info:
    "What a fork is. It is your own copy of someone else's repository, made by GitHub in one press. It sits in your account under your name straight away, and you may change anything in it — the original project is untouched. That is exactly why you will not need to create an empty repository or push the project into it later: it is yours already and already in place.",
  important:
    "Name the address of YOUR fork, not of the original project. Telling them apart is easy: the fork address carries your GitHub name, not someone else's.",
  actionLead: "What you will need:",
  bullets: [
    "A GitHub account — the fork is made under your name.",
    "The full address of your fork, of the form https://github.com/your-name/project.",
    "The fork may be private: the next step asks for a token, and the panel reads it with that.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",

  goPrev: "Previous step",
  goNext: "Next step",
  replace: "Replace the address",
  linkLabel: "What a fork is",

  form: {
    inputLabel: "Your fork's address",
    inputPlaceholder: "https://github.com/your-name/project",
    inputHint: "Open your fork on GitHub and copy the address from your browser's address bar.",
    cta: "Save the address",
    busy: "Saving…",
    successTitle: "Address saved — step {n} of {total} is done",
    successHint: "An access token comes next.",
    failureTitle: "Could not save",
    failureFix: "Check that the panel answers, then press again.",
  },
};

const DICT: Record<string, AdoptStepStrings> = { en, ru };

export function adoptStepOneStrings(lang: string): AdoptStepStrings {
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
    pick: "Fork this project",
    ownHint:
      "Any other Fractera project works the same way: fork it on GitHub and put your fork's address in the field below. These are a safe starting point, not a list of what is allowed.",
  },
  ru: {
    title: "Проекты, собранные нами",
    promise:
      "Каждый из них собран нами из этого шаблона и проверен: это целый проект, а не витрина. Начните с одного из них, если хотите просто увидеть, как работает путь.",
    pick: "Сделать форк",
    ownHint:
      "Любой другой проект на Fractera подходит так же: сделайте его форк на GitHub и впишите адрес форка в поле ниже. Это безопасное начало, а не перечень допустимого.",
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
    lead: "Twelve steps: fork the project, put it on your server, make the details yours, and bring it online at your address.",
    startLabel: "Start from step one",
  },
  ru: {
    lead: "Двенадцать шагов: сделать форк проекта, поставить его на свой сервер, присвоить реквизиты и вывести в интернет по своему адресу.",
    startLabel: "Начать с первого шага",
  },
};

export function adoptPathStrings(lang: string): AdoptPathStrings {
  return PATH[lang] ?? PATH.en;
}
