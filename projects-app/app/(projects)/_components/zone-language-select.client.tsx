"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UI_LANGS } from "../projects/_shared/ui-langs";
import { useUiLang, setUiLang, readUiLangOverride } from "../projects/_shared/use-ui-lang";

// THE ZONE-FOOTER LANGUAGE SELECTOR (owner, 2026-07-27). The cockpit was locked to the server default
// language with no way to switch — so the ten-language admin layer looked English no matter the browser.
// This dropdown lets the owner pick any of the ten manually; the pick is stored + broadcast, and every
// `useUiLang()` consumer re-renders in the new language WITHOUT a page reload (see `setUiLang`).
//
// Each language is shown in its OWN name (endonym) — a language picker never localises its own list, and
// these are proper names, not translatable UI strings (CLAUDE.md 4г: machine/proper strings are exempt).
const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  ru: "Русский",
  de: "Deutsch",
  pt: "Português",
  pl: "Polski",
  tr: "Türkçe",
  nl: "Nederlands",
};

export function ZoneLanguageSelect() {
  const lang = useUiLang();
  const router = useRouter();

  // WRITE-THROUGH на монтировании (2026-07-27): если владелец выбрал язык РАНЬШЕ, чем код стал писать cookie
  // (выбор жил только в localStorage), серверный текст оставался на дефолте, а клиентский — на русском. Здесь
  // на первой загрузке доводим cookie до localStorage-выбора и один раз мягко перерисовываем сервер. Условие
  // «cookie ≠ override» защищает от цикла: после refresh значения совпадают и эффект больше ничего не делает.
  useEffect(() => {
    const ov = readUiLangOverride();
    if (!ov) return;
    const m = document.cookie.match(/(?:^|;\s*)fractera-ui-lang=([a-z]{2})/);
    if (m?.[1] !== ov) {
      document.cookie = `fractera-ui-lang=${ov}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [router]);

  // Pick → override (client, instant) + cookie (server) + a SOFT server re-render so server-rendered text
  // (welcome, section titles, hubs) switches too, WITHOUT a full page reload (owner's requirement).
  const onPick = (v: string) => {
    setUiLang(v);
    router.refresh();
  };
  return (
    <Select value={lang} onValueChange={onPick}>
      <SelectTrigger size="sm" className="h-8 w-auto gap-1.5 border-none px-2 shadow-none hover:bg-muted hover:text-foreground focus-visible:ring-0">
        <Languages className="size-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {UI_LANGS.map((code) => (
          <SelectItem key={code} value={code}>
            {LANG_NAMES[code] ?? code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
