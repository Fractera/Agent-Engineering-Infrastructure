"use client";

import { healthOf, useAutomationStatus, type Health } from "../_lib/automation-status";

// Automation state pill (step 188 Phase 2, shared-store in Phase 4.1) — next to the
// title. Reads the shared automation store, so toggling the bot track in Settings
// updates this pill INSTANTLY (no reload). Green = running, amber = a key missing, red =
// stopped or unconfigured.
const STYLE: Record<Health, { dot: string; text: string }> = {
  loading: { dot: "bg-muted-foreground/50 animate-pulse", text: "text-muted-foreground" },
  running: { dot: "bg-green-500", text: "text-green-600 dark:text-green-500" },
  degraded: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-500" },
  broken: { dot: "bg-red-500", text: "text-red-600 dark:text-red-500" },
};

export function StatusIndicator() {
  const status = useAutomationStatus();
  const { health, label } = healthOf(status);
  const s = STYLE[health];
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
      <span className={`size-2.5 rounded-full ${s.dot}`} aria-hidden />
      <span className={s.text}>{label}</span>
    </div>
  );
}
