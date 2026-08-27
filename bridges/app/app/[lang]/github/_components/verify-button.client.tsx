"use client";

// Кнопка «проверить» для машинных шагов мастера (шаг 25-3).
//
// 🔒 ОТКАЗ НАЗЫВАЕТ ПРИЧИНУ СЛОВАМИ. Дверь возвращает машинный код
// (`repo_not_found`, `auth_failed`, `key_not_issued`, `no_main_branch`), здесь он
// превращается в фразу на языке панели. «Не получилось» без причины заставляет
// человека гадать, а гадают обычно неверно — и бросают настройку.
//
// 🔒 УСПЕХ ОБНОВЛЯЕТ СТРАНИЦУ, а не только кнопку. Отметку ставит сервер, а
// рисуют её бусины и блок следующего шага — тоже на сервере. Без `router.refresh()`
// кнопка позеленела бы, а полоса и шаг остались прежними: человек увидел бы, что
// проверка прошла, и что мастер этого не заметил.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { LaunchStepId } from "@/lib/launch.shared";

export type VerifyLabels = {
  action: string;
  checking: string;
  failedPrefix: string;
  /** Причина отказа по машинному коду; недостающий код падает на `unknown`. */
  reasons: Record<string, string>;
};

export function VerifyButton(
  { step, labels, pulse = false }:
  { step: LaunchStepId; labels: VerifyLabels; pulse?: boolean },
) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await fetch("/api/config/launch/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
        credentials: "include",
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) {
        const code = String(d.error ?? "unknown");
        toast.error(`${labels.failedPrefix} ${labels.reasons[code] ?? labels.reasons.unknown ?? code}`);
        return;
      }
      router.refresh();
    } catch (e) {
      toast.error(`${labels.failedPrefix} ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={
        "inline-flex items-center gap-2 rounded-md px-4 py-2 text-[12px] font-medium text-white " +
        "bg-orange-600 hover:bg-orange-500 disabled:opacity-60 " +
        (pulse && !busy ? "launch-pulse" : "")
      }
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
      {busy ? labels.checking : labels.action}
    </button>
  );
}
