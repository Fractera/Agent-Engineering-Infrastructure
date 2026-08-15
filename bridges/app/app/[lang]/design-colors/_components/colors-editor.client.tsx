"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { DesignWorkbench, DesignPreview } from "../../_components/design-workbench";

// Редактор цветов: семь ролей, две темы, живая проверка контраста.
//
// 🔒 КОНТРАСТ СЧИТАЕТСЯ ЗДЕСЬ, А НЕ ПРОВЕРЯЕТСЯ ПОТОМ. У проекта есть сторож
// палитры (`npm run check:contrast`), но он смотрит ФАЙЛ ТЕМЫ на сборке — а
// выбор владельца живёт в настройках и до сборки не доходит вовсе. Единственное
// место, где нечитаемое сочетание можно поймать до того, как его увидит
// посетитель, — этот экран, в момент выбора.
//
// 🔒 ЦВЕТ ТЕКСТА НА КНОПКЕ ЗДЕСЬ НЕ СПРАШИВАЕТСЯ. Его считает приложение по
// яркости выбранного цвета (`lib/design-css.ts`). Предпросмотр повторяет тот же
// расчёт — иначе он показывал бы кнопку, которой не будет.

type Role = "primary" | "accent" | "background" | "foreground" | "muted" | "border" | "destructive";
type Theme = "light" | "dark";
type State = Record<Theme, Partial<Record<Role, string>>>;

const ROLES: Role[] = ["primary", "accent", "background", "foreground", "muted", "border", "destructive"];

/** Запасные значения темы — только чтобы было что показать в предпросмотре. */
const FALLBACK: Record<Theme, Record<Role, string>> = {
  light: {
    primary: "#343434", accent: "#f7f7f7", background: "#ffffff", foreground: "#252525",
    muted: "#f7f7f7", border: "#ebebeb", destructive: "#c33a2b",
  },
  dark: {
    primary: "#ebebeb", accent: "#444444", background: "#252525", foreground: "#fbfbfb",
    muted: "#444444", border: "#3a3a3a", destructive: "#e5533d",
  },
};

function lum(hex: string): number | null {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map(c => c + c).join("") : m[1];
  const chan = [0, 2, 4].map(i => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

/** Отношение контраста по стандарту доступности: от 1 до 21. */
function ratio(a: string, b: string): number | null {
  const la = lum(a), lb = lum(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Чёрным или белым писать поверх цвета — тот же порог, что в приложении. */
function onColor(hex: string): string {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return "#ffffff";
  const h = m[1].length === 3 ? m[1].split("").map(c => c + c).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#252525" : "#fbfbfb";
}

export function ColorsEditor({ initial, labels }: { initial: State; labels: AdminStrings["designColors"] }) {
  const [state, setState] = useState<State>(initial);
  const [theme, setTheme] = useState<Theme>("light");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed" | "same">("idle");

  const changed = JSON.stringify(state) !== JSON.stringify(initial);
  const shown = (role: Role) => state[theme][role] ?? FALLBACK[theme][role];

  function set(role: Role, value: string) {
    setStatus("idle");
    setState(s => ({ ...s, [theme]: { ...s[theme], [role]: value } }));
  }

  function clear(role: Role) {
    setStatus("idle");
    setState(s => {
      const next = { ...s[theme] };
      delete next[role];
      return { ...s, [theme]: next };
    });
  }

  async function save() {
    if (!changed) { setStatus("same"); return; }
    setStatus("saving");
    try {
      const res = await fetch("/api/config/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { colors: state } }),
      });
      setStatus(res.ok ? "saved" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  const contrast = ratio(shown("foreground"), shown("background"));
  const verdict =
    contrast === null ? null : contrast >= 4.5 ? "ok" : contrast >= 3 ? "low" : "bad";

  const controls = (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(["light", "dark"] as Theme[]).map(t => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={theme === t ? "secondary" : "ghost"}
            onClick={() => setTheme(t)}
          >
            {t === "light" ? labels.themeLight : labels.themeDark}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {ROLES.map(role => {
          const own = state[theme][role];
          return (
            <section key={role} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
              <input
                type="color"
                aria-label={labels.roles[role].label}
                value={shown(role)}
                onChange={e => set(role, e.target.value)}
                className="mt-0.5 size-8 shrink-0 cursor-pointer rounded border border-border bg-transparent"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground">{labels.roles[role].label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {labels.roles[role].description}
                </p>
              </div>
              {own && (
                <button
                  type="button"
                  onClick={() => clear(role)}
                  className="shrink-0 text-[10px] text-muted-foreground underline hover:text-foreground"
                >
                  {labels.reset}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );

  const preview = (
    <>
      <DesignPreview label={labels.preview}>
        <div
          className="rounded-md p-3"
          style={{ background: shown("background"), border: `1px solid ${shown("border")}` }}
        >
          <p className="text-[15px] font-bold" style={{ color: shown("foreground") }}>
            {labels.previewHeading}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: shown("foreground"), opacity: 0.75 }}>
            {labels.previewBody}
          </p>
          <span
            className="mt-2.5 inline-block rounded px-2.5 py-1 text-[11px] font-medium"
            style={{ background: shown("primary"), color: onColor(shown("primary")) }}
          >
            {labels.previewButton}
          </span>
        </div>

        {/* Контраст — измерение, поэтому показывается числом, а не значком. */}
        {contrast !== null && (
          <div
            className={`mt-2 rounded-md border px-2.5 py-2 ${
              verdict === "ok"
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                : verdict === "low"
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
            }`}
          >
            <p className="text-[11px] font-medium">
              {verdict === "ok" ? labels.contrastOk : verdict === "low" ? labels.contrastLow : labels.contrastBad}
              {" · "}
              <span className="font-mono tabular-nums">{contrast.toFixed(1)}:1</span>
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed opacity-90">{labels.contrastHint}</p>
          </div>
        )}
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
