"use client";

// Выключатель «Передачи сессии» — на её собственной странице (2026-08-10).
//
// Стоит здесь, а не в «Возможностях приложения»: там речь о том, что приложение
// предлагает ПОСЕТИТЕЛЮ, а передача контекста — про работу агента над проектом.
// К тому же выключатель в одном разделе, а результат в другом означал бы, что
// человек не видит связи между нажатием и тем, что изменилось.
//
// Правка чужой инструкции НИКОГДА не молчит: если панель дописала раздел в
// `CLAUDE.md` (маркеров там не было) или не смогла его обновить — это отдельное
// уведомление, а не строка в журнале, которую никто не читает.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export type SwitchLabels = {
  label: string; description: string;
  saving: string; savedOn: string; savedOff: string; failed: string;
  instructionAdded: string; instructionMissing: string;
  docCreated: string;
};

export function HandoffSwitch(
  { enabled, config, labels }:
  { enabled: boolean; config: Record<string, unknown>; labels: SwitchLabels },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [on, setOn] = useState(enabled);
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    setSaving(true);
    setOn(next);
    try {
      // Конфиг ЦЕЛИКОМ и ветка `features` целиком: рядом живут возможности
      // приложения, и запись одного своего ключа стёрла бы их.
      const features = { ...((config.features ?? {}) as Record<string, unknown>), contextHandoff: next };
      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { ...config, features } }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));

      toast.success(next ? labels.savedOn : labels.savedOff);

      const doc = data.document as { ok: boolean; created: boolean } | undefined;
      if (doc?.created) toast.info(labels.docCreated, { duration: 10000 });

      const ins = data.instruction as { ok: boolean; added: boolean } | undefined;
      if (ins && !ins.ok) toast.error(labels.instructionMissing, { duration: 10000 });
      else if (ins?.added) toast.info(labels.instructionAdded, { duration: 10000 });

      startTransition(() => router.refresh());
    } catch (e) {
      setOn(!next);
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-3 rounded-lg border border-border p-3">
      <Switch checked={on} disabled={saving} onCheckedChange={toggle} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
          {labels.label}
          {saving && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{labels.description}</p>
      </div>
    </div>
  );
}
