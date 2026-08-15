// Цвета (слой «Дизайн», шаг 5).
//
// Семь ролей в двух темах. Значения уезжают в `DESIGN-CONFIG/design-config.json`
// и перекрывают палитру темы; парный цвет текста приложение считает само по
// яркости выбранного. Пересборка не нужна.
//
// Динамическая: значения живые.

import fs from "fs";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { ColorsEditor } from "./_components/colors-editor.client";

export const dynamic = "force-dynamic";

const CONFIG_PATH =
  process.env.DESIGN_CONFIG_PATH ?? "/opt/fractera/app/DESIGN-CONFIG/design-config.json";

/** Что выбрано сейчас. Файла нет — действует палитра темы. */
function readColors() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as {
      colors?: { light?: Record<string, string>; dark?: Record<string, string> };
    };
    return { light: raw.colors?.light ?? {}, dark: raw.colors?.dark ?? {} };
  } catch {
    return { light: {}, dark: {} };
  }
}

export default async function DesignColorsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const c = s.designColors;
  const page = s.pages["design-colors"];

  return (
    <PageShell lang={lang} slug="design-colors" s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {c.intro}
      </p>

      <div className="mt-3">
        <ColorsEditor initial={readColors()} labels={c} />
      </div>

      <HelpDetails label={c.helpLabel}>
        <p><strong>{c.helpPairTitle}</strong> {c.helpPair}</p>
        <p><strong>{c.helpThemesTitle}</strong> {c.helpThemes}</p>
        <p><strong>{c.helpContrastTitle}</strong> {c.helpContrast}</p>
      </HelpDetails>
    </PageShell>
  );
}
