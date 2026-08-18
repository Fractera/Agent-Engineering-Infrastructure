"use client";

// Выбор режима разработки (2026-08-18).
//
// Островок ради одного действия: выбрать и сохранить. Слова и начальное значение
// приходят с сервера — страница читается и без JavaScript, а словарь панели на 82
// языка в браузер не уезжает.
//
// 🔒 ЧУЖИЕ КЛЮЧИ КОНФИГА СОХРАНЯЮТСЯ. Пишем в тот же файл, где живут выключатели
// возможностей и набор документов агента: отправить один только режим значило бы
// стереть остальное. Тот же приём, что у редактора возможностей.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// 🔒 СПИСОК РЕЖИМОВ ЖИВЁТ В НЕЙТРАЛЬНОМ ФАЙЛЕ. Он нужен и серверной странице;
// экспортированный отсюда, на сервере он превращался в клиентскую ссылку и ронял
// страницу в белый экран (владелец, 2026-08-18).
import { MODES, type DevelopmentMode } from "@/lib/development-mode";
export type { DevelopmentMode };

export type ModeLabels = {
  save: string; saving: string; saved: string; failed: string; nothingToSave: string;
  current: string;
  items: Record<DevelopmentMode, { label: string; description: string; when: string }>;
};

export function ModePicker(
  { config, initial, labels }: {
    config: Record<string, unknown>;
    initial: DevelopmentMode;
    labels: ModeLabels;
  },
) {
  const router = useRouter();
  const [mode, setMode] = useState<DevelopmentMode>(initial);
  const [saving, setSaving] = useState(false);

  const dirty = mode !== initial;

  async function save() {
    if (!dirty) { toast.error(labels.nothingToSave); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config: { ...config, developmentMode: mode } }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d?.error) throw new Error(String(d?.error ?? labels.failed));
      toast.success(labels.saved);
      // Режим читает не только эта страница: агент берёт его из того же файла, а
      // шапка панели рисуется сервером. Без обновления человек видел бы прежнее.
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {MODES.map((id) => {
        const item = labels.items[id];
        const chosen = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
              chosen ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                chosen ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              {chosen && <Check size={10} />}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-foreground">
                {item.label}
                {id === initial && (
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                    {labels.current}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{item.description}</span>
              {/* «Когда брать» отделено: описание отвечает на «что это», а выбирают
                  по второму вопросу — подходит ли это моей сегодняшней задаче. */}
              <span className="mt-1.5 block text-[10px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                {item.when}
              </span>
            </span>
          </button>
        );
      })}

      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? labels.saving : labels.save}
        </Button>
      </div>
    </div>
  );
}
