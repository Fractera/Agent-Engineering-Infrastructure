// Контракт данных раздела «Верхнее меню».
//
// Форма повторяет то, что читает гостевое приложение
// (`fractera-next-starter/lib/menu/nav-config.ts`), — намеренно дословно: две
// формы одного и того же расходятся молча, и расхождение обнаруживается на
// живом сайте, а не здесь.

/** Пункт второго уровня — только внутри группы, дальше вложенности нет. */
export type NavChild = {
  id: string;
  /** Путь БЕЗ языка: `/products`. Язык подставляет приложение. */
  href: string;
  order: number;
  /** Базовая подпись; переводы живут в `i18n["nav.top.<id>.label"]`. */
  label: string;
};

export type NavItem = {
  id: string;
  /** У виртуальной группы адреса нет — она ведёт на первого ребёнка. */
  href?: string;
  order: number;
  label: string;
  children?: NavChild[];
};

export type NavState = {
  top: NavItem[];
  authSide: "left" | "right";
};

/** Публичный маршрут приложения — кандидат в кнопки меню. */
export type RouteCandidate = {
  /** Путь без языка: `/products`, `/blog/sample-1`. */
  href: string;
  /** Что показать человеку в списке кандидатов. */
  title: string;
};
