"use client";

// Экран выбора двери (шаг 25). Первое, что видно на странице запуска проекта.
//
// 🔒 ОН ЗАКРЫВАЕТ СОБОЙ ВСЁ ОСТАЛЬНОЕ, И ЭТО ГЛАВНОЕ ЕГО СВОЙСТВО. Раньше страница
// показывала все действия сразу — четыре шага, два поля и две кнопки, — и делала
// это человеку, который ещё не решил, откуда он вообще начинает. Показанное
// действие читается как требуемое; четыре требования на входе никто не выполняет.
// Пока путь не выбран, шагов на странице нет вовсе.
//
// 🔒 ТРЕТЬЯ КНОПКА НИЧЕГО НЕ ЗАПУСКАЕТ. Переезд чужого фреймворка — не третья
// дорога отсюда, а продолжение первой: сначала работающий стартовый шаблон, потом
// режим «Переезд». Кнопка, которая записала бы «режим старта = миграция», обещала
// бы способность, которой на этом экране нет, — и человек начал бы её искать.
// Поэтому здесь окно с объяснением и ссылка ровно туда, где переезд живёт.
//
// 🔒 РАЗМЕТКА ОКНА ПРИХОДИТ ГОТОВОЙ. Текст переезда — файл `_content/`, его
// разбирает сервер и отдаёт сюда деревом через `children`: островок не тянет в
// браузер библиотеку разбора markdown и не знает про 82 языка словаря.

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket, GitBranch, ArrowRightLeft, ExternalLink, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { StartMode } from "@/lib/launch.shared";

export type StartChoiceLabels = {
  chooseTitle: string; chooseLead: string;
  starterTitle: string; starterBody: string; starterCta: string;
  starterMoreLabel: string; starterMore: string;
  adoptTitle: string; adoptBody: string; adoptCta: string;
  adoptMoreLabel: string; adoptMore: string;
  migrationCta: string; migrationTitle: string; migrationOpen: string;
  chooseFailed: string;
};

/** Одна дверь: заголовок, суть в двух строках, раскрывашка «что это значит», кнопка. */
function Door(
  { icon, title, body, moreLabel, more, cta, tone, busy, onPick }:
  {
    icon: ReactNode; title: string; body: string;
    moreLabel: string; more: string; cta: string;
    tone: "primary" | "amber";
    busy: boolean; onPick: () => void;
  },
) {
  return (
    <div className="rounded-lg border border-border p-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        <span className={tone === "primary" ? "text-primary" : "text-amber-600 dark:text-amber-400"}>{icon}</span>
        {title}
      </p>

      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{body}</p>

      {/* Родной `<details>`: раскрывается без JS, ищется поиском по странице и
          печатается вместе с ней. Состояния ради одного раскрытия не нужно. */}
      <details className="mt-2 group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight size={10} className="shrink-0 transition-transform group-open:rotate-90" />
          {moreLabel}
        </summary>
        <p className="mt-1.5 rounded-md border border-border bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
          {more}
        </p>
      </details>

      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        className={[
          "mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md px-3",
          "text-[12px] font-medium transition-colors disabled:opacity-60",
          tone === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-amber-500/50 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200",
        ].join(" ")}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : null}
        {cta}
      </button>
    </div>
  );
}

export function StartChoice(
  { labels, migrationDoc, migrationHref }:
  { labels: StartChoiceLabels; migrationDoc: ReactNode; migrationHref: string },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | StartMode>(null);

  async function pick(mode: StartMode) {
    setBusy(mode);
    try {
      const r = await fetch("/api/config/launch/start-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.chooseFailed));
      // Страница СЕРВЕРНАЯ: выбор меняет то, что она рисует целиком, поэтому
      // обновляем её, а не пытаемся собрать мастер здесь.
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.chooseFailed);
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="text-[13px] font-semibold text-foreground">{labels.chooseTitle}</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{labels.chooseLead}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Door
          icon={<Rocket size={14} />}
          title={labels.starterTitle}
          body={labels.starterBody}
          moreLabel={labels.starterMoreLabel}
          more={labels.starterMore}
          cta={labels.starterCta}
          tone="primary"
          busy={busy !== null}
          onPick={() => pick("starter")}
        />
        <Door
          icon={<GitBranch size={14} />}
          title={labels.adoptTitle}
          body={labels.adoptBody}
          moreLabel={labels.adoptMoreLabel}
          more={labels.adoptMore}
          cta={labels.adoptCta}
          tone="amber"
          busy={busy !== null}
          onPick={() => pick("adopt")}
        />
      </div>

      {/* Третья дверь — ниже и тише двух первых: она не путь, а объяснение. */}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <ArrowRightLeft size={11} className="shrink-0" />
            {labels.migrationCta}
          </button>
        </DialogTrigger>

        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-2.5 pr-10">
            <DialogTitle className="text-[13px] font-semibold">{labels.migrationTitle}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(85vh-6rem)] overflow-auto px-4 py-3">{migrationDoc}</div>
          {/* 🔒 НОВАЯ ВКЛАДКА — ТРЕБОВАНИЕ ВЛАДЕЛЬЦА (2026-08-26). Уйдя отсюда в
              том же окне, человек теряет экран выбора и возвращается кнопкой
              «назад», если догадается. Разработка начинается здесь, а режим
              переезда смотрят рядом. */}
          <div className="border-t border-border px-4 py-2.5">
            <a
              href={migrationHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-primary underline underline-offset-2"
            >
              {labels.migrationOpen}
              <ExternalLink size={10} className="shrink-0" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
