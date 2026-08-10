"use client";

// Мастер-выключатель «отключить все вложенные инструкции» (владелец 2026-08-10).
//
// ЗАЧЕМ. Иногда задача не стоит полного цикла разработки: исправить опечатку в
// одном месте. Поднимать ради этого весь корпус — платить контекстом за то, что
// не понадобится. Один щелчок оставляет агента с главной инструкцией и задачей.
//
// 🔒 ВОЗВРАТ ВОССТАНАВЛИВАЕТ ПРЕЖНИЙ НАБОР, а не «включает всё». У владельца
// могли быть выключены отдельные документы задолго до этого, и «включить всё»
// тихо отменило бы его решения. Снимок набора хранит СЕРВЕР (ветка
// `instructions.snapshot` конфига), а не браузер: флаги общие для всех, кто
// открывает панель, и восстановление из чужого браузера вернуло бы набор,
// которого на сервере уже нет.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export type MasterLabels = {
  label: string;
  allOff: string; restored: string;
  effect: string; delivery: string;
  failed: string;
  instructionMissing: string;
};

export function MasterSwitch(
  { allOff, labels }: { allOff: boolean; labels: MasterLabels },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [on, setOn] = useState(allOff);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    setOn(next);
    try {
      const res = await fetch("/api/config/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allOff: next }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));

      toast.success(next ? labels.allOff : labels.restored, {
        description: `${labels.effect} ${labels.delivery}`,
        duration: 12000,
        closeButton: true,
      });

      const ins = data.instruction as { ok: boolean } | undefined;
      if (ins && !ins.ok) toast.error(labels.instructionMissing, { duration: 12000 });

      startTransition(() => router.refresh());
    } catch (e) {
      setOn(!next);
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground">{labels.label}</span>
      {busy && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
      <Switch checked={on} disabled={busy} onCheckedChange={toggle} aria-label={labels.label} />
    </span>
  );
}
