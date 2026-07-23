import { loadAutomation } from "./_data/load";
import AutomationChrome from "./_components/chrome";
import AutomationComponents from "./_components";
import NotBuiltPage from "./_components/shared/not-built-page";
import { pick } from "./_components/shared/localized";
import { allNodes } from "./_data/automation.schema";
import { cronOf } from "./_components/cron/schedule";
import TopPulseBar from "./_components/cron/public/components/top-pulse-bar.client";

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
  // ЧТО НАСТРАИВАЕТСЯ (шаг 294) — имена переменных, объявленные ЭТОЙ автоматизацией: узлами-каналами
  // и интеграциями её вкладок. Больше окну настроек ничего не нужно: настраивают СЕРВИС, а не канал —
  // шесть узлов делят один токен бота, и это одна карточка, а не шесть строк. Канал, не объявивший
  // ключей, в настройки не попадает вовсе: включают его на холсте, настраивать в нём нечего.
  //
  // `envKeys` узла — ОТЧЁТ агента (`{name, status, comment}`), а не список строк; берём только имена.
  // Живую правду «задан или нет» даёт дверь `api/env`: `status` — последнее наблюдение агента, и
  // подменять им живую проверку нельзя.
  const nodeKeys = allNodes(graph.nodes).flatMap((n) => n.envKeys.map((k) => k.name));
  const integrationKeys = components.tabs.flatMap((tab) =>
    tab.entities.flatMap((entity) => {
      const raw = (entity.data as Record<string, unknown>).integrations;
      if (!Array.isArray(raw)) return [];
      return raw.flatMap((i) => {
        const keys = (i as { envKeys?: unknown }).envKeys;
        return Array.isArray(keys) ? keys.map(String) : [];
      });
    }),
  );
  const envKeys = [...new Set([...nodeKeys, ...integrationKeys])];
  // ПОСТРОЕНА ЛИ АВТОМАТИЗАЦИЯ — один факт из паспорта (`lifecycle`), и он решает судьбу ВИТРИНЫ:
  // замороженному шаблону публичной страницы нет. Показывать посетителю пустую витрину значило бы
  // обещать работу, которой ещё нет, — вместо страницы отдаём один честный тост с тем, что делать.
  // Кокпит владельца открыт всегда: именно из него автоматизацию и достраивают.
  const built = passport.lifecycle === "real-project";
  // ТАКТ КРОНА для верхней полосы-пульса — из ядра, `null` если раздела нет или он выключен (тогда
  // полоса не рисуется). Читается здесь, на единственной точке чтения платформы, и уходит пропсом.
  const cron = cronOf(components);
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
      {/* ФИКСИРОВАННЫЙ ВВЕРХУ ПУЛЬС такта (правка владельца 2026-07-23): «слайдер» крона живёт наверху
          страницы, на 1px ниже хедера, всегда видимый. Ничего не рисует, если крона нет/выключен. */}
      {cron ? <TopPulseBar everyMinutes={cron.everyMinutes} enabled={cron.enabled} /> : null}
      <AutomationChrome surface={surface} passport={passport} lang={lang} tabs={tabs} envKeys={envKeys} publicHref="?view=public" built={built} />
      <AutomationComponents surface={surface} lang={lang} />
    </main>
  );
}
