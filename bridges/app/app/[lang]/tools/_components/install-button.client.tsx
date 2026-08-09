"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Download, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Установка инструмента в проект (шаг 501, 2026-08-09).
//
// Островок только ради нажатия: состояние читает сервер и отдаёт пропсами.
//
// Повторная установка ПЕРЕЗАПИСЫВАЕТ файлы, то есть теряет правки владельца.
// Поэтому у обновления есть подтверждение, а у первой установки нет: терять там
// нечего, и лишний вопрос был бы вежливостью в пустоту.

export type InstallLabels = {
  install: string; installing: string; installed: string;
  update: string; updateConfirm: string; cancel: string;
  failed: string; alreadyInstalled: string;
};

export function InstallButton(
  { id, installed, outdated, labels }: {
    id: string;
    installed: boolean;
    outdated: boolean;
    labels: InstallLabels;
  },
) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/tools/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.installed);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-[10px] text-amber-700 dark:text-amber-300">{labels.updateConfirm}</span>
        <Button size="sm" variant="destructive" className="text-[11px]" onClick={run} disabled={busy}>
          {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {labels.update}
        </Button>
        <Button size="sm" variant="ghost" className="text-[11px]" onClick={() => setConfirming(false)} disabled={busy}>
          {labels.cancel}
        </Button>
      </span>
    );
  }

  // Установлен и не отстал — кнопки нет: предлагать «установить» то, что уже
  // стоит, значит звать на потерю правок.
  if (installed && !outdated) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400">
        <Check size={11} />{labels.alreadyInstalled}
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant={outdated ? "outline" : "default"}
      className="text-[11px]"
      onClick={() => (installed ? setConfirming(true) : run())}
      disabled={busy}
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : outdated ? <RefreshCw size={11} /> : <Download size={11} />}
      {busy ? labels.installing : outdated ? labels.update : labels.install}
    </Button>
  );
}
