import { loadAutomation } from "./_data/load";
import AutomationChrome from "./_components/chrome";
import AutomationComponents from "./_components";

// Страница автоматизации. Паттерн v1 (test-stream-frozen-starter/page.tsx): ДВЕ композиции на одном
// маршруте — по умолчанию КОКПИТ владельца (surface="admin", полоса-шапка), а `?view=public` рисует
// ВИТРИНУ (surface="public", герой + Sparkle, без админ-хрома). Публичная поверхность за параллельной
// маршрутизацией /projects* отдаёт ровно эту композицию.
//
// page.tsx — единственная точка чтения платформы (язык по умолчанию); дальше всё уходит в компоненты
// пропсами, папка остаётся переносимой (закон 0). Отображение шапки выведено из automation.json:
// бейджи/имя/описание — из паспорта, список контейнеров — из components. Меняется ядро — меняется дизайн.
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const surface = view === "public" ? "public" : "admin";
  const { passport, components } = await loadAutomation();
  const lang = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);
  const tabs = components.tabs.map((t) => ({ name: t.name, presence: t.presence }));

  return (
    {/* data-zone-column — колонка страницы подчиняется переключателю ширины в футере зоны:
        обычный режим оставляет её как есть (max-w-4xl), широкий раскрывает на весь экран
        с мостом 32px. Атрибут, а не класс: раскладка страницы остаётся в её собственном коде. */}
    <main data-zone-column className="mx-auto w-full max-w-4xl px-4 py-6">
      <AutomationChrome surface={surface} passport={passport} lang={lang} tabs={tabs} publicHref="?view=public" />
      <AutomationComponents surface={surface} lang={lang} />
    </main>
  );
}
