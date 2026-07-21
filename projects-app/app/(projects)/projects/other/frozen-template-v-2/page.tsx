import { headers } from "next/headers";
import { loadAutomation } from "./_data/load";
import AutomationChrome from "./_components/chrome";
import AutomationComponents from "./_components";

// Страница автоматизации. ЕДИНСТВЕННАЯ точка, читающая платформу (язык по умолчанию + поверхность из
// заголовка, который ставит proxy.ts по адресу — требование 4) и ядро (паспорт + список вкладок); дальше
// всё уходит в компоненты пропсами, поэтому папка остаётся переносимой (закон 0).
//
// Поверхность определяется АДРЕСОМ (не параметром запроса): публичный хост → surface="public" (герой +
// Sparkle), кокпит projects.<домен> → surface="admin" (полоса-шапка). Заголовок x-surface ставит
// proxy.ts; при его отсутствии — админ по умолчанию.
//
// Отображение шапки полностью выведено из состояния automation.json: бейджи, имя, описание — из паспорта,
// список контейнеров-вкладок — из components. Меняется ядро — меняется дизайн.
export default async function Page() {
  const { passport, components } = await loadAutomation();
  const h = await headers();
  const surface = h.get("x-surface") === "public" ? "public" : "admin";
  const lang = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);
  const tabs = components.tabs.map((t) => ({ name: t.name, presence: t.presence }));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <AutomationChrome surface={surface} passport={passport} lang={lang} tabs={tabs} publicHref="." />
      <AutomationComponents surface={surface} />
    </main>
  );
}
