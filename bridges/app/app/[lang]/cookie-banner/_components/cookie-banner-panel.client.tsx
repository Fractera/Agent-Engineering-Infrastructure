"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// Единственная настройка баннера — показывать его или нет.
//
// 🔒 ОДИН ПЕРЕКЛЮЧАТЕЛЬ, И ЭТО РЕШЕНИЕ ВЛАДЕЛЬЦА (2026-08-12). Слова баннера
// живут в приложении на 82 языках и уже переведены; страница политики — обычная
// страница проекта. Значит настраивать здесь больше нечего, и добавлять поля
// «на всякий случай» значило бы заводить второй источник для того, что уже
// имеет один.
//
// 🔒 ЧУЖИЕ ФЛАГИ ВЕТКИ `features` СОХРАНЯЮТСЯ. В ней лежат выключатели верхнего
// меню, страниц подвала и прочего; собрать объект с нуля значило бы стереть их
// при первом сохранении отсюда — а владелец обнаружил бы пропажу на другой
// странице и не связал бы с этой.

export function CookieBannerPanel(
  { initial, config, labels }:
  {
    initial: boolean;
    config: Record<string, unknown>;
    labels: {
      toggle: string; on: string; off: string;
      save: string; saving: string; saved: string; failed: string; nothingToSave: string;
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
      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Конфиг целиком: в нём живут режим маршрутизации и прочие ветки.
        body: JSON.stringify({ config: { ...config, features: { ...existing, cookieBanner: on } } }),
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
    <div className="space-y-4">
      <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-foreground">{labels.toggle}</span>
          <span className="text-[10px] text-muted-foreground">{on ? labels.on : labels.off}</span>
        </span>
        <Switch checked={on} onCheckedChange={setOn} />
      </label>

      <Button size="sm" onClick={save} disabled={saving || !dirty}>
        {saving && <Loader2 className="size-3.5 animate-spin" />}
        {saving ? labels.saving : labels.save}
      </Button>
    </div>
  );
}
