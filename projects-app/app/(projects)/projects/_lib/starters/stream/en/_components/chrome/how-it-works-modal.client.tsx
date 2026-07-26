"use client";

import { Sparkles as SparkleIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chromeStrings } from "./i18n";

// МОДАЛКА «КАК ЭТО РАБОТАЕТ» — управляемая (open/onClose), общая для публичной иконки Sparkle и для пункта
// меню (образец v1: одна модалка, два входа). Высота ограничена, прокрутка внутри, заголовок на языке
// владельца. Тело — плейсхолдер под ответ из passport.howItWorks (шаг 265).
//
// 🔒 НА shadcn `Dialog` (шаг 298): прежде — самодельный оверлей со своей кнопкой закрытия.
export default function HowItWorksModal({ lang, open, onClose }: { lang: string; open: boolean; onClose: () => void }) {
  const L = chromeStrings(lang);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex max-h-[600px] flex-col overflow-hidden sm:max-w-[600px]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SparkleIcon className="size-4" />
            {L.howItWorks}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="text-sm text-muted-foreground">{L.howItWorksEmpty}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
