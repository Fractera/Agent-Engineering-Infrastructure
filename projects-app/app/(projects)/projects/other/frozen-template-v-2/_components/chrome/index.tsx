import type { Passport } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import Hero from "./hero";
import StatusBar from "./status-bar";
import HowItWorks from "./how-it-works.client";
import Notifications from "../notifications";
import Warnings from "../warnings";

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
  envKeys,
  publicHref,
  built,
}: {
  surface: Surface;
  passport: Passport;
  lang: string;
  tabs: TabRow[];
  /** Объявленные переменные окружения — нужны только админ-меню; витрина о них не спрашивает. */
  envKeys: string[];
  publicHref: string;
  /** Построена ли автоматизация (паспорт: lifecycle=real-project) — от этого зависит судьба публичной ссылки. */
  built: boolean;
}) {
  if (surface === "admin") {
    // ПОРЯДОК v1 (шаг 243.1): статус-бар → уведомление. Полоса стоит сразу под статус-баром и рисуется
    // только когда есть поводы (иначе сама прячется).
    return (
      <div data-chrome-root="admin">
        <StatusBar passport={passport} lang={lang} tabs={tabs} envKeys={envKeys} publicHref={publicHref} built={built} />
        <Notifications surface={surface} lang={lang} />
        {/* ЦЕНТР ПРОБЛЕМ (шаг 298) — бейдж «⚠ N» + модалка с открытыми предупреждениями агента. Своя
            сущность со своим провайдером (единый источник), рядом с полосой-уведомлением. */}
        <Warnings surface={surface} lang={lang} />
      </div>
    );
  }

  // ВИТРИНА — ТОЛЬКО ГЕРОЙ (правка владельца 2026-07-24). Инструментов владельца на публичной поверхности
  // нет вовсе: ни гамбургера с оглавлением, ни отправки задания — они изначально принадлежат админ-слою.
  // Посетителю нужен предмет страницы (имя, бейджи, описание) и сами разделы ниже, а не оснастка
  // разработки; «как это работает» остаётся — это рассказ О САМОЙ автоматизации, а не инструмент.
  return (
    <div data-chrome-root="public" className="relative">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <HowItWorks lang={lang} />
      </div>
      <Hero passport={passport} surface="public" />
    </div>
  );
}
