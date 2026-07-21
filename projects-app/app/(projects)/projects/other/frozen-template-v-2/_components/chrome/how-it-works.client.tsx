"use client";

import { useState } from "react";
import { chromeStrings } from "./i18n";
import { SparkleIcon } from "./icons";
import HowItWorksModal from "./how-it-works-modal.client";

// «КАК ЭТО РАБОТАЕТ» на ПУБЛИЧНОЙ поверхности — иконка Sparkle в правом верхнем углу открывает общую
// модалку. Деградирует без JS (это допускается каноном) — на странице остаётся сам герой.
export default function HowItWorks({ lang }: { lang: string }) {
  const L = chromeStrings(lang);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={L.howItWorks}
        title={L.howItWorks}
        className="rounded-md border p-1.5 text-muted-foreground hover:text-foreground"
      >
        <SparkleIcon className="size-4" />
      </button>
      <HowItWorksModal lang={lang} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
