"use client";

// Статус одного шага (2026-08-18).
//
// 🔒 ПЯТЬ ЗНАЧЕНИЙ, И СПИСОК ЗАКРЫТ. Выбор из списка, а не поле ввода: статус
// читают и панель, и агент, и строка не из пяти означает шаг, о котором ни один из
// них не знает. Сервер отвергает неизвестное значение и возвращает допустимые —
// здесь просто нет способа его отправить.
//
// 🔒 ФАЗА ПЕРЕСЧИТЫВАЕТСЯ САМА. Закрыли последний шаг — стадия продукта становится
// «завершено» в том же сохранении: считает её хранилище из массива шагов, а не эта
// кнопка. Поэтому после ответа страница обновляется целиком.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STATUSES = ["new", "in-progress", "blocked", "done", "cancelled"] as const;

export function StepStatus(
  { productId, number, status, labels }: {
    productId: string;
    number: number;
    status: string;
    labels: { names: Record<string, string>; saved: string; failed: string };
  },
) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    const previous = value;
    setValue(next);
    setBusy(true);
    try {
      const res = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ op: "step-status", productId, number, status: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      toast.success(labels.saved);
      router.refresh();
    } catch (e) {
      // Возврат к прежнему значению обязателен: список, показывающий выбор,
      // которого сервер не принял, — это ложь на экране.
      setValue(previous);
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{labels.names[s] ?? s}</option>
      ))}
    </select>
  );
}
