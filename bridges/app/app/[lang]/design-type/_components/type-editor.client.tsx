"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

// Редактор шкалы текста: множитель и межстрочный интервал.
//
// 🔒 ПРЕДПРОСМОТР СЧИТАЕТСЯ ТЕМИ ЖЕ ФОРМУЛАМИ, ЧТО И САЙТ. Заголовок страницы —
// 30px × множитель, основной текст — 16px × множитель: ровно то, что делает
// `styles/globals.css` гостя. Нарисуй мы «примерно похоже», человек сохранял бы
// вслепую и шёл проверять на сайт — то есть предпросмотр не выполнял бы своей
// единственной работы.

const MIN_SCALE = 0.75;
const MAX_SCALE = 1.5;

type State = { scale: number; leading: number };

export function TypeEditor({ initial, labels }: { initial: State; labels: AdminStrings["designType"] }) {
  const [state, setState] = useState<State>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed" | "same">("idle");

  const changed = state.scale !== initial.scale || state.leading !== initial.leading;

  async function save() {
    if (!changed) { setStatus("same"); return; }
    setStatus("saving");
    try {
      // Значение по умолчанию НЕ отправляется: ветка `type` должна исчезнуть из
      // файла, если владелец вернул шкалу проекта. Иначе в настройках навсегда
      // останется запись «здесь выбрано ровно то же, что и без записи».
      const type: Record<string, number> = {};
      if (state.scale !== 1) type.scale = state.scale;
      if (state.leading !== 1.6) type.leading = state.leading;
      const res = await fetch("/api/config/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { type } }),
      });
      setStatus(res.ok ? "saved" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  const px = (base: number) => Math.round(base * state.scale);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border p-3">
        <label htmlFor="type-scale" className="text-[13px] font-medium text-foreground">
          {labels.scaleLabel}
        </label>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{labels.scaleHint}</p>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="type-scale"
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.05}
            value={state.scale}
            onChange={e => { setStatus("idle"); setState(s => ({ ...s, scale: Number(e.target.value) })); }}
            className="flex-1"
          />
          <span className="w-12 text-right font-mono text-[12px] tabular-nums text-foreground">
            {state.scale.toFixed(2)}
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-border p-3">
        <label htmlFor="type-leading" className="text-[13px] font-medium text-foreground">
          {labels.leadingLabel}
        </label>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{labels.leadingHint}</p>
        <div className="mt-2 flex items-center gap-2">
          {([["compact", 1.4], ["normal", 1.6], ["relaxed", 1.9]] as const).map(([key, value]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={state.leading === value ? "secondary" : "ghost"}
              onClick={() => { setStatus("idle"); setState(s => ({ ...s, leading: value })); }}
            >
              {labels.presets[key]}
            </Button>
          ))}
        </div>
      </section>

      {/* Предпросмотр: те же формулы, что у сайта. */}
      <section className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{labels.preview}</p>
        <p
          className="mt-2 font-serif font-bold tracking-tight text-foreground"
          style={{ fontSize: `${px(30)}px`, lineHeight: 1.15 }}
        >
          {labels.previewH1}
        </p>
        <p
          className="mt-2 text-muted-foreground"
          style={{ fontSize: `${px(16)}px`, lineHeight: state.leading }}
        >
          {labels.previewBody}
        </p>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          {px(30)}px / {px(16)}px · {state.leading}
        </p>
      </section>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={status === "saving"}>
          {status === "saving" ? labels.saving : labels.save}
        </Button>
        {(state.scale !== 1 || state.leading !== 1.6) && (
          <button
            type="button"
            onClick={() => { setStatus("idle"); setState({ scale: 1, leading: 1.6 }); }}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            {labels.reset}
          </button>
        )}
        {status === "saved" && <span className="text-[11px] text-primary">{labels.saved}</span>}
        {status === "failed" && <span className="text-[11px] text-destructive">{labels.failed}</span>}
        {status === "same" && <span className="text-[11px] text-muted-foreground">{labels.nothingToSave}</span>}
      </div>
    </div>
  );
}
