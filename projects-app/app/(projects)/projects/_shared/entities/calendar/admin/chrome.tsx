"use client";

import { Info } from "lucide-react";
import { useUiLang } from "../../../use-ui-lang";
import { calendarStrings } from "../../../calendar-i18n";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// ADMIN file — may import view/, must NEVER be imported by view/ and never reach into another entity.
// Enforced by `npm run check:entity-imports`.
//
// THE CALENDAR — ADMIN CHROME (step 254.4): the owner-facing framing of the read-only preview — what
// this section is and how it will grow (the interactive creation flow is a later step). A visitor never
// needs this explanation; the requirement panel is composed by the container (../index).
export function CalendarInstruction() {
  const lang = useUiLang();
  const L = calendarStrings(lang);
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground" data-calendar-admin="instruction">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <div>
        <p className="font-medium text-foreground">{L.instructionTitle}</p>
        <p>{L.instructionBody}</p>
      </div>
    </div>
  );
}
