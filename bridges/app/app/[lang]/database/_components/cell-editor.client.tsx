"use client";

// Правка одной ячейки и удаление строки (шаг 501, Ф2, партия 3).
//
// ГЛАВНОЕ РЕШЕНИЕ РАЗДЕЛА. Что именно правится, задаёт АДРЕС:
// `?table=users&edit=42&col=email`. Поэтому таблица остаётся полностью
// серверной, а островков на странице ровно ДВА — этот диалог и подтверждение
// удаления, — сколько бы строк ни было. Если бы клик по ячейке держал состояние,
// островком пришлось бы делать каждую ячейку: 500 строк × десяток столбцов, то
// есть тысячи компонентов, которые браузер обязан оживить. Здесь их два.
//
// Побочная выгода адреса: правку конкретной ячейки можно переслать ссылкой, а
// «назад» закрывает диалог, потому что закрытие — это тоже адрес.
//
// Словарь сюда не импортируется: подписи приезжают пропсами с сервера.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type CellEditorLabels = {
  editTitle: string; valueLabel: string; cancel: string; save: string;
  updated: string; failed: string;
};

type Props = {
  table: string;
  rowId: string;
  column: string;
  initialValue: string;
  single: string[] | null;
  multi: string[] | null;
  closeHref: string;
  labels: CellEditorLabels;
};

export function CellEditor(
  { table, rowId, column, initialValue, single, multi, closeHref, labels }: Props,
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  function close() {
    // Закрытие — возврат к адресу без параметров правки; `replace`, чтобы
    // «назад» не возвращал открытый диалог.
    router.replace(closeHref);
  }

  function checked(): string[] {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function toggle(option: string) {
    const current = checked();
    const next = current.includes(option)
      ? current.filter((r) => r !== option)
      : [...current, option];
    setValue(JSON.stringify(next));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/db/tables/${encodeURIComponent(table)}/${encodeURIComponent(rowId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.updated);
      router.replace(closeHref);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl bg-background p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            {labels.editTitle} <span className="font-mono text-primary">{column}</span>
          </span>
          <Button variant="ghost" size="icon-xs" onClick={close} aria-label={labels.cancel}>
            <X size={13} />
          </Button>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{table} · id: {rowId}</span>

        {multi ? (
          <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
            {multi.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2 text-[11px] text-foreground">
                <input type="checkbox" checked={checked().includes(opt)} onChange={() => toggle(opt)} className="accent-primary" />
                {opt}
              </label>
            ))}
            <span className="mt-1 font-mono text-[10px] text-muted-foreground">{value}</span>
          </div>
        ) : single ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 rounded-lg border border-border bg-muted px-2.5 font-mono text-[11px] text-foreground focus:ring-2 focus:ring-ring/50 focus:outline-none"
          >
            {single.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            aria-label={labels.valueLabel}
            className="resize-none rounded-lg border border-border bg-muted px-2.5 py-1.5 font-mono text-[11px] text-foreground focus:ring-2 focus:ring-ring/50 focus:outline-none"
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={close}>{labels.cancel}</Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={11} className="mr-1 animate-spin" /> : null}{labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
