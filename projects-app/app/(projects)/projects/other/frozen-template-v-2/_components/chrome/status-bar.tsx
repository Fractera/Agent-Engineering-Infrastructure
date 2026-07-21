import type { Passport } from "../../_data/automation.schema";
import Badges from "./badges";
import Menu from "./menu.client";
import SendTask from "./send-task.client";

// ПОЛОСА-ШАПКА (админ) — верхний блок: ряд 1 только бейджи (горизонтальная прокрутка, скроллбар скрыт),
// ряд 2 имя автоматизации слева, гамбургер-меню и кнопка «отправить задание» справа.
// (Требование владельца: меню + кнопка — во втором ряду, НЕ в ряду бейджей.)
type TabRow = { name: string; presence: "absent" | "collapsed" | "expanded" };

export default function StatusBar({
  passport,
  lang,
  tabs,
  publicHref,
}: {
  passport: Passport;
  lang: string;
  tabs: TabRow[];
  publicHref: string;
}) {
  return (
    <div data-chrome="status-bar" className="flex flex-col gap-1 border-b py-1">
      <span className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Badges passport={passport} surface="admin" />
      </span>
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">{passport.title}</span>
        <span className="flex shrink-0 items-center gap-2">
          <Menu lang={lang} tabs={tabs} publicHref={publicHref} />
          <SendTask lang={lang} />
        </span>
      </span>
    </div>
  );
}
