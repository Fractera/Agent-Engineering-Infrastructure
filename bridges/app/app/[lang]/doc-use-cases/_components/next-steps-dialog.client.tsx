"use client";

// Окно «что дальше» — открывается, когда кейсы стали работой (владелец 2026-08-17).
//
// 🔒 ЗАЧЕМ ОНО СУЩЕСТВУЕТ. Человек подтверждает последний кейс — и остаётся у
// зелёного экрана, где делать нечего. Панель молчала обо всём: что родился шаг,
// что дальше работа переезжает на его машину, что для этого нужно скачать файл
// окружения. Он закончил самую трудную часть и не знал, что она закончена.
//
// 🔒 ПОКАЗЫВАЕТСЯ ОДИН РАЗ — при РОЖДЕНИИ шага, а не при каждом подтверждении.
// Окно, всплывающее на каждое действие, перестаёт читаться с третьего раза, и
// тогда его не видят даже в тот единственный раз, когда оно нужно.
//
// 🔒 ДВЕ ФРАЗЫ ДЛЯ АГЕНТА, И ПЕРВАЯ — ПРО ПРОДУКТ (решение владельца).
// Номер шага человек диктует голосом, а «двенадцать» и «двадцать» распознаются
// одинаково; продукт он держит в голове всегда, номер — никогда. Номер остаётся
// второй формой: «вернись именно к этому».
//
// 🔒 КНОПКИ ВЕДУТ ТУДА, ГДЕ ДЕЙСТВИЕ СОВЕРШАЕТСЯ. Пересказать «зайдите в раздел
// переменных окружения» — значит заставить искать; ссылка приводит.

import Link from "next/link";
import { ArrowRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export type NextStepsLabels = {
  title: string;
  /** «Заведён шаг разработки № {n}» — номер подставляется. */
  stepCreated: string;
  whereTitle: string;
  /** Пять пунктов пути: отправить → скачать → клонировать → открыть агента → вернуть. */
  steps: string[];
  sayTitle: string;
  /** «Начни разработку продукта «{product}»» и «Выполни шаг № {n}». */
  sayProduct: string;
  sayStep: string;
  copied: string;
  toGithub: string;
  toEnv: string;
  close: string;
};

const fill = (t: string, v: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export function NextStepsDialog(
  { open, onOpenChange, step, product, lang, labels }:
  {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    step: number;
    /** Имя продукта — то, чем владелец назовёт работу вслух. */
    product: string;
    lang: string;
    labels: NextStepsLabels;
  },
) {
  const [copied, setCopied] = useState<string | null>(null);

  const phrases = [
    fill(labels.sayProduct, { product }),
    fill(labels.sayStep, { n: String(step) }),
  ];

  // Копирование — «лучшее усилие»: без защищённого соединения буфера обмена в
  // браузере нет вовсе, и падать на этом окно не имеет права.
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* нет доступа к буферу — фраза всё равно видна и выделяется */ }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[13px]">{labels.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-[11px] leading-relaxed">
          {/* Что произошло — первым и одной строкой: человек должен узнать
              результат своего нажатия раньше, чем инструкцию. */}
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 text-emerald-700 dark:text-emerald-300">
            {fill(labels.stepCreated, { n: String(step) })}
          </p>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {labels.whereTitle}
            </p>
            <ol className="mt-1.5 space-y-1">
              {labels.steps.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="w-4 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {labels.sayTitle}
            </p>
            <div className="mt-1.5 space-y-1.5">
              {phrases.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => copy(p)}
                  className="flex w-full items-start gap-2 rounded-md border border-border p-2 text-left transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 text-foreground">«{p}»</span>
                  {copied === p
                    ? <Check size={11} className="mt-0.5 shrink-0 text-emerald-600" />
                    : <Copy size={11} className="mt-0.5 shrink-0 text-muted-foreground" />}
                </button>
              ))}
            </div>
            {copied && <p className="mt-1 text-[10px] text-muted-foreground">{labels.copied}</p>}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 pt-3 pb-4">
          {/* 🔒 ССЫЛКА С ВИДОМ КНОПКИ, А НЕ КНОПКА С `asChild`. Примитив кнопки
              этой панели построен на `ButtonPrimitive` и подмены элемента не
              умеет — типы поймали это сразу. Стиль берётся у `buttonVariants`,
              поэтому вид общий, а элемент остаётся ссылкой: переход должен
              открываться в новой вкладке и жить без JavaScript. */}
          <Link
            href={`/${lang}/github`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-[11px]")}
          >
            {labels.toGithub}<ArrowRight size={11} />
          </Link>
          <Link
            href={`/${lang}/env`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-[11px]")}
          >
            {labels.toEnv}<ArrowRight size={11} />
          </Link>
          <span className="flex-1" />
          <Button size="sm" className="text-[11px]" onClick={() => onOpenChange(false)}>
            {labels.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
