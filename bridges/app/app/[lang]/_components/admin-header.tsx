// Шапка нового слоя панели (шаг 501). Серверный компонент: ни одной строки JS
// в браузер. Гамбургер — родной `<details>`, поэтому меню раскрывается и при
// выключенном JS, а навигация идёт настоящими ссылками.

import Link from "next/link";
import {
  Menu, Globe, Palette, Languages, Columns3, SlidersHorizontal, PanelTop, PanelBottom,
  Cookie, Users, ImagePlus, Database, BrainCircuit, Brain, Map as MapIcon, Download, Upload,
  Link2, KeyRound, MessagesSquare, Sparkles, GitBranch, Info, History, Settings, BookOpen,
  HelpCircle, type LucideIcon,
} from "lucide-react";
import { NAV_GROUPS, NAV_BY_GROUP, adminHref, type AdminPageSlug } from "@/lib/admin-nav";
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
};

export function AdminHeader({ lang, s }: { lang: string; s: AdminStrings }) {
  return (
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

        <details className="relative">
          <summary
            className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-border px-3 text-xs text-foreground hover:bg-muted [&::-webkit-details-marker]:hidden"
            aria-label={s.menu}
          >
            <Menu className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{s.menu}</span>
          </summary>

          <nav className="absolute right-0 top-full z-50 mt-1 max-h-[75vh] w-[17rem] overflow-y-auto rounded-xl border border-border bg-background p-2 shadow-2xl">
            {NAV_GROUPS.map((group) => (
              <div key={group} className="mb-1.5 last:mb-0">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  {s.navGroups[group]}
                </div>
                {NAV_BY_GROUP[group].map((slug) => {
                  const Icon = ICONS[slug];
                  return (
                    <Link
                      key={slug}
                      href={adminHref(lang, slug)}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-foreground hover:bg-muted"
                    >
                      <Icon size={11} className="shrink-0 text-muted-foreground" />
                      {s.pages[slug].title}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
