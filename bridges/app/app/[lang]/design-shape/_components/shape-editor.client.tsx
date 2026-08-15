"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { DesignWorkbench, DesignPreview } from "../../_components/design-workbench";

// Редактор форм и отступов: скругление, рамка, плотность, ширина.
//
// 🔒 ГОТОВЫЕ ЗНАЧЕНИЯ, А НЕ СВОБОДНЫЙ ВВОД. Радиус в пикселях владелец набирал
// бы наугад, и «17px» отличается от «16px» ничем, кроме несовпадения с остальным
// интерфейсом. Четыре ступени отвечают на настоящий вопрос — насколько мягким
// должен выглядеть продукт, — а не на вопрос «сколько именно пикселей».

type State = { radius: string; borderWidth: string; spaceScale: number; appWidth: string };

const DEFAULTS: State = { radius: "0.625rem", borderWidth: "1px", spaceScale: 1, appWidth: "80rem" };

const RADIUS = [
  ["square", "0rem"],
  ["soft", "0.375rem"],
  ["round", "0.625rem"],
  ["pill", "1.25rem"],
] as const;

const SPACE = [
  ["dense", 0.75],
  ["normal", 1],
  ["airy", 1.4],
] as const;

const WIDTH = ["64rem", "80rem", "96rem"] as const;

export function ShapeEditor({ initial, labels }: { initial: State; labels: AdminStrings["designShape"] }) {
  const [state, setState] = useState<State>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed" | "same">("idle");

  const changed = JSON.stringify(state) !== JSON.stringify(initial);
  const set = (patch: Partial<State>) => { setStatus("idle"); setState(s => ({ ...s, ...patch })); };

  async function save() {
    if (!changed) { setStatus("same"); return; }
    setStatus("saving");
    try {
      // Значения, равные проектным, не отправляются: ветка должна исчезнуть, а
      // не хранить запись «здесь выбрано ровно то же, что и без записи».
      const shape: Record<string, string | number> = {};
      if (state.radius !== DEFAULTS.radius) shape.radius = state.radius;
      if (state.borderWidth !== DEFAULTS.borderWidth) shape.borderWidth = state.borderWidth;
      if (state.spaceScale !== DEFAULTS.spaceScale) shape.spaceScale = state.spaceScale;
      if (state.appWidth !== DEFAULTS.appWidth) shape.appWidth = state.appWidth;
      const res = await fetch("/api/config/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { shape } }),
      });
      setStatus(res.ok ? "saved" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  const controls = (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border p-3">
        <p className="text-[13px] font-medium text-foreground">{labels.radiusLabel}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{labels.radiusHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RADIUS.map(([key, value]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={state.radius === value ? "secondary" : "ghost"}
              onClick={() => set({ radius: value })}
            >
              {labels.radiusPresets[key]}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border p-3">
        <p className="text-[13px] font-medium text-foreground">{labels.borderLabel}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{labels.borderHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["1px", "2px", "3px"].map(value => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={state.borderWidth === value ? "secondary" : "ghost"}
              onClick={() => set({ borderWidth: value })}
            >
              {value}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border p-3">
        <p className="text-[13px] font-medium text-foreground">{labels.spaceLabel}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{labels.spaceHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SPACE.map(([key, value]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={state.spaceScale === value ? "secondary" : "ghost"}
              onClick={() => set({ spaceScale: value })}
            >
              {labels.spacePresets[key]}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border p-3">
        <p className="text-[13px] font-medium text-foreground">{labels.widthLabel}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{labels.widthHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {WIDTH.map(value => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={state.appWidth === value ? "secondary" : "ghost"}
              onClick={() => set({ appWidth: value })}
            >
              {Math.round(parseFloat(value) * 16)}px
            </Button>
          ))}
        </div>
      </section>
    </div>
  );

  // Предпросмотр рисуется теми же значениями, что уедут в настройки: карточка с
  // выбранным углом, выбранной рамкой и воздухом по выбранной плотности.
  const preview = (
    <>
      <DesignPreview label={labels.preview}>
        <div
          className="bg-background"
          style={{
            borderRadius: state.radius,
            borderWidth: state.borderWidth,
            borderStyle: "solid",
            borderColor: "var(--border)",
            padding: `${1.25 * state.spaceScale}rem`,
          }}
        >
          <p className="text-[13px] font-medium text-foreground">{labels.previewCard}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{labels.previewBody}</p>
          <Button size="sm" className="mt-2.5" style={{ borderRadius: state.radius }}>
            {labels.save}
          </Button>
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          {state.radius} · {state.borderWidth} · ×{state.spaceScale} · {state.appWidth}
        </p>
      </DesignPreview>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} disabled={status === "saving"}>
          {status === "saving" ? labels.saving : labels.save}
        </Button>
        {JSON.stringify(state) !== JSON.stringify(DEFAULTS) && (
          <button
            type="button"
            onClick={() => { setStatus("idle"); setState(DEFAULTS); }}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            {labels.reset}
          </button>
        )}
        {status === "saved" && <span className="text-[11px] text-primary">{labels.saved}</span>}
        {status === "failed" && <span className="text-[11px] text-destructive">{labels.failed}</span>}
        {status === "same" && <span className="text-[11px] text-muted-foreground">{labels.nothingToSave}</span>}
      </div>
    </>
  );

  return <DesignWorkbench controls={controls} preview={preview} />;
}
