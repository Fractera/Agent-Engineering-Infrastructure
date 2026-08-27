"use client";

// ДЕЙСТВИЕ МАШИННОГО ШАГА: ПРОВЕРКА СВЯЗИ (28-19, 2026-08-27).
//
// 🔒 ЭТО ОТДЕЛЬНЫЙ ОСТРОВОК, А НЕ РЕЖИМ `StepForm`. У формы есть поле, значение и
// правило готовности; здесь нет ни одного из трёх: человек ничего не вводит, а
// шаг закрывает ответ GitHub. Втиснуть их в один файл значило бы завести форму
// «без поля» — то есть сделать вид, что шаг чего-то ждёт от рук человека.
//
// 🔒 ПРИЧИНА ОТКАЗА ПЕРЕВОДИТСЯ ЗДЕСЬ. Дверь отдаёт машинное слово (`bad-token`,
// `no-repo`, `no-push`), а человеку нужно ДЕЙСТВИЕ. Список причин закрытый:
// незнакомое слово даёт общий текст, а не пустоту — иначе отказ без объяснения
// выглядит как поломка панели.
//
// 🔒 ДВЕРЬ ПРИХОДИТ ПАРАМЕТРОМ (28-21): шаги «проверить связь» и «отправить
// проект» отличаются ТОЛЬКО адресом двери и словами. Второй островок с той же
// логикой разошёлся бы с первым на первой правке поведения — например, когда
// понадобится не гасить кнопку после успеха.
//
// 🔒 ПОСЛЕ УДАЧИ — `router.refresh()`. Зелёный круг и отметка рисуются сервером
// из состояния; без обновления страницы человек увидел бы тост об успехе рядом с
// незакрытым шагом.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type VerifyLabels = {
  cta: string;
  busy: string;
  successTitle: string;
  successHint: string;
  failureTitle: string;
  /** Причина → что делать. Ключи совпадают с машинными словами двери. */
  reasons: Record<string, string>;
  /** Текст для причины, которой нет в списке. */
  reasonUnknown: string;
};

const TOAST_MS = 5000;

export function VerifyStep({ labels, endpoint = "/api/config/launch-flow/verify" }: { labels: VerifyLabels; endpoint?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; reason?: string; repo?: string };

      if (r.ok && d.ok) {
        toast.success(labels.successTitle, {
          description: `${labels.successHint}${d.repo ? ` — ${d.repo}` : ""}`,
          duration: TOAST_MS,
        });
        router.refresh();
        setBusy(false);
        return;
      }

      const fix = (d.reason && labels.reasons[d.reason]) || labels.reasonUnknown;
      toast.error(labels.failureTitle, { description: fix, duration: TOAST_MS });
    } catch {
      toast.error(labels.failureTitle, { description: labels.reasons.network ?? labels.reasonUnknown, duration: TOAST_MS });
    }
    setBusy(false);
  }

  return (
    <Button
      type="button"
      onClick={run}
      disabled={busy}
      data-step-cta
      data-verify
      className="h-11 w-full text-[length:var(--fs-small)]"
    >
      {busy && <Loader2 size={16} className="animate-spin" />}
      {busy ? labels.busy : labels.cta}
    </Button>
  );
}
