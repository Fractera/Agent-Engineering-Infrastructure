import type { Passport } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import Hero from "./hero";
import StatusBar from "./status-bar";
import HowItWorks from "./how-it-works.client";
import NavDrawer, { type NavGroup } from "./nav-drawer.client";

// ШАПКА АВТОМАТИЗАЦИИ — маршрутизатор по поверхности. Всё, что она рисует, выведено из ядра (паспорт +
// список вкладок), переданного пропсами: страница (page.tsx) — единственная точка, читающая платформу,
// поэтому папка остаётся переносимой (закон 0).
//
//   admin  → ТОЛЬКО полоса-шапка (бейджи · имя · меню · «отправить задание»). Героя здесь НЕТ —
//            центрированный блок имя/бейджи/описание принадлежит публичной поверхности (решение
//            владельца 2026-07-21).
//   public → герой (бейджи · имя · описание по центру) + иконка Sparkle («как это работает») в правом
//            верхнем углу. Много кнопок у публичной поверхности нет.
// Строка вкладки для шапки: имя, присутствие и — для оглавления витрины — её сущности с уже
// разрешёнными на языке страницы подписями (страница остаётся единственной точкой чтения платформы).
type TabRow = {
  name: string;
  presence: "absent" | "collapsed" | "expanded";
  entities: { cuid: string; title: string }[];
};

export default function AutomationChrome({
  surface,
  passport,
  lang,
  tabs,
  publicHref,
  built,
}: {
  surface: Surface;
  passport: Passport;
  lang: string;
  tabs: TabRow[];
  publicHref: string;
  /** Построена ли автоматизация (паспорт: lifecycle=real-project) — от этого зависит судьба публичной ссылки. */
  built: boolean;
}) {
  if (surface === "admin") {
    return (
      <div data-chrome-root="admin">
        <StatusBar passport={passport} lang={lang} tabs={tabs} publicHref={publicHref} built={built} />
      </div>
    );
  }

  // ВИТРИНА: слева от Sparkle — гамбургер, открывающий ящик навигации по разделам страницы (на витрине
  // аккордеонов нет, страница длинная, и оглавление заменяет их как способ добраться до нужного места).
  const groups: NavGroup[] = tabs
    .filter((t) => t.presence !== "absent" && t.entities.length > 0)
    .map((t) => ({ tab: t.name, title: t.name.replace(/-/g, " "), entities: t.entities }));

  return (
    <div data-chrome-root="public" className="relative">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <NavDrawer groups={groups} lang={lang} />
        <HowItWorks lang={lang} />
      </div>
      <Hero passport={passport} surface="public" />
    </div>
  );
}
