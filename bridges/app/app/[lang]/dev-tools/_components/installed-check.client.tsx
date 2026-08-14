"use client";

// Галочка «поставил» у инструмента разработки (владелец 2026-08-14: «где
// чекбокс, в котором я отмечаю, что установил расширение?»).
//
// 🔒 ЧТО ОНА НА САМОМ ДЕЛЕ ДЕЛАЕТ. Не «скрывает уведомление», а записывает факт:
// инструмент у меня есть. Предупреждение в шапке гаснет как следствие. Разница
// не словесная — снятая галочка возвращает предупреждение, и потому оно остаётся
// правдой, а не памятью о том, что когда-то нажали «больше не показывать».
//
// 🔒 ПОЧЕМУ ЭТО ВООБЩЕ ВАЖНО. Предупреждение, которое нельзя снять, перестают
// читать — и вместе с ним перестают читать соседние, где стоят настоящие
// блокировки. Одна незакрываемая строка обесценивает всю область.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function InstalledCheck(
  { tool, initial, labels }:
  { tool: string; initial: boolean; labels: { label: string; done: string; undone: string; failed: string } },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    // Показываем новое состояние сразу: галочка обязана отзываться мгновенно, а
    // не через круг к серверу. Не вышло — возвращаем назад и говорим почему.
    setOn(next);
    try {
      const r = await fetch("/api/dev-tools/installed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, installed: next }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      toast.success(next ? labels.done : labels.undone);
      // 🔒 ПРЕДУПРЕЖДЕНИЕ ОБЯЗАНО ИСЧЕЗНУТЬ СРАЗУ (владелец 2026-08-14).
      //
      // Отметка пишется на сервере, а предупреждение рисует ШАПКА — тоже на
      // сервере, при отрисовке страницы. Без этой строки галочка вставала, а
      // «Дайте агенту глаза в браузере» продолжало висеть до перезагрузки: со
      // стороны это читается как «галочка не работает», и человек перестаёт
      // верить обеим — и галочке, и предупреждению.
      //
      // Обновляем ВСЮ страницу, а не одну карточку: гаснет ровно то
      // предупреждение, чей ключ изменился, остальные пересчитываются из того
      // же файла и остаются на месте.
      startTransition(() => router.refresh());
    } catch (e) {
      setOn(!next);
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="mt-2.5 flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-[11px] leading-relaxed text-foreground transition-colors hover:bg-accent/50">
      <input
        type="checkbox"
        checked={on}
        disabled={busy}
        onChange={(e) => toggle(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="flex items-center gap-1.5">
        {labels.label}
        {busy && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
      </span>
    </label>
  );
}
