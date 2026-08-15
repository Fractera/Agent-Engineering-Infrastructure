"use client";

// Перенос одиночного `USE-CASES.md` в папку.
//
// Проект мог родиться до того, как кейсы стали папкой. Игнорировать его файл
// нельзя — он написан человеком; удалить тем более. Поэтому: кладём содержимое
// одним кейсом-черновиком, исходник оставляем на месте, решение о его судьбе
// принимает владелец.

import { useState } from "react";
import { productParam } from "./product-param";
import { useRouter } from "next/navigation";
import { Loader2, FileInput } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function MigrateLegacy(
  { labels }: { labels: { hint: string; action: string; done: string; failed: string } },
) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function migrate() {
    setBusy(true);
    try {
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productParam(), op: "migrate" }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(labels.failed);
      toast.success(labels.done);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-dashed border-border p-2.5">
      <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.hint}</p>
      <Button size="sm" variant="outline" className="mt-2 text-[11px]" onClick={migrate} disabled={busy}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <FileInput size={11} />}
        {labels.action}
      </Button>
    </div>
  );
}
