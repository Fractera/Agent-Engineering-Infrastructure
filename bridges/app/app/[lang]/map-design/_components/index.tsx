import Link from "next/link";
import fs from "fs";
import { ChevronRight } from "lucide-react";
import { PageShell } from "../../_components/page-shell";
import { adminHref } from "@/lib/admin-nav";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { activeScheme } from "@/lib/design/color-schemes";
import { isSystemFont } from "@/lib/design/font-catalogue";

// КАРТА ДИЗАЙНА — рубрикатор, показывающий ТЕКУЩЕЕ состояние.
//
// 🔒 ПОЧЕМУ НЕ ОБЩИЙ `GroupMap`. Тот перечисляет разделы — и для восьми других
// групп этого достаточно: там вопрос «куда идти». У дизайна вопрос другой — «как
// сейчас выглядит мой сайт», и ответ на него разбросан по четырём страницам.
// Список ссылок заставляет обойти все четыре, чтобы узнать то, что помещается в
// один экран.
//
// 🔒 СОСТОЯНИЕ ЧИТАЕТСЯ ИЗ ТОГО ЖЕ ФАЙЛА, ЧТО ПРИМЕНЯЕТ САЙТ. Не из отдельной
// сводки, которую пришлось бы обновлять вместе с настройками: сводка разошлась
// бы с правдой на первой же правке, и карта начала бы уверенно врать — хуже, чем
// молчать.
//
// 🔒 «НЕ НАСТРОЕНО» — ЭТО ОТВЕТ, А НЕ ПУСТОТА. Пустая строка означала бы, что
// раздел сломан. На деле она означает «решает тема проекта», и это законное,
// часто правильное состояние: свежий сайт выглядит собранно без единой правки.

const CONFIG_PATH =
  process.env.DESIGN_CONFIG_PATH ?? "/opt/fractera/app/DESIGN-CONFIG/design-config.json";

type Cfg = {
  fonts?: Record<string, { family?: string }>;
  type?: { scale?: number; leading?: number };
  shape?: { radius?: string; borderWidth?: string; spaceScale?: number; appWidth?: string };
  colors?: { light?: Record<string, string>; dark?: Record<string, string> };
};

function readConfig(): Cfg {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Cfg;
  } catch {
    return {};
  }
}

export function DesignMap({ lang, s }: { lang: string; s: AdminStrings }) {
  const m = s.mapDesign;
  const page = s.pages["map-design"];
  const cfg = readConfig();

  // ── Что настроено в каждом разделе ─────────────────────────────────────────
  const fontNames = (["heading", "body", "mono"] as const)
    .map(r => cfg.fonts?.[r]?.family)
    .filter((f): f is string => !!f)
    .map(f => (isSystemFont(f) ? m.systemFont : f));

  const scale = cfg.type?.scale;
  const typeState =
    scale && scale !== 1 ? m.scaleValue.replace("{value}", `${Math.round(scale * 100)}%`) : null;

  const shapeParts: string[] = [];
  if (cfg.shape?.radius) shapeParts.push(cfg.shape.radius);
  if (cfg.shape?.borderWidth && cfg.shape.borderWidth !== "1px") shapeParts.push(cfg.shape.borderWidth);
  if (cfg.shape?.spaceScale && cfg.shape.spaceScale !== 1) shapeParts.push(`×${cfg.shape.spaceScale}`);
  if (cfg.shape?.appWidth) shapeParts.push(cfg.shape.appWidth);

  const light = cfg.colors?.light ?? {};
  const dark = cfg.colors?.dark ?? {};
  const scheme = activeScheme(light, dark);
  const colorCount = Object.keys(light).length + Object.keys(dark).length;
  const colorState = scheme
    ? m.schemeNamed.replace("{name}", s.designColors.schemes[scheme as keyof typeof s.designColors.schemes])
    : colorCount > 0
      ? m.colorsCustom.replace("{count}", String(colorCount))
      : null;

  const rows = [
    { slug: "design-fonts" as const, state: fontNames.length ? fontNames.join(" · ") : null, swatch: null },
    { slug: "design-type" as const, state: typeState, swatch: null },
    { slug: "design-shape" as const, state: shapeParts.length ? shapeParts.join(" · ") : null, swatch: null },
    {
      slug: "design-colors" as const,
      state: colorState,
      swatch: light.primary ? [light.background ?? "#ffffff", light.primary, light.accent ?? light.primary] : null,
    },
  ];

  const untouched = rows.every(r => !r.state);

  return (
    <PageShell lang={lang} slug="map-design" s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {m.intro}
      </p>

      {/* Одна честная строка о состоянии в целом — до списка, чтобы ответ на
          вопрос «трогали ли здесь что-нибудь» не приходилось собирать глазами. */}
      {untouched && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{m.allDefault}</p>
      )}

      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {rows.map(row => (
          <li key={row.slug}>
            <Link href={adminHref(lang, row.slug)} className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-medium text-foreground">{s.pages[row.slug].title}</span>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                  {s.pages[row.slug].hint}
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-[11px]">
                  {row.swatch && (
                    <span className="flex gap-0.5">
                      {row.swatch.map((c, i) => (
                        <span
                          key={i}
                          className="size-3 rounded-full border border-black/10"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                  )}
                  <span className={row.state ? "text-foreground" : "text-muted-foreground"}>
                    {row.state ?? m.notSet}
                  </span>
                </p>
              </div>
              <ChevronRight size={13} className="mt-1 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-md border border-border bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
        {m.liveNote}
      </p>
    </PageShell>
  );
}
