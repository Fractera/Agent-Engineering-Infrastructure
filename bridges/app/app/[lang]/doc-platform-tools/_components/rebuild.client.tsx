"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Пересобрать документ вручную.
//
// Обычно он собирается сам — при установке инструмента. Кнопка нужна для случая,
// когда файла нет вовсе: проект развернули, а ни один инструмент ещё не ставили,
// и документ просто не с чего было родиться.

export function RebuildDocButton(
  { labels }: { labels: { rebuild: string; rebuilding: string; rebuilt: string; failed: string } },
) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/tools/doc", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.rebuilt);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="text-[11px]" onClick={run} disabled={busy}>
      {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
      {busy ? labels.rebuilding : labels.rebuild}
    </Button>
  );
}
