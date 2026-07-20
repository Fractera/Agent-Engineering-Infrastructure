import { loadAutomation } from "./_data/load";
import AutomationComponents from "./_components";

// Страница автоматизации. Название берётся из паспорта ядра, состав вкладок — из его же объекта
// components; страница ничего о них не знает.
//
// Поверхность пока зафиксирована как административная: определение поверхности по адресу —
// требование 4, оно ещё не выполнено.
//
// Никаких импортов за пределы этой папки: требование 0 — полная самодостаточность.
export default async function Page() {
  const { passport } = await loadAutomation();

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{passport.title}</h1>
      <AutomationComponents surface="admin" />
    </main>
  );
}
