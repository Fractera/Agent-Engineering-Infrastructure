import { loadAutomation } from "./_data/load";
import AutomationChrome from "./_components/chrome";
import AutomationComponents from "./_components";
import NotBuiltPage from "./_components/shared/not-built-page";
import { pick } from "./_components/shared/localized";
import { NODE_FUNCTIONS } from "./_lib/nodes";

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
  const { passport, components, graph } = await loadAutomation();
  const lang = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);
  // Строки вкладок для шапки: присутствие для меню + сущности с подписями для оглавления витрины.
  const tabs = components.tabs.map((t) => ({
    name: t.name,
    presence: t.presence,
    entities: t.entities.map((e) => ({
      cuid: e.cuid,
      title: pick((e.data as Record<string, unknown>).title, lang) || e.name,
    })),
  }));
  // КАНАЛЫ ДЛЯ МЕНЮ (шаг 293): двери входа и выхода — чем автоматизация слушает и чем отвечает.
  // Коннекторы сюда НЕ идут: это двери в соседнюю автоматизацию, а не канал наружу. `hasFunction`
  // считается ЗДЕСЬ, на сервере: реестр функций — серверный модуль, и знать о нём меню не должно.
  const channels = (["input", "output"] as const).flatMap((group) =>
    graph.nodes.groups[group].nodes
      .filter((n) => n.kind === group)
      .map((n) => ({
        cuid: n.cuid,
        name: n.name,
        ioType: typeof n.ioType === "string" ? n.ioType : "",
        group,
        state: n.state,
        envKeys: [...n.envKeys],
        hasFunction: Boolean(NODE_FUNCTIONS[n.function.name]),
      })),
  );
  // ПОСТРОЕНА ЛИ АВТОМАТИЗАЦИЯ — один факт из паспорта (`lifecycle`), и он решает судьбу ВИТРИНЫ:
  // замороженному шаблону публичной страницы нет. Показывать посетителю пустую витрину значило бы
  // обещать работу, которой ещё нет, — вместо страницы отдаём один честный тост с тем, что делать.
  // Кокпит владельца открыт всегда: именно из него автоматизацию и достраивают.
  const built = passport.lifecycle === "real-project";
  if (surface === "public" && !built) {
    return (
      <main data-zone-column className="mx-auto w-full max-w-4xl px-4">
        <NotBuiltPage />
      </main>
    );
  }

  // data-zone-column — колонка страницы подчиняется переключателю ширины в футере зоны:
  // обычный режим оставляет её как есть (max-w-4xl), широкий раскрывает на весь экран
  // с мостом 32px. Атрибут, а не класс: раскладка страницы остаётся в её собственном коде.
  return (
    <main data-zone-column className="mx-auto w-full max-w-4xl px-4 py-6">
      <AutomationChrome surface={surface} passport={passport} lang={lang} tabs={tabs} channels={channels} publicHref="?view=public" built={built} />
      <AutomationComponents surface={surface} lang={lang} />
    </main>
  );
}
