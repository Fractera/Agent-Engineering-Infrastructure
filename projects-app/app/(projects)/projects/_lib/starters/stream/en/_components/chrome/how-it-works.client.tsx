"use client";

import { useState } from "react";
import { Sparkles as SparkleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chromeStrings } from "./i18n";
import HowItWorksModal from "./how-it-works-modal.client";

// «КАК ЭТО РАБОТАЕТ» на ПУБЛИЧНОЙ поверхности — иконка Sparkle в правом верхнем углу открывает общую
// модалку. Деградирует без JS (это допускается каноном) — на странице остаётся сам герой.
//
// 🔒 НА shadcn (шаг 298): триггер — `Button variant="outline" size="icon"` вместо сырого `<button>`.
export default function HowItWorks({ lang }: { lang: string }) {
  const L = chromeStrings(lang);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="size-8 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label={L.howItWorks}
        title={L.howItWorks}
      >
        <SparkleIcon className="size-4" />
      </Button>
      <HowItWorksModal lang={lang} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
