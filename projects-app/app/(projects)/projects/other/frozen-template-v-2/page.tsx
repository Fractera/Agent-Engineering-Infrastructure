import { loadAutomation } from "./_data/load";
import AutomationChrome from "./_components/chrome";
import AutomationComponents from "./_components";

// Страница автоматизации. ЕДИНСТВЕННАЯ точка, читающая платформу (язык по умолчанию из окружения) и
// ядро (паспорт + список вкладок); дальше всё уходит в компоненты пропсами, поэтому папка остаётся
// переносимой (закон 0) — ни один компонент наружу не ходит.
//
// Поверхность пока зафиксирована как административная: определение поверхности по адресу — требование 4,
// оно ещё не выполнено. Публичная шапка (герой + Sparkle) построена и включится, когда :3000 начнёт
// отдавать surface="public" сам. publicHref="." указывает на этот же маршрут; подмена origin на :3000 —
// тоже требование 4.
//
// Отображение шапки полностью выведено из состояния automation.json: бейджи, имя, описание — из паспорта,
// список контейнеров-вкладок — из components. Меняется ядро — меняется дизайн.
export default async function Page() {
  const { passport, components } = await loadAutomation();
  const lang = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);
  const tabs = components.tabs.map((t) => ({ name: t.name, presence: t.presence }));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <AutomationChrome surface="admin" passport={passport} lang={lang} tabs={tabs} publicHref="." />
      <AutomationComponents surface="admin" />
    </main>
  );
}
