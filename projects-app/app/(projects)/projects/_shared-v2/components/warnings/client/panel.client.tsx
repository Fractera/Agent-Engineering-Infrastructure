"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWarnings } from "./provider.client";
import { warningStrings } from "./i18n";

// ЦЕНТР ПРОБЛЕМ (дев-слой) — потребитель ПРОВАЙДЕРА: открытые предупреждения берёт из контекста (единый
// источник). Перенос сути v1 `ProblemsCenter` на v2-ядро: бейдж «⚠ N» + модалка, которая перебирает
// предупреждения по одному (назад/далее). ТОЛЬКО shadcn (правило владельца): Dialog/Button/Badge + иконки
// lucide. Автооткрытие ОДИН РАЗ при заходе, если есть открытые проблемы — владелец не должен их пропустить.
//
// Ответ на предупреждение (v1 писал в историю и возвращал в разработку) — отдельный будущий шаг; здесь
// Центр показывает и перебирает проблемы из ядра.
export function ProblemsCenter({ lang }: { lang: string }) {
  const { warnings } = useWarnings();
  const W = warningStrings(lang);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const autoOpened = useRef(false);

  // Автооткрытие ОДИН раз за загрузку страницы, когда появились открытые проблемы.
  useEffect(() => {
    if (warnings.length && !autoOpened.current) { autoOpened.current = true; setOpen(true); }
  }, [warnings.length]);

  if (!warnings.length) return null;
  const i = Math.min(idx, warnings.length - 1);
  const row = warnings[i];

  return (
    <div className="mt-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label={W.badge}
        title={W.badge}
        className="gap-2 border-amber-500/60 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
      >
        <TriangleAlert className="size-3.5" /> ⚠ {warnings.length}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[600px] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" /> {W.title}
            </DialogTitle>
            <DialogDescription>{W.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate font-medium">{row.name}</span>
              <Badge variant="outline" className="shrink-0">{W.counter.replace("{i}", String(i + 1)).replace("{n}", String(warnings.length))}</Badge>
            </div>

            <div className="space-y-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                <TriangleAlert className="size-4 shrink-0" /> {W.blockTitle}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-amber-900 dark:text-amber-100">{row.text}</p>
            </div>

            {warnings.length > 1 ? (
              <div className="flex justify-between">
                <Button size="sm" variant="ghost" onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={i === 0}>
                  <ChevronLeft className="size-3.5" /> {W.prev}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIdx((v) => Math.min(warnings.length - 1, v + 1))} disabled={i >= warnings.length - 1}>
                  {W.next} <ChevronRight className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { WarningProvider } from "./provider.client";
