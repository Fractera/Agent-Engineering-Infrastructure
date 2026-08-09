"use client";

// Режим автоматического развёртывания (шаг 501, Ф2, партия 13).
//
// Единственный островок раздела: это ЗАПИСЬ, меняющая поведение сервера. Список
// прогонов и журнал читает сервер.
//
// Три положения намеренно, а не переключатель «вкл/выкл»: «забирать» и «забирать и
// разворачивать» — разные по цене решения. Первое применяет содержимое сразу и
// ничего не собирает; второе занимает процессор той же машины, которая обслуживает
// посетителей. Поэтому по умолчанию — вручную.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AutoMode } from "../_lib/runs";

export type AutoLabels = {
  manual: string; pull: string; pullDeploy: string;
  savedOff: string; savedTo: string; failed: string;
};

const MODES: AutoMode[] = ["off", "pull", "pull+deploy"];

export function AutoModeSwitch(
  { mode, labels }: { mode: AutoMode; labels: AutoLabels },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<AutoMode | null>(null);

  const label = (m: AutoMode) =>
    m === "off" ? labels.manual : m === "pull" ? labels.pull : labels.pullDeploy;

  async function set(next: AutoMode) {
    if (next === mode) return;
    setBusy(next);
    try {
      const r = await fetch("/api/config/auto-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      toast.success(next === "off" ? labels.savedOff : `${labels.savedTo} ${label(next)}`);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {MODES.map((m) => (
        <Button
          key={m}
          variant={m === mode ? "default" : "outline"}
          size="xs"
          disabled={busy !== null}
          onClick={() => set(m)}
          className="text-[11px]"
        >
          {busy === m && <Loader2 size={10} className="animate-spin" />}
          {label(m)}
        </Button>
      ))}
    </div>
  );
}
