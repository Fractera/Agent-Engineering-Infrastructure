// Шапка нового слоя панели (шаг 501). Серверный компонент: ни одной строки JS
// в браузер.
//
// МЕНЮ — ЯЩИК, а не выпадашка. Как в старой оболочке: выезжает от ЛЕВОГО края
// слева направо, ширина `min(320px, 88vw)`, сдвиг 180 мс, шапка с названием и
// крестиком, тело прокручивается, категории разделены линиями `h-px bg-border`.
// Кнопка при этом остаётся справа в шапке — открывающий и открываемое намеренно
// в разных углах, ровно как было.
//
// КАК ЭТО РАБОТАЕТ БЕЗ JS. Состояние держит скрытый `<input type="checkbox">`, а
// кнопка-гамбургер и подложка — это `<label>`, привязанные к нему. Поэтому:
// открыть — нажать гамбургер, закрыть — нажать подложку, крестик или гамбургер
// снова; плавный выезд делает CSS-переход. `sr-only` вместо `hidden` оставляет
// чекбокс в дереве доступности, так что ящик открывается и с клавиатуры.
// Состояние сбрасывается при переходе на страницу — это и нужно: щёлкнул раздел,
// ящик закрылся сам.

import Link from "next/link";
import {
  Menu, Globe, X as XIcon, Palette, Languages, Columns3, SlidersHorizontal, PanelTop, PanelBottom,
  Cookie, Users, ImagePlus, Database, BrainCircuit, Brain, Map as MapIcon, Download, Upload,
  Link2, KeyRound, MessagesSquare, Sparkles, GitBranch, Info, History, Settings, BookOpen,
  HelpCircle, PackagePlus, FileText, Target, Wrench, Network, BookMarked, GraduationCap,
  ListChecks, AlertTriangle, Paintbrush, LayoutTemplate, Ruler, type LucideIcon,
} from "lucide-react";
import { NAV_GROUPS, NAV_BY_GROUP, adminHref, type AdminPageSlug } from "@/lib/admin-nav";
import { useCasesMissing } from "@/lib/product-docs";
import { collectWarnings } from "@/lib/admin-warnings";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

// Иконки живут ЗДЕСЬ, а не в `lib/admin-nav.ts`: список маршрутов должен
// оставаться чистыми данными, чтобы его мог импортировать словарь ради типа
// ключей, не втягивая за собой библиотеку иконок.
const ICONS: Record<AdminPageSlug, LucideIcon> = {
  "app-settings": Palette,
  languages: Languages,
  "parallel-routing": Columns3,
  "app-features": SlidersHorizontal,
  "top-menu": PanelTop,
  "footer-pages": PanelBottom,
  "cookie-banner": Cookie,
  users: Users,
  media: ImagePlus,
  database: Database,
  "vector-memory": BrainCircuit,
  "agentic-rag": Brain,
  map: MapIcon,
  "add-tool": PackagePlus,
  export: Download,
  import: Upload,
  domain: Link2,
  "login-methods": KeyRound,
  channels: MessagesSquare,
  openai: Sparkles,
  github: GitBranch,
  "github-about": Info,
  deployments: History,
  env: Settings,
  "how-to-build": BookOpen,
  help: HelpCircle,
  "doc-instruction": FileText,
  "doc-use-cases": Target,
  "doc-platform-tools": Wrench,
  "doc-architecture": Network,
  "doc-glossary": BookMarked,
  "doc-lessons": GraduationCap,
  "doc-steps": ListChecks,
  "doc-antipatterns": AlertTriangle,
  "doc-design": Paintbrush,
  "doc-parallel-routing": LayoutTemplate,
  "doc-coding-standards": Ruler,
};

const MENU_ID = "admin-menu-toggle";

export function AdminHeader({ lang, s }: { lang: string; s: AdminStrings }) {
  // 🔴 Пока пользовательские кейсы не описаны, разработка бессмысленна: агент
  // построит аккуратно и не то. Пункт горит красным, а на гамбургере появляется
  // точка — иначе предупреждение живёт внутри закрытого ящика и его никто не
  // видит. Проверка дешёвая (`statSync`), поэтому её можно делать на каждой
  // странице панели.
  const needsUseCases = useCasesMissing();

  // Верхняя область меню: всё красное и оранжевое, собранное в одном месте.
  // Список сам укорачивается по мере заполнения и исчезает целиком, когда
  // заполнено всё — предупреждение, которое висит вечно, перестают читать.
  const warnings = collectWarnings();
  const blocking = warnings.some((w) => w.level === "blocking");

  return (
    <>
      {/* Состояние ящика. Должен идти ПЕРЕД теми, кто на него смотрит через
          `peer-checked:` — селектор смотрит только на следующих сестёр. */}
      <input id={MENU_ID} type="checkbox" className="peer sr-only" aria-label={s.menu} />

      {/* Подложка: гасит фон и закрывает ящик по нажатию мимо него.
          Границы у неё РОВНО те же, что у ящика — `top-12 bottom-8`, то есть
          между шапкой и подвалом. Было `inset-0`, и она накрывала обе полосы:
          ящик выезжает внутри контейнера, значит и затемнять он вправе только
          этот контейнер. Побочная польза той же правки: кнопка-гамбургер в шапке
          остаётся доступной при открытом ящике, поэтому закрыть его можно тем же
          движением, каким открыл. */}
      <label
        htmlFor={MENU_ID}
        aria-hidden="true"
        className="invisible fixed inset-x-0 bottom-8 top-12 z-[55] bg-black/20 opacity-0 transition-opacity duration-200 peer-checked:visible peer-checked:opacity-100"
      />

      {/* Ящик: от левого края, между шапкой и подвалом, как в старой оболочке. */}
      <nav
        className="invisible fixed bottom-8 left-0 top-12 z-[58] flex w-[min(320px,88vw)] -translate-x-full flex-col border-r border-border bg-background shadow-2xl transition-transform duration-200 ease-out peer-checked:visible peer-checked:translate-x-0"
      >
        {/* Шапка ящика — не прокручивается никогда. */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[12px] font-medium text-foreground">{s.menu}</span>
          <label htmlFor={MENU_ID} className="cursor-pointer text-muted-foreground hover:text-foreground">
            <XIcon size={14} />
          </label>
        </div>

        {/* Прокручиваемое тело. `min-h-0` — то, что физически разрешает
            флекс-ребёнку сжаться ниже высоты содержимого; без него список
            выдавливает шапку ящика вместо прокрутки. */}
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {/* Предупреждения — первыми, потому что это ответ на вопрос «с чего
              начать». Каждая запись ДУБЛИРУЕТ метку своего раздела и ведёт
              туда же: у настройки есть законное место, область лишь собирает
              их вместе, пока они есть. */}
          {warnings.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-600/80 dark:text-red-400/80">
                {s.warnings.title}
              </div>
              {warnings.map((w) => {
                const red = w.level === "blocking";
                return (
                  <Link
                    key={w.id}
                    href={adminHref(lang, w.slug)}
                    className={`flex items-start gap-2 px-3 py-1.5 text-[12px] hover:bg-muted ${
                      red ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${red ? "bg-red-600 dark:bg-red-400" : "bg-amber-600 dark:bg-amber-400"}`} />
                    <span className="leading-tight">{s.warnings.items[w.id]}</span>
                  </Link>
                );
              })}
              <div className="mx-2 my-1 h-px bg-border" />
            </div>
          )}

          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={group}>
              {/* Разделитель между категориями — тот же, что в оригинале.
                  Перед первой категорией его нет: линия под шапкой уже есть. */}
              {groupIdx > 0 && <div className="mx-2 my-1 h-px bg-border" />}
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {s.navGroups[group]}
              </div>
              {NAV_BY_GROUP[group].map((slug) => {
                const Icon = ICONS[slug];
                const alarm = slug === "doc-use-cases" && needsUseCases;
                return (
                  <Link
                    key={slug}
                    href={adminHref(lang, slug)}
                    title={alarm ? s.docs.useCasesRequired : undefined}
                    className={`flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-muted ${
                      alarm ? "font-medium text-red-600 dark:text-red-400" : "text-foreground"
                    }`}
                  >
                    <Icon size={11} className={`shrink-0 ${alarm ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
                    {s.pages[slug].title}
                    {alarm && <span className="ml-auto size-1.5 rounded-full bg-red-600 dark:bg-red-400" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <Link href={adminHref(lang)} className="text-sm font-semibold tracking-wide text-foreground">
          Fractera Admin
        </Link>

        <div className="flex items-center gap-2">
          {/* Заготовка: предпросмотр появится вместе со своей логикой (фаза Ф2). */}
          <span
            title={s.skeletonNotice}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-muted-foreground/60"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{s.preview}</span>
          </span>

          <label
            htmlFor={MENU_ID}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-xs text-foreground transition-colors hover:bg-muted"
          >
            <Menu className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{s.menu}</span>
            {/* Точка на кнопке: предупреждения живут внутри закрытого ящика, а
                увидеть их нужно до того, как он открыт. Красная, если что-то
                блокирует старт; оранжевая, если всё лишь нежелательно. */}
            {warnings.length > 0 && (
              <span
                title={s.warnings.title}
                className={`size-1.5 shrink-0 rounded-full ${
                  blocking ? "bg-red-600 dark:bg-red-400" : "bg-amber-600 dark:bg-amber-400"
                }`}
              />
            )}
          </label>
        </div>
      </header>
    </>
  );
}
