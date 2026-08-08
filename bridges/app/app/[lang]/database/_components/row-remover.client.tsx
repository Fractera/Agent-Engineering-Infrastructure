"use client";

// Подтверждение удаления строки (шаг 501, Ф2, партия 3). Второй и последний
// островок раздела; какая строка удаляется, задаёт адрес `?delete=<id>`.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type RowRemoverLabels = {
  title: string; body: string; cancel: string; delete: string; deleted: string; failed: string;
};

export function RowRemover(
  { table, rowId, closeHref, labels }:
  { table: string; rowId: string; closeHref: string; labels: RowRemoverLabels },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [running, setRunning] = useState(false);

  async function remove() {
    setRunning(true);
    try {
      const res = await fetch(`/api/db/tables/${encodeURIComponent(table)}/${encodeURIComponent(rowId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.deleted);
      router.replace(closeHref);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl bg-background p-5 shadow-xl">
        <span className="text-xs font-semibold text-foreground">{labels.title}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{table} · id: {rowId}</span>
        <span className="text-[11px] text-muted-foreground">{labels.body}</span>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => router.replace(closeHref)}>{labels.cancel}</Button>
          <Button variant="destructive" size="sm" onClick={remove} disabled={running}>
            {running ? <Loader2 size={11} className="mr-1 animate-spin" /> : null}{labels.delete}
          </Button>
        </div>
      </div>
    </div>
  );
}
