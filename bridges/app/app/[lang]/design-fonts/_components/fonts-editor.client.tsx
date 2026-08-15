"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { DesignWorkbench, DesignPreview } from "../../_components/design-workbench";
import { FONT_CATALOGUE, isSystemFont, type FontEntry } from "@/lib/design/font-catalogue";

// Редактор трёх шрифтовых ролей: слева выбор, справа то, что получится.
//
// 🔒 ПРЕДПРОСМОТР ПОКАЗЫВАЕТ НАСТОЯЩИЙ ШРИФТ, А НЕ ЕГО НАЗВАНИЕ. Первая версия
// рисовала образец системным начертанием и подписывала выбранное имя — то есть
// на вопрос «как это будет выглядеть» отвечала словами. Человеку приходилось
// сохранять вслепую и идти смотреть на сайт.
//
// 🔒 ЗАГРУЖАЮТСЯ ТОЛЬКО ВЫБРАННЫЕ — максимум три ссылки. Подключить все
// четырнадцать записей каталога значило бы тянуть с внешней раздачи по файлу на
// каждую строку списка ради предпросмотра, который смотрят секунду.

type Role = "heading" | "body" | "mono";
type Choice = { family: string; import?: string };
type State = Record<Role, Choice | undefined>;

const ROLES: Role[] = ["heading", "body", "mono"];

export function FontsEditor({ initial, labels }: { initial: State; labels: AdminStrings["designFonts"] }) {
  const [state, setState] = useState<State>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed" | "same">("idle");

  const changed = JSON.stringify(state) !== JSON.stringify(initial);
  const links = [...new Set(ROLES.map(r => state[r]?.import).filter((u): u is string => !!u))];

  function pick(role: Role, entry: FontEntry | null) {
    setStatus("idle");
    setState(prev => ({
      ...prev,
      [role]: entry ? { family: entry.family, ...(entry.import ? { import: entry.import } : {}) } : undefined,
    }));
  }

  async function save() {
    if (!changed) { setStatus("same"); return; }
    setStatus("saving");
    try {
      // Отправляется ВСЯ ветка `fonts`: роль, у которой выбор снят, должна из
      // файла исчезнуть, а не остаться прежним значением.
      const fonts: Record<string, Choice> = {};
      for (const r of ROLES) if (state[r]) fonts[r] = state[r]!;
      const res = await fetch("/api/config/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { fonts } }),
      });
      setStatus(res.ok ? "saved" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  const controls = (
    <div className="flex flex-col gap-4">
      {ROLES.map(role => {
        const current = state[role];
        const options = FONT_CATALOGUE.filter(f => (role === "mono" ? f.kind === "mono" : f.kind !== "mono"));
        return (
          <section key={role} className="rounded-lg border border-border p-3">
            <p className="text-[13px] font-medium text-foreground">{labels.roles[role].label}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {labels.roles[role].description}
            </p>

            <div className="mt-2.5 grid gap-1 sm:grid-cols-2">
              {options.map(entry => {
                const active = current?.family === entry.family;
                const system = isSystemFont(entry.family);
                return (
                  <button
                    key={entry.family}
                    type="button"
                    onClick={() => pick(role, entry)}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left transition-colors ${
                      active ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-[13px] font-medium text-foreground">
                      {system ? labels.systemOption : entry.family}
                    </span>
                    <span className="text-[10px] leading-relaxed text-muted-foreground">
                      {entry.alphabets.map(a => labels.alphabets[a]).join(", ")}
                      {" · "}
                      {system ? labels.noDownload : labels.external}
                    </span>
                  </button>
                );
              })}
            </div>

            {current && (
              <button
                type="button"
                onClick={() => pick(role, null)}
                className="mt-1.5 text-[10px] text-muted-foreground underline hover:text-foreground"
              >
                {labels.reset}
              </button>
            )}
          </section>
        );
      })}

      <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
        {labels.systemNote}
      </p>
    </div>
  );

  const preview = (
    <>
      {/* Настоящие шрифты — только выбранные. */}
      {links.map(href => (
        <link key={href} rel="stylesheet" href={href} />
      ))}

      <DesignPreview label={labels.preview}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {labels.roles.heading.label}
            </p>
            <p
              className="mt-1 text-[22px] font-bold leading-tight text-foreground"
              style={state.heading ? { fontFamily: state.heading.family } : undefined}
            >
              {labels.previewText}
            </p>
          </div>

          <div className="border-t border-border pt-2.5">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {labels.roles.body.label}
            </p>
            <p
              className="mt-1 text-[14px] leading-relaxed text-muted-foreground"
              style={state.body ? { fontFamily: state.body.family } : undefined}
            >
              {labels.previewText}
            </p>
          </div>

          <div className="border-t border-border pt-2.5">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {labels.roles.mono.label}
            </p>
            <p
              className="mt-1 text-[12px] text-muted-foreground"
              style={state.mono ? { fontFamily: state.mono.family } : undefined}
            >
              const total = 0123;
            </p>
          </div>
        </div>
      </DesignPreview>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} disabled={status === "saving"}>
          {status === "saving" ? labels.saving : labels.save}
        </Button>
        {status === "saved" && <span className="text-[11px] text-primary">{labels.saved}</span>}
        {status === "failed" && <span className="text-[11px] text-destructive">{labels.failed}</span>}
        {status === "same" && <span className="text-[11px] text-muted-foreground">{labels.nothingToSave}</span>}
      </div>
    </>
  );

  return <DesignWorkbench controls={controls} preview={preview} />;
}
