"use client";

// «Начать сначала» (шаг 25).
//
// 🔒 ЗАЧЕМ ВЫХОД ИЗ МАСТЕРА. Экран выбора стоит перед человеком, который ещё
// ничего не знает о продукте; промахнуться кнопкой там — норма, а не небрежность.
// Мастер без выхода означал бы, что промах стоит всего пути.
//
// 🔒 ДВЕ РАЗНЫЕ КНОПКИ, А НЕ ОДНА С ГАЛОЧКОЙ. Обычный сброс возвращает к выбору и
// оставляет связь с GitHub: адрес и ключ вводили один раз, терять их при каждом
// «начну заново» незачем. Стирание связи — отдельное решение с отдельной ценой, и
// цена названа прямо над кнопкой, а не спрятана в подсказке.
//
// 🔒 СТЁРТЫЙ АДРЕС НАЗЫВАЕТСЯ ВСЛУХ. Сервер возвращает то, что было записано до
// сброса, и мы показываем это в сообщении: восстановить связь без адреса нельзя,
// а человек обычно вспоминает об этом уже после нажатия.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export type LaunchResetLabels = {
  restart: string; restartTitle: string; restartBody: string;
  restartKeep: string; restartWithGithub: string; restartWithGithubHint: string;
  restartCancel: string; restartDone: string; restartFailed: string;
};

export function LaunchReset({ labels }: { labels: LaunchResetLabels }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reset(withGithub: boolean) {
    setBusy(true);
    try {
      const r = await fetch("/api/config/launch/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withGithub }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.restartFailed));

      // Длинная выдержка намеренно: в сообщении может стоять адрес, который
      // только что перестал существовать на сервере, и прочитать его надо успеть.
      toast.success(
        withGithub && d.previousRepoUrl
          ? `${labels.restartDone} ${d.previousRepoUrl}`
          : labels.restartDone,
        { duration: withGithub ? 20000 : 5000 },
      );
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.restartFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          <RotateCcw size={10} className="shrink-0" />
          {labels.restart}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[13px] font-semibold">{labels.restartTitle}</DialogTitle>
        </DialogHeader>

        <p className="text-[11px] leading-relaxed text-muted-foreground">{labels.restartBody}</p>

        <div className="mt-1 space-y-2">
          <button
            type="button"
            onClick={() => reset(false)}
            disabled={busy}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 text-[11px] font-medium text-foreground transition-colors hover:border-foreground/30 disabled:opacity-60"
          >
            {busy && <Loader2 size={11} className="animate-spin" />}
            {labels.restartKeep}
          </button>

          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5">
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-destructive">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
              <span>{labels.restartWithGithubHint}</span>
            </p>
            <button
              type="button"
              onClick={() => reset(true)}
              disabled={busy}
              className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-destructive/50 px-3 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            >
              {busy && <Loader2 size={11} className="animate-spin" />}
              {labels.restartWithGithub}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="w-full text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-60"
          >
            {labels.restartCancel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
