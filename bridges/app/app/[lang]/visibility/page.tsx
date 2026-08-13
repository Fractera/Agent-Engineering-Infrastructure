// «Как вас находят» — единственная вкладка своей группы (владелец 2026-08-13).
//
// Группа названа вопросом ПОКУПАТЕЛЯ, а не аббревиатурой: «SEO» через месяц
// начнёт врать, потому что сюда лягут изображения и скорость загрузки — они не
// поисковая оптимизация, хотя решают ту же задачу.
//
// Динамическая: показывает живое состояние выключателя офлайн-копии. Панель —
// кокпит владельца, и канон статики её не связывает.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { readFeatures } from "@/lib/platform-features";
import { VisibilityContent } from "./_components";

export const dynamic = "force-dynamic";

export default async function VisibilityPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages.visibility;

  const state = readFeatures();

  return (
    <PageShell lang={lang} slug="visibility" s={s} title={page.title} hint={page.hint}>
      <VisibilityContent
        s={s}
        lang={lang}
        config={state.config}
        offline={state.features.offlineCache}
      />
    </PageShell>
  );
}
