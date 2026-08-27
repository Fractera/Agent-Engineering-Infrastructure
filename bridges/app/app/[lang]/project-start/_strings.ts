import type { PathChoiceLabels } from "../_components/launch/path-choice.client";

// СЛОВА ЭКРАНА ВЫБОРА ПУТИ (шаг 28-8, 2026-08-27).
//
// 🔒 ЭТО ТЕКСТ, УТВЕРЖДЁННЫЙ ВЛАДЕЛЬЦЕМ, А НЕ ЗАПОЛНИТЕЛЬ. Он прислал его
// дословно, скопировав с образца, вместе с адресом новой страницы. Поэтому здесь
// он лежит слово в слово: правка «по дороге» — это уже мой текст, а не его.
//
// 🔒 ПОЧЕМУ НЕ В `admin-translations.json`. Словарь панели уезжает в 82 языка, и
// каждая строка в нём — обязательство перевести её восемьдесят раз. Экран выбора
// ещё меняется: владелец ведёт шаг за шагом и будет править слова. Заезжать в
// общий словарь текст обязан ТОГДА, когда он устоялся, — иначе восемьдесят
// переводов делаются дважды. Это записанный долг, а не забывчивость.
//
// Заголовок и подсказка САМОЙ СТРАНИЦЫ живут в словаре — они у раздела есть у
// всех, и без них раздел не показать в крошках и меню.

const ru: PathChoiceLabels = {
  starterBadge: "Путь первый",
  starterTitle: "Запуск проекта со стартового шаблона",
  starterLead:
    "Работающий проект с первой минуты: страницы, слой данных, авторизация и панель уже связаны между собой.",
  starterBullets: [
    "Свой репозиторий, созданный из шаблона",
    "Сайт на вашем адресе раньше, чем вы напишете первую строку кода",
    "Тринадцать шагов по одному — никогда не четыре требования разом",
  ],
  starterMoreLabel: "Что это значит для моего кода",
  starterMore:
    "Шаблон — это форма, которую платформа ожидает. Вы правите страницы и логику; двери между слоями остаются на местах, поэтому обновление не сталкивается с вашей работой.",
  starterCta: "Начать со стартового шаблона",

  adoptBadge: "Путь второй",
  adoptTitle: "Подключение репозитория с проектом Fractera",
  adoptLead:
    "У вас уже есть проект на Fractera. Укажите его — и слот примет ваш проект вместо шаблона.",
  adoptBullets: [
    "Ваш репозиторий остаётся вашим — никуда ничего не копируется",
    "Донор проверяется ДО того, как здесь что-либо заменяется",
    "Четырнадцать шагов: лишний — проверка того, на что вы указали",
  ],
  adoptMoreLabel: "Что проверяется до замены",
  adoptMore:
    "Адрес обязан ответить, у проекта обязана быть форма, которую слот ожидает, и клон обязан лечь в соседнюю папку. Только тогда происходит замена — и никогда наоборот.",
  adoptCta: "Подключить репозиторий",

  picked: "Выбрано: {path}",
  reset: "выбрать заново",
};

const en: PathChoiceLabels = {
  starterBadge: "Path one",
  starterTitle: "Start from the starter template",
  starterLead:
    "A working project from the first minute: pages, the data layer, authorisation and the panel are already wired together.",
  starterBullets: [
    "A repository of your own, created from the template",
    "The site live at your address before you write a line of code",
    "Thirteen steps, one at a time — never four demands at once",
  ],
  starterMoreLabel: "What this means for my code",
  starterMore:
    "The template is the shape the platform expects. You edit pages and logic; the doors between layers stay where they are, so an update never collides with your work.",
  starterCta: "Start from the template",

  adoptBadge: "Path two",
  adoptTitle: "Connect a repository with a Fractera project",
  adoptLead:
    "You already have a project on Fractera. Point at it, and the slot takes your project in place of the template.",
  adoptBullets: [
    "Your repository stays yours — nothing is copied anywhere",
    "The donor is checked BEFORE anything here is replaced",
    "Fourteen steps: the extra one is the check of what you pointed at",
  ],
  adoptMoreLabel: "What is checked before the swap",
  adoptMore:
    "The address must answer, the project must have the shape the slot expects, and the clone must land in a folder next door. Only then does the swap happen — never the other way round.",
  adoptCta: "Connect a repository",

  picked: "Chosen: {path}",
  reset: "choose again",
};

const DICT: Record<string, PathChoiceLabels> = { en, ru };

export function pathChoiceStrings(lang: string): PathChoiceLabels {
  return DICT[lang] ?? en;
}
