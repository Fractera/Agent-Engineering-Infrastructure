"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SlotLayoutPreview } from "./slot-layout-preview.client";
import { LIST_ORDER, LOCKED, type SlotName } from "../_lib/slots";

// Выбор областей раскладки (шаг 501, Ф2, партия 18 — перенос один-в-один).
//
// Островок: наведение подсвечивает область на чертеже, переключатели двигают
// блоки за 300 мс, и весь смысл страницы в том, чтобы ВИДЕТЬ выбор до сохранения.
// Серверной разметкой этого не сделать.
//
// Начальное состояние читает СЕРВЕР и передаёт пропсами — страница показывает
// сохранённую раскладку сразу, без пустого экрана и круга по сети.
//
// Сохранение отправляет конфиг ЦЕЛИКОМ (`config` из пропсов + наши два ключа):
// в файле лежат и чужие настройки, и запись только своих полей стёрла бы их.

export type PickerLabels = {
  useParallel: string;
  activeSlots: string;
  required: string;
  save: string; saving: string; saved: string; failed: string; nothingToSave: string;
  appliesOnLoad: string; routingOff: string;
  childrenLabel: string;
  slots: Record<SlotName, string>;
};

export function SlotPicker(
  { config, initialRouting, initialActive, labels }: {
    config: Record<string, unknown>;
    initialRouting: boolean;
    initialActive: SlotName[];
    labels: PickerLabels;
  },
) {
  const router = useRouter();
  const [active, setActive] = useState<Set<SlotName>>(() => new Set(initialActive));
  const [routing, setRouting] = useState(initialRouting);
  const [hovered, setHovered] = useState<SlotName | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty =
    routing !== initialRouting ||
    LIST_ORDER.some((s) => active.has(s) !== initialActive.includes(s));

  function toggle(slot: SlotName) {
    if (LOCKED.includes(slot)) return;
    setActive((prev) => {
      const next = new Set(prev);
      // Центр тянет за собой свои шапку и подвал: они живут ВНУТРИ него и без
      // него не имеют места на экране.
      if (slot === "center") {
        if (next.has("center")) {
          next.delete("center");
          next.delete("centerHeader");
          next.delete("centerFooter");
        } else {
          next.add("center");
          next.add("centerHeader");
          next.add("centerFooter");
        }
      } else if (next.has(slot)) {
        next.delete(slot);
      } else {
        next.add(slot);
      }
      return next;
    });
  }

  async function save() {
    if (!dirty) { toast.error(labels.nothingToSave); return; }
    setSaving(true);
    try {
      // Стандарт формата — `ARCHITECTURE-PARALLEL-ROUTING.md` §0.1. Две формы,
      // третьей нет: стандартный режим пишется БЕЗ `slots` (описывать раскладку,
      // которую никто не раскладывает, значит хранить неправду), параллельный —
      // со ВСЕМИ восемью именами. Прежний ключ `parallelRouting` удаляется.
      const next: Record<string, unknown> = { ...config };
      delete next.parallelRouting;

      if (routing) {
        const slots: Record<string, boolean> = {};
        for (const s of LIST_ORDER) slots[s] = active.has(s);
        next.routingMode = "parallel";
        next.slots = slots;
      } else {
        next.routingMode = "standard";
        delete next.slots;
      }

      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: next }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.saved);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2">
        {/* Главный переключатель стоит НА странице, а не в меню: он решает,
            применяется ли вообще то, что под ним, и прятать его глубже того,
            чем он управляет, — задом наперёд. */}
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Switch checked={routing} onCheckedChange={setRouting} disabled={saving} />
          {labels.useParallel}
        </label>
        <span className="flex-1" />
        <Button size="sm" className="text-[11px]" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {saving ? labels.saving : labels.save}
        </Button>
      </div>

      <div className="flex min-h-[320px] overflow-hidden">
        <SlotLayoutPreview
          active={active}
          hovered={hovered}
          labels={labels.slots}
          centerLabel={routing ? labels.slots.center : labels.childrenLabel}
        />

        {/* Список областей принадлежит параллельной маршрутизации, поэтому он на
            экране только пока она включена: уезжает вправо, а не сереет, и
            чертёж забирает освободившуюся ширину. Ширина и сдвиг едут вместе —
            без ширины панель уехала бы, оставив дыру. */}
        <div
          className="flex min-h-0 flex-col overflow-hidden px-4 py-4"
          style={{
            flex: routing ? "1 1 0%" : "0 0 0%",
            transform: routing ? "translateX(0)" : "translateX(100%)",
            opacity: routing ? 1 : 0,
            transition: "flex-basis 300ms ease-in-out, flex-grow 300ms ease-in-out, transform 300ms ease-in-out, opacity 200ms ease-in-out",
          }}
          aria-hidden={!routing}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground">{labels.activeSlots}</p>
          <div className="mb-3 border-b border-border" />
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {LIST_ORDER.map((slot) => {
              const locked = LOCKED.includes(slot);
              const disabledByCenter = (slot === "centerHeader" || slot === "centerFooter") && !active.has("center");
              const off = locked || disabledByCenter;
              return (
                <label
                  key={slot}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors ${off ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-muted"}`}
                  onMouseEnter={() => setHovered(slot)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <input
                    type="checkbox"
                    checked={active.has(slot)}
                    disabled={off || saving}
                    onChange={() => toggle(slot)}
                    className="accent-primary"
                  />
                  <span className="flex flex-1 flex-col leading-tight">
                    <span className="text-foreground">{labels.slots[slot]}</span>
                    {locked && <span className="text-[10px] text-muted-foreground">{labels.required}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-border px-3 py-2">
        <span className="text-[10px] text-muted-foreground">
          {routing ? labels.appliesOnLoad : labels.routingOff}
        </span>
      </div>
    </div>
  );
}
