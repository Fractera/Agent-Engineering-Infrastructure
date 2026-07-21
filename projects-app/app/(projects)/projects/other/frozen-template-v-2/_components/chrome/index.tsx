import type { Passport } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import Hero from "./hero";
import StatusBar from "./status-bar";
import HowItWorks from "./how-it-works.client";

// ШАПКА АВТОМАТИЗАЦИИ — маршрутизатор по поверхности. Всё, что она рисует, выведено из ядра (паспорт +
// список вкладок), переданного пропсами: страница (page.tsx) — единственная точка, читающая платформу,
// поэтому папка остаётся переносимой (закон 0).
//
//   admin  → полоса-шапка (бейджи · имя · меню · «отправить задание») + герой;
//   public → герой + иконка Sparkle («как это работает») в правом верхнем углу. Много кнопок у публичной
//            поверхности нет.
type TabRow = { name: string; presence: "absent" | "collapsed" | "expanded" };

export default function AutomationChrome({
  surface,
  passport,
  lang,
  tabs,
  publicHref,
}: {
  surface: Surface;
  passport: Passport;
  lang: string;
  tabs: TabRow[];
  publicHref: string;
}) {
  if (surface === "admin") {
    return (
      <div data-chrome-root="admin">
        <StatusBar passport={passport} lang={lang} tabs={tabs} publicHref={publicHref} />
        <Hero passport={passport} surface="admin" />
      </div>
    );
  }

  return (
    <div data-chrome-root="public" className="relative">
      <div className="absolute right-2 top-2 z-10">
        <HowItWorks lang={lang} />
      </div>
      <Hero passport={passport} surface="public" />
    </div>
  );
}
