"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FEATURE_ORDER, OFF_WHEN_PARALLEL, EXPERIMENTAL, type FeatureKey } from "@/lib/platform-features.shared";

// Возможности приложения (шаг 501, партия 20).
//
// Островок: переключатели и сохранение. Слова и начальное состояние приезжают с
// сервера — страница читается и без JS.
//
// Три возможности УПРАВЛЯЮТ разделами панели: включил верхнее меню — раздел его
// кнопок появился в меню, выключил — исчез. Поэтому после сохранения зовём
// `router.refresh()`: шапку рисует сервер, и без обновления меню осталось бы
// прежним, пока человек не перезагрузит страницу сам.

export type FeatureLabels = {
  save: string; saving: string; saved: string; failed: string; nothingToSave: string;
  opensSection: string; parallelOff: string;
  experimentalTitle: string; experimentalHint: string;
  instructionAdded: string; instructionMissing: string;
  items: Record<FeatureKey, { label: string; description: string }>;
};

export function FeaturesEditor(
  { config, initial, parallel, sections, labels }: {
    config: Record<string, unknown>;
    initial: Record<FeatureKey, boolean>;
    parallel: boolean;
    /** Возможность → название раздела, который она открывает. */
    sections: Partial<Record<FeatureKey, string>>;
    labels: FeatureLabels;
  },
) {
  const router = useRouter();
  const [state, setState] = useState<Record<FeatureKey, boolean>>(initial);
  const [saving, setSaving] = useState(false);

  const dirty = FEATURE_ORDER.some((k) => state[k] !== initial[k]);

  async function save() {
    if (!dirty) { toast.error(labels.nothingToSave); return; }
    setSaving(true);
    try {
      const features: Record<string, boolean> = {};
      for (const k of FEATURE_ORDER) features[k] = state[k] === true;

      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Конфиг ЦЕЛИКОМ: в нём живут режим маршрутизации и области, и запись
        // одной своей ветки стёрла бы их.
        body: JSON.stringify({ config: { ...config, features } }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.saved);

      // Правка чужой инструкции НИКОГДА не происходит молча. Обычная перезапись
      // блока — рутина и молчит; появление нового раздела в `CLAUDE.md` и
      // отсутствие самого файла человек обязан увидеть.
      const ins = data.instruction as { ok: boolean; added: boolean } | undefined;
      if (ins && !ins.ok) toast.error(labels.instructionMissing, { duration: 10000 });
      else if (ins?.added) toast.info(labels.instructionAdded, { duration: 10000 });

      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex-1" />
        <Button size="sm" className="text-[11px]" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {saving ? labels.saving : labels.save}
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {FEATURE_ORDER.map((key) => {
          const item = labels.items[key];
          const section = sections[key];
          const lockedByParallel = parallel && OFF_WHEN_PARALLEL.includes(key);
          const on = state[key] && !lockedByParallel;
          // Экспериментальные отделены заголовком, а не значком в строке: у них
          // другая природа обещания — такая возможность может измениться или
          // исчезнуть, и включают её сознательно.
          const startsExperimental = EXPERIMENTAL[0] === key;
          return (
            <li key={key} className="flex flex-col gap-2.5 px-3 py-2.5">
              {startsExperimental && (
                <div className="-mx-3 -mt-2.5 mb-0.5 border-b border-border bg-muted/40 px-3 py-1.5">
                  <p className="text-[11px] font-medium text-foreground">{labels.experimentalTitle}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{labels.experimentalHint}</p>
                </div>
              )}
              <div className="flex gap-3">
              <Switch
                checked={on}
                disabled={saving || lockedByParallel}
                onCheckedChange={(v) => setState((p) => ({ ...p, [key]: v }))}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground">{item.label}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{item.description}</p>

                {/* Возможность, открывающая раздел, честно говорит об этом:
                    иначе появление и исчезновение пунктов меню выглядит как
                    случайность. */}
                {section && (
                  <p className={`mt-1 flex items-center gap-1 text-[10px] ${on ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    <ArrowDownRight size={10} className="shrink-0" />
                    {labels.opensSection.replace("{section}", section)}
                  </p>
                )}

                {lockedByParallel && (
                  <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">{labels.parallelOff}</p>
                )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
