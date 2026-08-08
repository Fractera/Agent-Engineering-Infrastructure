// Переключатель языка в правом нижнем углу подвала (шаг 501).
//
// ДИЗАЙН — тот же, что на главной приложения (:3000): кнопка с иконкой
// `Languages` и кодом языка, над ней раскрывается список шириной 16rem с
// флагами, родными названиями и группировкой по регионам, активный язык
// подсвечен `bg-primary/15 text-primary`. Образец —
// `fractera-next-starter/components/language-switcher.client.tsx`; классы взяты
// оттуда дословно, чтобы панель и приложение выглядели одним продуктом.
//
// ОТЛИЧИЕ ОДНО, И ОНО ПРИНЦИПИАЛЬНОЕ: там это клиентский компонент с
// `usePathname`/`useRouter`, здесь — серверный, без единого байта JS.
// Раскрывашка — родной `<details>`, выбор языка — обычная ссылка на
// `/api/lang/<код>`, который читает Referer и отвечает 302 на ту же страницу.
// Поэтому переключатель работает при выключенном JS и не делает layout
// динамическим.
//
// Чего здесь нет по сравнению с образцом: поля поиска по языкам — оно требует
// состояния, то есть JS. Пока языков два, искать нечего; когда словарь дорастёт
// до 82, поиск можно добавить отдельным крошечным островком, не меняя ни
// разметку, ни маршрут.

import { Languages } from "lucide-react";
import { adminLanguages } from "@/lib/i18n/admin-strings";
import {
  ALL_LANGUAGE_METADATA,
  LANGUAGE_REGIONS,
  type LanguageMetadata,
  type LanguageRegion,
} from "@/config/translations/language-metadata";

export function LanguageSwitch({ lang }: { lang: string }) {
  // Показываем только те языки, для которых в словаре есть слова. Список в
  // каталоге — 84 записи, и предлагать язык без переводов значило бы обещать
  // то, чего нет.
  const codes = adminLanguages();
  const available = codes
    .map((code) => ALL_LANGUAGE_METADATA[code])
    .filter((m): m is LanguageMetadata => Boolean(m));

  const current = ALL_LANGUAGE_METADATA[lang];

  // Группировка по регионам появляется сама, когда языков становится много:
  // при двух она даёт две однострочные группы и не мешает.
  const byRegion = new Map<LanguageRegion, LanguageMetadata[]>();
  for (const region of LANGUAGE_REGIONS) {
    const list = available.filter((m) => m.regions.includes(region));
    if (list.length) byRegion.set(region, list);
  }

  return (
    <details className="relative shrink-0">
      <summary
        className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-foreground/80 transition-all hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
        title={current?.englishName ?? "Switch language"}
        aria-label="Switch language"
      >
        <Languages size={12} />
        <span className="font-semibold uppercase tracking-wider text-[10px]">{lang}</span>
      </summary>

      <div className="absolute bottom-full right-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl ring-1 ring-black/5">
        <div className="max-h-60 overflow-y-auto py-1">
          {[...byRegion.entries()].map(([region, list], regionIdx) => (
            <div key={region}>
              {regionIdx > 0 && <div className="my-1 h-px bg-border" />}
              <p className="sticky top-0 z-[1] bg-background px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                {region}
              </p>
              {list.map((meta) => (
                <LangRow
                  key={`${region}-${meta.code}`}
                  meta={meta}
                  flag={meta.regionFlags?.[region] ?? meta.flag}
                  active={meta.code === lang}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function LangRow(
  { meta, flag, active }: { meta: LanguageMetadata; flag: string; active: boolean },
) {
  return (
    <a
      href={`/api/lang/${meta.code}`}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
        active ? "bg-primary/15 text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground"
      }`}
    >
      <span className="text-base leading-none">{flag}</span>
      <span>{meta.nativeName}</span>
      <span className="ml-auto text-xs uppercase text-muted-foreground">{meta.code}</span>
    </a>
  );
}
