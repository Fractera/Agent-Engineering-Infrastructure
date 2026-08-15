// Типографика (слой «Дизайн», шаг 3).
//
// Множитель шкалы и межстрочный интервал. Значение уезжает в
// `DESIGN-CONFIG/design-config.json`, приложение читает его как переменную CSS,
// и каждая ступень шкалы считается от неё. Пересборка не нужна.
//
// Динамическая: значения живые.

import fs from "fs";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { TypeEditor } from "./_components/type-editor.client";

export const dynamic = "force-dynamic";

const CONFIG_PATH =
  process.env.DESIGN_CONFIG_PATH ?? "/opt/fractera/app/DESIGN-CONFIG/design-config.json";

/** Что выбрано сейчас. Файла нет — действует шкала проекта. */
function readType(): { scale: number; leading: number } {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as {
      type?: { scale?: number; leading?: number };
    };
    return {
      scale: typeof raw.type?.scale === "number" ? raw.type.scale : 1,
      leading: typeof raw.type?.leading === "number" ? raw.type.leading : 1.6,
    };
  } catch {
    return { scale: 1, leading: 1.6 };
  }
}

export default async function DesignTypePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const t = s.designType;
  const page = s.pages["design-type"];

  return (
    <PageShell lang={lang} slug="design-type" s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {t.intro}
      </p>

      <div className="mt-3">
        <TypeEditor initial={readType()} labels={t} />
      </div>

      <HelpDetails label={t.helpLabel}>
        <p><strong>{t.helpWhyTitle}</strong> {t.helpWhy}</p>
        <p><strong>{t.helpRangeTitle}</strong> {t.helpRange}</p>
        <p><strong>{t.helpLiveTitle}</strong> {t.helpLive}</p>
      </HelpDetails>
    </PageShell>
  );
}
