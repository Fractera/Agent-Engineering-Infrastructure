"use client";

import { useSyncExternalStore } from "react";

// Shared, page-scoped automation status (step 188 Phase 4.1). The status pill (top of the
// page) and the settings accordion dots are separate client islands; without a shared
// store the pill only updated on reload. This module-level store lets the bot-key toggle
// update the pill AND the tab dots INSTANTLY, and keeps a single source of truth (one set
// of key/settings fetches, not one per island).
export type AutomationStatus = {
  loaded: boolean;
  enabled: boolean; // cron enabled = the bot (simple) reception track is active
  botKeyOk: boolean; // TELEGRAM_BOT_TOKEN present
  openaiOk: boolean; // OpenAI key configured (inconclusive counts as OK — never a false alarm)
};

let state: AutomationStatus = { loaded: false, enabled: true, botKeyOk: false, openaiOk: false };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function set(patch: Partial<AutomationStatus>) {
  state = { ...state, ...patch };
  emit();
}

let started = false;
export async function refreshAutomationStatus() {
  try {
    const r = await fetch("/api/projects/personal/telegram-notes/settings", { cache: "no-store" });
    const d = r.ok ? ((await r.json()) as { enabled?: boolean }) : null;
    if (d) set({ enabled: d.enabled !== false });
  } catch {
    /* leave enabled as-is */
  }
  try {
    const r = await fetch("/api/project-config/env?keys=TELEGRAM_BOT_TOKEN", { cache: "no-store" });
    const d = r.ok ? ((await r.json()) as { present?: Record<string, boolean> }) : null;
    set({ botKeyOk: d ? Boolean(d.present?.TELEGRAM_BOT_TOKEN) : true });
  } catch {
    set({ botKeyOk: true }); // unknown → do not raise a false alarm
  }
  try {
    const r = await fetch("/api/project-config/openai-key", { cache: "no-store" });
    const d = r.ok ? ((await r.json()) as { configured?: boolean; inconclusive?: boolean }) : null;
    set({ openaiOk: d ? Boolean(d.configured) || Boolean(d.inconclusive) : true });
  } catch {
    set({ openaiOk: true });
  }
  set({ loaded: true });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!started) {
    started = true;
    void refreshAutomationStatus();
  }
  return () => {
    listeners.delete(cb);
  };
}

export function useAutomationStatus(): AutomationStatus {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

// Optimistic setters — called by the bot-key toggle / token save so the pill and the tab
// dots react immediately, before (and confirmed by) the server round-trip.
export function setAutomationEnabled(v: boolean) {
  set({ enabled: v });
}
export function setBotKeyOk(v: boolean) {
  set({ botKeyOk: v });
}

// Restart-window signal (step 207.10 item 7). A runtime env change (saving the bot token) restarts the
// slot (~5s), during which the server briefly stops answering. While this window is open the page
// auto-refresh MUST NOT fire router.refresh() — a refresh against the restarting server was the source
// of the "stale red error that only cleared on reload". Plain module timestamp, read synchronously by
// the auto-refresh tick (same client module, shared across islands).
let applyingUntil = 0;
export function beginApplying(ms = 12000) {
  applyingUntil = Date.now() + ms;
}
export function isApplying(): boolean {
  return Date.now() < applyingUntil;
}

// Derived overall health for the pill — the active bot track and the keys are what count.
export type Health = "loading" | "running" | "degraded" | "broken";
export function healthOf(s: AutomationStatus): { health: Health; label: string } {
  if (!s.loaded) return { health: "loading", label: "Checking…" };
  if (!s.enabled) return { health: "broken", label: "Stopped" };
  const missing = [!s.botKeyOk && "Telegram key", !s.openaiOk && "OpenAI key"].filter(
    Boolean,
  ) as string[];
  if (missing.length === 0) return { health: "running", label: "Running" };
  if (missing.length === 1) return { health: "degraded", label: `Needs ${missing[0]}` };
  return { health: "broken", label: "Not configured" };
}
