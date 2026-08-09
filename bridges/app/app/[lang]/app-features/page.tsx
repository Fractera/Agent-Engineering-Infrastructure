// Возможности приложения (шаг 501, Ф2, партия 20).
//
// Раздел стал ГЛАВНЫМ ВЫКЛЮЧАТЕЛЕМ: три возможности открывают и закрывают свои
// разделы в меню панели. Выключено — раздела ниже нет, потому что настраивать
// то, чего в приложении не будет, значит тратить время владельца впустую.
//
// Динамическая: значения живые.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readFeatures } from "@/lib/platform-features";
import { FEATURE_SECTION, type FeatureKey } from "@/lib/platform-features.shared";
import { FeaturesEditor } from "./_components/features-editor.client";

export const dynamic = "force-dynamic";

export default async function AppFeaturesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const f = s.appFeatures;
  const page = s.pages["app-features"];

  const state = readFeatures();

  if (!state.ok) {
    return (
      <PageShell title={page.title} hint={page.hint}>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{f.unavailable}</p>
        </div>
      </PageShell>
    );
  }

  // Название раздела берётся из словаря страниц — одно имя и в меню, и здесь,
  // поэтому они не могут разойтись.
  const sections: Partial<Record<FeatureKey, string>> = {};
  for (const [key, slug] of Object.entries(FEATURE_SECTION) as [FeatureKey, keyof typeof s.pages][]) {
    sections[key] = s.pages[slug].title;
  }

  return (
    <PageShell title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {f.intro}
      </p>

      <div className="mt-3">
        <FeaturesEditor
          config={state.config}
          initial={state.features}
          parallel={state.parallel}
          sections={sections}
          labels={{
            save: f.save, saving: f.saving, saved: f.saved,
            failed: f.failed, nothingToSave: f.nothingToSave,
            opensSection: f.opensSection, parallelOff: f.parallelOff,
            items: f.items,
          }}
        />
      </div>

      <HelpDetails label={f.helpLabel}>
        <p><strong>{f.helpDefaultTitle}</strong> {f.helpDefault}</p>
        <p><strong>{f.helpFreedomTitle}</strong> {f.helpFreedom}</p>
        <p><strong>{f.helpWhyTitle}</strong> {f.helpWhy}</p>
        <p><strong>{f.helpSectionsTitle}</strong> {f.helpSections}</p>
      </HelpDetails>
    </PageShell>
  );
}
