import Link from "next/link";
import fs from "fs";
import { ChevronRight } from "lucide-react";
import { PageShell } from "../../_components/page-shell";
import { adminHref } from "@/lib/admin-nav";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { activeScheme } from "@/lib/design/color-schemes";
import { isSystemFont } from "@/lib/design/font-catalogue";
import { readLocalizedContent } from "@/lib/content/localized-content";
import { GuideProse } from "../../how-to-build/_components/guide-prose";
import { DocPopup } from "../../_components/doc-popup.client";
import { CustomDesignSwitch } from "./custom-design-switch.client";

// Документ за зелёной кнопкой. Нет файла — нет и кнопки: пустое окно хуже, чем
// отсутствующая кнопка, потому что обещает и не даёт.
//
// 🔒 РАЗМЕТКУ ДЕЛАЕТ СЕРВЕР. Текст читается с диска здесь и уезжает в островок
// готовым деревом: клиент не разбирает markdown и не тянет библиотеку разбора в
// браузер — он открывает и закрывает окно, и это всё, что ему поручено.
function Doc({ name, lang, label, title }: { name: string; lang: string; label: string; title: string }) {
  const found = readLocalizedContent(name, lang);
  if (!found.ok) return null;
  return (
    <DocPopup label={label} title={title}>
      <GuideProse markdown={found.text} />
    </DocPopup>
  );
}

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
  /** Режим дизайна: рекомендованный (пусто/false) или кастомный (шаг 539). */
  customDesign?: boolean;
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

  // 🔒 ОДИН СПИСОК, А НЕ ДВА (владелец 2026-08-15, дословно: «нахера ты мне
  // продублировал весь контент на странице»).
  //
  // Здесь было ДВА перечисления одного и того же: сверху четыре строки с
  // состоянием, ниже — те же четыре темы прозой с кнопками. Человек читал про
  // шрифты дважды, а пятая тема — секции — жила только во втором списке, то есть
  // выглядела чужеродной.
  //
  // Правильно так: строка раздела НЕСЁТ всё сразу — название, состояние и
  // зелёную кнопку с полным разбором. Секции стоят пятой строкой наравне с
  // остальными; у них нет страницы, поэтому строка не ссылка, а метка «Скоро»
  // говорит, чего ждать.
  const rows = [
    { key: "fonts" as const, slug: "design-fonts" as const, state: fontNames.length ? fontNames.join(" · ") : null, swatch: null },
    { key: "type" as const, slug: "design-type" as const, state: typeState, swatch: null },
    { key: "shape" as const, slug: "design-shape" as const, state: shapeParts.length ? shapeParts.join(" · ") : null, swatch: null },
    {
      key: "colors" as const,
      slug: "design-colors" as const,
      state: colorState,
      swatch: light.primary ? [light.background ?? "#ffffff", light.primary, light.accent ?? light.primary] : null,
    },
    // Пятая — без страницы: механизма ещё нет, и ссылка вела бы в никуда.
    { key: "sections" as const, slug: null, state: null, swatch: null },
  ];

  const untouched = rows.every(r => !r.state);

  return (
    <PageShell lang={lang} slug="map-design" s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {m.intro}
      </p>

      {/* 🔒 РЕЖИМ ДИЗАЙНА СТОИТ ПЕРВЫМ, ДО СПИСКА РАЗДЕЛОВ (шаг 539). Он решает,
          действуют ли эти разделы вообще: в кастомном режиме страницы уходят
          из-под палитры, меню и подвала, и настраивать цвета для них незачем.
          Ниже — состояние, здесь — рамка, в которой это состояние что-то значит. */}
      <CustomDesignSwitch
        config={cfg as Record<string, unknown>}
        initial={cfg.customDesign === true}
        labels={{
          recommendedTitle: m.modeRecommendedTitle,
          recommendedBody: m.modeRecommendedBody,
          customTitle: m.modeCustomTitle,
          customBody: m.modeCustomBody,
          costTitle: m.modeCostTitle,
          cost: m.modeCost,
          responsibility: m.modeResponsibility,
          turnOn: m.modeTurnOn,
          turnOff: m.modeTurnOff,
          confirmTitle: m.modeConfirmTitle,
          confirmBody: m.modeConfirmBody,
          confirmYes: m.modeConfirmYes,
          confirmNo: m.modeConfirmNo,
          saving: m.modeSaving,
          savedOn: m.modeSavedOn,
          savedOff: m.modeSavedOff,
          failed: m.modeFailed,
        }}
      />

      {/* Одна честная строка о состоянии в целом — до списка, чтобы ответ на
          вопрос «трогали ли здесь что-нибудь» не приходилось собирать глазами. */}
      {untouched && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{m.allDefault}</p>
      )}

      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {rows.map(row => {
          const title = row.slug ? s.pages[row.slug].title : m.blocks.sections.shortTitle;
          const hint = row.slug ? s.pages[row.slug].hint : m.blocks.sections.hint;

          // Название и подсказка — ссылка целиком, если страница есть. Кнопка
          // разбора стоит РЯДОМ, а не внутри ссылки: вложенная кнопка внутри
          // ссылки перехватывает нажатие непредсказуемо, и человек то открывает
          // окно, то уходит на страницу.
          const head = (
            <div className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-foreground">
                {title}
                {!row.slug && (
                  <span className="rounded-full border border-primary/30 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-medium text-primary">
                    {m.soon}
                  </span>
                )}
              </span>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{hint}</p>

              {row.slug && (
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
              )}
            </div>
          );

          return (
            <li key={row.key} className="px-3 py-2.5">
              <div className="flex items-start gap-3">
                {row.slug ? (
                  <Link href={adminHref(lang, row.slug)} className="flex min-w-0 flex-1 items-start gap-3 hover:opacity-80">
                    {head}
                    <ChevronRight size={13} className="mt-1 shrink-0 text-muted-foreground" />
                  </Link>
                ) : (
                  head
                )}
              </div>

              {/* Зелёная кнопка — под строкой раздела: короткое описание уже
                  прочитано, а полный разбор ждёт того, кому он нужен. */}
              <div className="mt-1.5">
                <Doc
                  name={`design-${row.key}-inside`}
                  lang={lang}
                  label={m.docs[row.key]}
                  title={m.docs[`${row.key}Title` as keyof typeof m.docs]}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 rounded-md border border-border bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
        {m.liveNote}
      </p>

    </PageShell>
  );
}
