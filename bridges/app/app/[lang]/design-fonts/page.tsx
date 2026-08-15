// Шрифты проекта (слой «Дизайн», шаг 2).
//
// Три роли — заголовки, текст, моноширинный. Выбор уезжает в
// `DESIGN-CONFIG/design-config.json` слота, приложение читает его на рендере и
// подключает шрифт ссылкой в шапке. Пересборка не нужна.
//
// Динамическая: значения живые.

import fs from "fs";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { FontsEditor } from "./_components/fonts-editor.client";

export const dynamic = "force-dynamic";

const CONFIG_PATH =
  process.env.DESIGN_CONFIG_PATH ?? "/opt/fractera/app/DESIGN-CONFIG/design-config.json";

type Choice = { family: string; import?: string };

/** Что выбрано сейчас. Файла нет — не выбрано ничего, и это норма. */
function readFonts(): Record<"heading" | "body" | "mono", Choice | undefined> {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as { fonts?: Record<string, Choice> };
    const f = raw.fonts ?? {};
    return { heading: f.heading, body: f.body, mono: f.mono };
  } catch {
    return { heading: undefined, body: undefined, mono: undefined };
  }
}

export default async function DesignFontsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const f = s.designFonts;
  const page = s.pages["design-fonts"];

  return (
    <PageShell lang={lang} slug="design-fonts" s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {f.intro}
      </p>

      <div className="mt-3">
        <FontsEditor initial={readFonts()} labels={f} />
      </div>

      <HelpDetails label={f.helpLabel}>
        <p><strong>{f.helpWhereTitle}</strong> {f.helpWhere}</p>
        <p><strong>{f.helpHowTitle}</strong> {f.helpHow}</p>
        <p><strong>{f.helpPrivacyTitle}</strong> {f.helpPrivacy}</p>
        <p><strong>{f.helpAlphabetTitle}</strong> {f.helpAlphabet}</p>
        <p><strong>{f.helpSystemTitle}</strong> {f.helpSystem}</p>
      </HelpDetails>
    </PageShell>
  );
}
