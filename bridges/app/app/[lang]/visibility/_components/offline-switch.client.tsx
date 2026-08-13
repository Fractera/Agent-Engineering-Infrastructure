"use client";

// Выключатель офлайн-копии — единственный орган управления на этой вкладке.
//
// ПОЧЕМУ ОН ЗДЕСЬ, А НЕ В «ВОЗМОЖНОСТЯХ ПРИЛОЖЕНИЯ» (владелец 2026-08-13).
// Управление стоит рядом с текстом, который объясняет, ЗАЧЕМ это: список из
// десяти переключателей отвечает на вопрос «что можно включить» и не отвечает
// ни на один вопрос «зачем». Прецедент в проекте уже есть — «Передача сессии»
// живёт тем же правилом: хранилище общее, место в интерфейсе своё.
//
// 🔒 СОХРАНЯЕМ КОНФИГ ЦЕЛИКОМ И ЧУЖИЕ ФЛАГИ ВЕТКИ `features`. Запись одной своей
// ветки стёрла бы режим маршрутизации и области, а сборка `features` с нуля —
// все остальные возможности. Ровно от этого предостерегает сосед в
// `features-editor.client.tsx`, и здесь та же цена ошибки.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function OfflineSwitch(
  { config, initial, labels }: {
    config: Record<string, unknown>;
    initial: boolean;
    labels: {
      label: string; hint: string;
      save: string; saving: string; saved: string;
      failed: string; nothingToSave: string;
    };
  },
) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = on !== initial;

  async function save() {
    if (!dirty) { toast.error(labels.nothingToSave); return; }
    setSaving(true);
    try {
      const existing = (config.features ?? {}) as Record<string, boolean>;
      const features = { ...existing, offlineCache: on };

      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { ...config, features } }),
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
    <div className="mt-2 rounded-md border border-border p-2.5">
      <label className="flex cursor-pointer items-start gap-2">
        <Checkbox checked={on} onCheckedChange={(v) => setOn(v === true)} className="mt-0.5" />
        <span className="flex-1">
          <span className="block text-[11px] font-medium text-foreground">{labels.label}</span>
          <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">{labels.hint}</span>
        </span>
      </label>
      <div className="mt-2 flex justify-end">
        <Button size="sm" className="text-[11px]" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {saving ? labels.saving : labels.save}
        </Button>
      </div>
    </div>
  );
}
