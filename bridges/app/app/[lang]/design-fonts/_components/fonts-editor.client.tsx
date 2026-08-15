"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { FONT_CATALOGUE, SYSTEM_STACK, isSystemFont, type FontEntry } from "@/lib/design/font-catalogue";

// Редактор трёх шрифтовых ролей.
//
// 🔒 ПРЕДПРОСМОТР РИСУЕТСЯ ТЕМ ЖЕ СЕМЕЙСТВОМ, ЧТО УЕДЕТ В НАСТРОЙКИ, но шрифт в
// самой панели при этом НЕ подключается: строка показывается системным начертанием
// с подписью, что именно выбрано. Иначе панель тянула бы с внешней раздачи по
// файлу на каждое движение списка — ради предпросмотра, который смотрят секунду.

type Role = "heading" | "body" | "mono";
type Choice = { family: string; import?: string };
type State = Record<Role, Choice | undefined>;

const ROLES: Role[] = ["heading", "body", "mono"];

export function FontsEditor({ initial, labels }: { initial: State; labels: AdminStrings["designFonts"] }) {
  const [state, setState] = useState<State>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed" | "same">("idle");

  const changed = JSON.stringify(state) !== JSON.stringify(initial);

  function pick(role: Role, entry: FontEntry | null) {
    setStatus("idle");
    setState(prev => ({
      ...prev,
      role: undefined,
      ...{ [role]: entry ? { family: entry.family, ...(entry.import ? { import: entry.import } : {}) } : undefined },
    } as State));
  }

  async function save() {
    if (!changed) { setStatus("same"); return; }
    setStatus("saving");
    try {
      // Отправляется ВСЯ ветка `fonts` целиком: роль, у которой выбор снят,
      // должна из файла исчезнуть, а не остаться прежним значением.
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

  return (
    <div className="flex flex-col gap-5">
      {ROLES.map(role => {
        const current = state[role];
        const options = FONT_CATALOGUE.filter(f => role === "mono" ? f.kind === "mono" : f.kind !== "mono");
        return (
          <section key={role} className="rounded-lg border border-border p-3">
            <p className="text-[13px] font-medium text-foreground">{labels.roles[role].label}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {labels.roles[role].description}
            </p>

            <div className="mt-2.5 flex flex-col gap-1">
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
                    <span className="text-[12px] font-medium text-foreground">
                      {system ? labels.systemOption : entry.family}
                    </span>
                    <span className="text-[10px] leading-relaxed text-muted-foreground">
                      {labels.covers}: {entry.alphabets.map(a => labels.alphabets[a]).join(", ")}
                      {" · "}
                      {system ? labels.noDownload : labels.external}
                    </span>
                  </button>
                );
              })}

              {current && (
                <button
                  type="button"
                  onClick={() => pick(role, null)}
                  className="mt-1 self-start text-[10px] text-muted-foreground underline hover:text-foreground"
                >
                  {labels.reset}
                </button>
              )}
            </div>

            <p className="mt-2.5 border-t border-border pt-2 text-[10px] text-muted-foreground">
              {labels.preview}: <span className="text-[12px] text-foreground">{labels.previewText}</span>
              {current && !isSystemFont(current.family) && (
                <span className="ml-1 text-muted-foreground">— {current.family}</span>
              )}
            </p>
          </section>
        );
      })}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={status === "saving"}>
          {status === "saving" ? labels.saving : labels.save}
        </Button>
        {status === "saved" && <span className="text-[11px] text-primary">{labels.saved}</span>}
        {status === "failed" && <span className="text-[11px] text-destructive">{labels.failed}</span>}
        {status === "same" && <span className="text-[11px] text-muted-foreground">{labels.nothingToSave}</span>}
      </div>

      <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
        {labels.systemNote}
      </p>
    </div>
  );
}
