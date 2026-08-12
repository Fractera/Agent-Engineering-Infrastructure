"use client";

import { Button } from "@/components/ui/button";

// Полоса выбора языка, на котором правятся подписи кнопок.
//
// 🔒 ЯЗЫКИ — НАБОР СЛОТА, а не 82 языка панели. Панель говорит на всех, чтобы её
// понял любой владелец; подписи кнопок — контент его сайта, и языков у них ровно
// столько, сколько он включил (`NEXT_PUBLIC_SUPPORTED_LANGUAGES`). Предлагать
// перевод на язык, которого у приложения нет, значит просить работу, которая
// никуда не попадёт.
//
// 🔒 ОТМЕТКА «ПЕРЕВЕДЕНО» СЧИТАЕТСЯ ПО ФАКТУ, а не по тому, заходил ли человек
// на вкладку: заходил и ничего не написал — перевода нет.

export function LangStrip(
  { langs, base, active, done, onPick, labels }:
  {
    langs: string[];
    base: string;
    active: string;
    /** Языки, у которых перевод действительно записан. */
    done: Set<string>;
    onPick: (lang: string) => void;
    labels: { baseLang: string; translated: string; notTranslated: string };
  },
) {
  if (langs.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {langs.map((code) => {
        const isBase = code === base;
        const ok = isBase || done.has(code);
        return (
          <Button
            key={code}
            size="sm"
            variant={active === code ? "default" : "outline"}
            className="h-6 px-2 text-[10px] font-mono gap-1"
            title={isBase ? labels.baseLang : ok ? labels.translated : labels.notTranslated}
            onClick={() => onPick(code)}
          >
            {code}
            <span className={ok ? "text-emerald-500" : "text-amber-500"}>●</span>
          </Button>
        );
      })}
    </div>
  );
}
