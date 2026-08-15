// Формы и отступы (слой «Дизайн», шаг 4).
//
// Скругление, толщина рамки, плотность и ширина содержимого. Значения уезжают в
// `DESIGN-CONFIG/design-config.json`, приложение читает их переменными CSS.
// Пересборка не нужна.
//
// Динамическая: значения живые.

import fs from "fs";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { ShapeEditor } from "./_components/shape-editor.client";

export const dynamic = "force-dynamic";

const CONFIG_PATH =
  process.env.DESIGN_CONFIG_PATH ?? "/opt/fractera/app/DESIGN-CONFIG/design-config.json";

/** Что выбрано сейчас. Файла нет — действуют формы проекта. */
function readShape() {
  const fallback = { radius: "0.625rem", borderWidth: "1px", spaceScale: 1, appWidth: "80rem" };
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as {
      shape?: { radius?: string; borderWidth?: string; spaceScale?: number; appWidth?: string };
    };
    return {
      radius: raw.shape?.radius ?? fallback.radius,
      borderWidth: raw.shape?.borderWidth ?? fallback.borderWidth,
      spaceScale: typeof raw.shape?.spaceScale === "number" ? raw.shape.spaceScale : fallback.spaceScale,
      appWidth: raw.shape?.appWidth ?? fallback.appWidth,
    };
  } catch {
    return fallback;
  }
}

export default async function DesignShapePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const sh = s.designShape;
  const page = s.pages["design-shape"];

  return (
    <PageShell lang={lang} slug="design-shape" s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {sh.intro}
      </p>

      <div className="mt-3">
        <ShapeEditor initial={readShape()} labels={sh} />
      </div>

      <HelpDetails label={sh.helpLabel}>
        <p><strong>{sh.helpRadiusTitle}</strong> {sh.helpRadius}</p>
        <p><strong>{sh.helpSpaceTitle}</strong> {sh.helpSpace}</p>
        <p><strong>{sh.helpWidthTitle}</strong> {sh.helpWidth}</p>
      </HelpDetails>
    </PageShell>
  );
}
