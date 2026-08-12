// Раздел «Баннер cookie» — согласие, которое видят посетители приложения.
//
// 🔒 ЗДЕСЬ ТОЛЬКО ВЫКЛЮЧАТЕЛЬ (решение владельца 2026-08-12). Слова баннера
// живут в приложении на 82 языках и уже переведены; страница политики — обычная
// страница проекта в группе `(cookie)`. Настраивать здесь больше нечего.
//
// 🔒 РАЗДЕЛ ВИДЕН, ДАЖЕ КОГДА БАННЕР ВЫКЛЮЧЕН. Он и есть то место, где его
// включают обратно: спрятанный раздел означал бы, что выключенную возможность
// нельзя вернуть, не зная адреса наизусть.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { CookieBannerPanel } from "./_components/cookie-banner-panel.client";
import { readFeatures } from "@/lib/platform-features";

export const dynamic = "force-dynamic";

export default async function CookieBannerPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["cookie-banner"];
  const t = s.cookieBanner;
  const { config, features } = readFeatures();

  return (
    <PageShell lang={lang} slug="cookie-banner" s={s} title={page.title} hint={page.hint}>
      <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
        <p><strong>{t.whyTitle}</strong> {t.why}</p>
        <p className="mt-2"><strong>{t.wordsTitle}</strong> {t.words}</p>
        <p className="mt-2"><strong>{t.pageTitle}</strong> {t.page}</p>
      </div>

      <CookieBannerPanel
        initial={features.cookieBanner}
        config={config}
        labels={{
          toggle: t.toggle, on: t.on, off: t.off,
          save: s.topMenu.save, saving: s.topMenu.saving, saved: t.saved,
          failed: s.topMenu.failed, nothingToSave: t.nothingToSave,
        }}
      />
    </PageShell>
  );
}
