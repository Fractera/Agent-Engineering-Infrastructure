import type { AdoptConfirmLabels } from "../../_components/launch/adopt-confirm.client";

// СЛОВА ШАГА ВТОРОГО: ЗАМЕНА СЛОТА СОДЕРЖИМЫМ ДОНОРА (35-3, 2026-08-31).
//
// 🔒 ЭТО НЕ ЗАПОЛНИТЕЛИ. У шага 1 тексты служебные — владелец их ещё не давал.
// Здесь проза владельца СУЩЕСТВУЕТ и написана им самим: `_content/launch-step-
// adopt.ru.md` и `_content/launch-adopt-failed.ru.md`. Она перенесена сюда его
// словами, а не пересказана: пересказ чужого текста своими словами — это второй
// текст, который разойдётся с первым.
//
// 🔒 ЧТО ИМЕННО ИЗМЕНЕНО ПРОТИВ ФАЙЛОВ ПРОЗЫ И ПОЧЕМУ. Формат другой: там
// markdown для страницы, здесь короткие поля под элементы анатомии. Смысл и
// формулировки сохранены дословно везде, где помещаются; сокращения сделаны
// только по длине, ни одно утверждение не добавлено и не усилено.
//
// 🔒 КРАСНЫЙ ТОН — РОВНО ОДИН НА ШАГ, И ЭТО ТОТ САМЫЙ ШАГ, РАДИ КОТОРОГО ОН
// ЗАВЕДЁН. Красный говорит, ЧТО БУДЕТ, если сделать иначе; здесь цена ошибки —
// безвозвратно уничтоженный проект. Он стоит внутри подтверждения, то есть на
// втором движении, а не на входе в шаг: на входе ещё ничего не решено.

const ru: SwapStrings = {
  pageTitle: "Замена проекта в слоте",
  pageHint: "Содержимое слота будет заменено проектом из репозитория-донора.",

  title: "Заменить проект содержимым донора",
  lead:
    "Панель скачает названный вами проект и поставит его на место стартового шаблона. Это и есть то, ради чего вы выбрали этот путь.",
  info:
    "Ничего не сносится, пока репозиторий не отозвался. Панель сначала убеждается, что адрес рабочий, скачивает проект в отдельную папку и только потом меняет местами. Опечатка в адресе не оставит вас без проекта. Файл .env.local замену переживает: в нём ключи слоя данных и адрес сервера — они принадлежат машине, а не проекту.",
  important:
    "Мы не проверяем заранее, что репозиторий действительно построен на архитектуре Fractera: это ваша ответственность. Если окажется иначе, ответит отказ сборки, и мы предложим путь миграции.",
  actionLead: "Что произойдёт по нажатию:",
  bullets: [
    "Проект скачается в отдельную папку рядом со слотом.",
    "Содержимое слота будет заменено, а история донора отсечена: проект перестанет принадлежать чужому репозиторию.",
    "Начнётся сборка. Она идёт минутами, и её ход виден прямо здесь.",
  ],

  stepOf: "Шаг {n} из {total}",
  done: "закрыт",
  goPrev: "Предыдущий шаг",
  goNext: "Следующий шаг",

  action: {
    cta: "Заменить проект в слоте",
    confirmTitle: "Стартовый шаблон будет уничтожен безвозвратно",
    confirmBody:
      "Он будет заменён содержимым указанного репозитория. Панель управления это переживёт — она работает на отдельном порту, — но проект на месте шаблона будет уже другой. Заменяем на:",
    confirmYes: "Да, заменить",
    confirmNo: "Отмена",
    running: "Заменяю…",
    buildWaiting: "Идёт сборка нового проекта — это занимает несколько минут",
    noDonor: "Сначала назовите адрес проекта-донора на первом шаге: заменять пока нечем.",

    okTitle: "Проект заменён и собран",
    okHint: "Слот отвязан от репозитория донора: дальше проект ваш.",

    failTitle: "Замена не состоялась",
    slotIntact: "Ваш проект цел — ничего не заменялось.",
    reasons: {
      repo_not_set: "Адрес донора пуст. Вернитесь на первый шаг и назовите его.",
      repo_not_found: "Репозитория по этому адресу нет. Проверьте адрес целиком, включая имя владельца.",
      auth_failed: "Репозиторий закрыт, и прочитать его нечем. Сохраните токен доступа или выберите публичный проект.",
      network: "Сеть не ответила. Попробуйте ещё раз через минуту.",
      slot_missing: "Папка слота не найдена. Это дефект сервера — напишите нам.",
      "no-donor-url": "Адрес донора не сохранён. Вернитесь на первый шаг.",
      "not-replaced": "Замена ещё не выполнялась — слот пока прежний. Нажмите «Заменить проект в слоте».",
      "slot-not-a-repo": "Слот не стал репозиторием. Замена оборвалась на полпути — напишите нам.",
      "still-attached": "Слот всё ещё связан с репозиторием донора. Отвязка не сработала — напишите нам.",
      "not-built": "Сборки в слоте нет. Подождите её окончания и обновите страницу.",
    },
    reasonUnknown: "Причина неизвестна. Повторите попытку, а если повторится — напишите нам.",

    depsFailedTitle: "Не удалось подготовить проект к сборке",
    depsFailedBody:
      "Проект приехал целиком и лежит в слоте — с ним всё в порядке. Не удалось установить библиотеки, из которых он собирается: чаще всего это сеть или нехватка памяти на сервере. Это наша сторона, а не ваш проект: переделывать в нём ничего не нужно.",
    depsRetry: "Повторить",
    buildFailedTitle: "Сборка не прошла",
    buildFailedBody:
      "Существует какое-то несоответствие архитектуры — или вы подключили проект, который не является частью архитектуры Fractera. Если ваш проект создан другим фреймворком, или же он создан на Next, но не по архитектуре Fractera, вам необходимо выбрать процесс миграции: он позволит использовать стартовый шаблон и с помощью специального алгоритма, навыков и инструментов пройти трансформацию вашего проекта в архитектуру Fractera.",
    restoreCta: "Вернуть стартовый шаблон",
    restoreRunning: "Возвращаю…",
    mailCta: "Написать нам",
    mailSubject: "Fractera: сборка подключённого проекта не прошла",
    mailBody: "Здравствуйте! Я подключил проект {repoUrl}, и сборка не прошла. Прошу помочь с переносом.",
    migrationCta: "Перейти к миграции",
  },
};

const en: SwapStrings = {
  pageTitle: "Replacing the project in the slot",
  pageHint: "The contents of the slot will be replaced by the project from the donor repository.",

  title: "Replace the project with the donor's contents",
  lead:
    "The panel will download the project you named and put it in place of the starter template. This is what you chose this path for.",
  info:
    "Nothing is destroyed until the repository has answered. The panel first makes sure the address works, downloads the project into a separate folder, and only then swaps them. A typo in the address will not leave you without a project. The .env.local file survives the swap: it holds the data-layer keys and the server address — they belong to the machine, not to the project.",
  important:
    "We do not check in advance that the repository is really built on the Fractera architecture: that is your responsibility. If it turns out otherwise, the build will refuse, and we will offer you the migration path.",
  actionLead: "What happens when you press:",
  bullets: [
    "The project is downloaded into a separate folder next to the slot.",
    "The slot's contents are replaced and the donor's history is cut off: the project stops belonging to someone else's repository.",
    "The build starts. It takes minutes, and its progress is visible right here.",
  ],

  stepOf: "Step {n} of {total}",
  done: "done",
  goPrev: "Previous step",
  goNext: "Next step",

  action: {
    cta: "Replace the project in the slot",
    confirmTitle: "The starter template will be destroyed irreversibly",
    confirmBody:
      "It will be replaced by the contents of the repository you named. The control panel survives this — it runs on a separate port — but the project in place of the template will be a different one. Replacing with:",
    confirmYes: "Yes, replace",
    confirmNo: "Cancel",
    running: "Replacing…",
    buildWaiting: "Building the new project — this takes a few minutes",
    noDonor: "Name the donor project's address on the first step: there is nothing to replace with yet.",

    okTitle: "The project is replaced and built",
    okHint: "The slot is detached from the donor repository: from here on the project is yours.",

    failTitle: "The replacement did not happen",
    slotIntact: "Your project is intact — nothing was replaced.",
    reasons: {
      repo_not_set: "The donor address is empty. Go back to the first step and name it.",
      repo_not_found: "There is no repository at this address. Check the whole address, including the owner's name.",
      auth_failed: "The repository is private and there is nothing to read it with. Save an access token or pick a public project.",
      network: "The network did not answer. Try again in a minute.",
      slot_missing: "The slot folder was not found. This is a server defect — write to us.",
      "no-donor-url": "The donor address is not saved. Go back to the first step.",
      "not-replaced": "The replacement has not run yet — the slot is still the old one. Press \"Replace the project in the slot\".",
      "slot-not-a-repo": "The slot did not become a repository. The replacement broke halfway — write to us.",
      "still-attached": "The slot is still linked to the donor repository. The detach did not work — write to us.",
      "not-built": "There is no build in the slot. Wait for it to finish and reload the page.",
    },
    reasonUnknown: "The reason is unknown. Try again, and if it repeats — write to us.",

    depsFailedTitle: "Could not prepare the project for building",
    depsFailedBody:
      "The project arrived whole and sits in the slot — nothing is wrong with it. What failed is installing the libraries it is built from: most often the network, or not enough memory on the server. This is our side, not your project: there is nothing to change in it.",
    depsRetry: "Try again",
    buildFailedTitle: "The build did not pass",
    buildFailedBody:
      "There is some mismatch of architecture — or you connected a project that is not part of the Fractera architecture. If your project was made with another framework, or made on Next but not by the Fractera architecture, you need to choose the migration process: it lets you use the starter template and, with a special algorithm, skills and tools, transform your project into the Fractera architecture.",
    restoreCta: "Bring back the starter template",
    restoreRunning: "Bringing back…",
    mailCta: "Write to us",
    mailSubject: "Fractera: the build of the connected project did not pass",
    mailBody: "Hello! I connected the project {repoUrl} and the build did not pass. Please help me move it over.",
    migrationCta: "Go to migration",
  },
};

export type SwapStrings = {
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
  goPrev: string;
  goNext: string;
  action: AdoptConfirmLabels;
};

const DICT: Record<string, SwapStrings> = { en, ru };

export function adoptSwapStrings(lang: string): SwapStrings {
  return DICT[lang] ?? en;
}
