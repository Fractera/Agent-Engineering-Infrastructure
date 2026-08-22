// Секции — каталог по назначению, с превью (шаг 541).
//
// 🔒 ИСТОЧНИК В ПРИЛОЖЕНИИ, ПАНЕЛЬ ЧИТАЕТ. Каталог живёт в слоте
// (`sections/SECTIONS.json`), порождается сборкой приложения и стережётся его
// гейтом. Копии здесь нет намеренно: копия разошлась бы с реестром на первом же
// новом виде, и панель уверенно показывала бы владельцу то, чего в его проекте нет.
//
// Динамическая: каталог читается с диска слота на каждый заход, и это правильно —
// владелец мог развернуть проект минуту назад.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { readSectionsCatalogue } from "@/lib/sections-catalogue";
import { SectionsBrowser } from "./_components";

export const dynamic = "force-dynamic";

export default async function Page(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ kind?: string }>;
  },
) {
  const { lang } = await params;
  const { kind } = await searchParams;
  const s = getAdminStrings(lang);
  const page = s.pages["design-sections"];

  return (
    <PageShell lang={lang} slug="design-sections" s={s} title={page.title} hint={page.hint}>
      <SectionsBrowser
        lang={lang}
        s={s}
        catalogue={readSectionsCatalogue()}
        selectedKind={kind}
        baseHref={adminHref(lang, "design-sections")}
      />
    </PageShell>
  );
}
