"use client";

// Снимаемая галочка человеческого шага мастера (шаг 25-4).
//
// 🔒 ЭТО ПРИЁМ ФАКТА, А НЕ ПРОВЕРКА. Панель работает на сервере, а Claude Code,
// проводник и папка проекта живут на машине разработчика — канала, по которому
// такой вопрос можно задать, между ними нет. Проверить может только тот, у кого
// они под рукой. Делать вид, что панель это видит, — та самая ложь, которую
// проект выкорчёвывает.
//
// 🔒 ОТМЕТКА СНИМАЕМАЯ. Снял — шаг снова открыт, бусина погасла, мастер вернулся.
// Одноразовая говорила бы «когда-то нажали»: человек, у которого папка потерялась,
// остался бы с зелёной галочкой и без папки.
//
// Приём и разметка — те же, что у `env/_components/transfer-check.client.tsx`;
// отличается только дверь.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { LaunchStepId } from "@/lib/launch.shared";

export type StepCheckLabels = { label: string; saving: string; failed: string };

export function StepCheck(
  { step, initial, labels }:
  { step: LaunchStepId; initial: boolean; labels: StepCheckLabels },
) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    // Галочка обязана отзываться мгновенно, а не через круг к серверу.
    // Не вышло — вернули назад и сказали почему.
    setOn(next);
    try {
      const r = await fetch("/api/config/launch/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, done: next }),
        credentials: "include",
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) throw new Error(String(d.error ?? labels.failed));
      // Бусины и следующий блок рисует сервер: без обновления галочка встала бы,
      // а мастер остался на прежнем шаге.
      router.refresh();
    } catch (e) {
      setOn(!next);
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5">
      <input
        type="checkbox"
        checked={on}
        disabled={busy}
        onChange={(e) => toggle(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-green-600"
      />
      <span className="text-[11px] leading-relaxed text-foreground">
        {busy ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 size={11} className="animate-spin" />
            {labels.saving}
          </span>
        ) : (
          labels.label
        )}
      </span>
    </label>
  );
}
