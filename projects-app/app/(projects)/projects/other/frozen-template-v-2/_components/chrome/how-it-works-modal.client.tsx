"use client";

import { chromeStrings } from "./i18n";
import { SparkleIcon, CloseIcon } from "./icons";

// МОДАЛКА «КАК ЭТО РАБОТАЕТ» — управляемая (open/onClose), общая для публичной иконки Sparkle и для пункта
// меню (образец v1: одна модалка, два входа). max-height 600px, вертикальная прокрутка, заголовок на языке
// владельца. Тело — плейсхолдер под ответ из passport.howItWorks (шаг 265).
export default function HowItWorksModal({ lang, open, onClose }: { lang: string; open: boolean; onClose: () => void }) {
  if (!open) return null;
  const L = chromeStrings(lang);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={L.howItWorks}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[600px] w-full max-w-[600px] flex-col overflow-hidden rounded-lg border bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <SparkleIcon className="size-4" />
            {L.howItWorks}
          </span>
          <button type="button" onClick={onClose} aria-label={L.cancel} className="text-muted-foreground hover:text-foreground">
            <CloseIcon className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">{L.howItWorksEmpty}</p>
        </div>
      </div>
    </div>
  );
}
