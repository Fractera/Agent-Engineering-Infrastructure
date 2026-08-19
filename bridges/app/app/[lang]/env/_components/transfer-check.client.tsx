"use client";

// Галочка «`.env.local` перенесён на локальную машину» (владелец 2026-08-19).
//
// 🔒 ЭТО НЕ «СКРЫТЬ УВЕДОМЛЕНИЕ», А ЗАПИСЬ ФАКТА. Скачивание файла панель видит,
// а перенос — нет: между загрузками браузера и папкой клона у неё нет глаз. Факт
// сообщает тот, кто его совершил, и предупреждение гаснет как следствие.
//
// Отметка СНИМАЕМАЯ: снял галочку — предупреждение вернулось. Одноразовая
// говорила бы «когда-то нажали», а это ровно та ложь, которую проект выкорчёвывает.
//
// Приём и разметка — те же, что у отметок инструментов разработки
// (`dev-tools/_components/installed-check.client.tsx`); отличается только дверь.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TransferCheck(
  { initial, labels }:
  { initial: boolean; labels: { label: string; saving: string; failed: string } },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    // Состояние показываем сразу: галочка обязана отзываться мгновенно, а не
    // через круг к серверу. Не вышло — вернули назад и сказали почему.
    setOn(next);
    try {
      const r = await fetch("/api/config/env-transferred", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferred: next }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      // 🔒 КРАСНОЕ ОБЯЗАНО ПОГАСНУТЬ СРАЗУ. Отметку пишет сервер, а предупреждение
      // рисуют шапка, дерево на главной и подвал — тоже на сервере. Без обновления
      // галочка встала бы, а красное висело до перезагрузки, и человек перестал бы
      // верить обоим.
      startTransition(() => router.refresh());
    } catch (e) {
      setOn(!next);
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-[12px] font-medium leading-relaxed text-blue-800 transition-colors hover:bg-blue-500/15 dark:text-blue-200">
      <input
        type="checkbox"
        checked={on}
        disabled={busy}
        onChange={(e) => toggle(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="flex items-center gap-1.5">
        {labels.label}
        {busy && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
      </span>
    </label>
  );
}
