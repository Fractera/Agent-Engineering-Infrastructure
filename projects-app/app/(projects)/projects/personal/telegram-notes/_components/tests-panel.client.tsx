"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RunPanel } from "./run-panel.client";

// Tests panel (step 207.10 items 4 & 6) — replaces the murky "Run the automation" box. Each entity the
// automation depends on gets a one-click probe that verifies it actually WORKS (not just present) and
// shows a green/red result inline + a Sonner toast. The free-form "Custom test" (a manual workflow run)
// lives below. Probes reuse the existing check-key / calendar-status / records routes — no new APIs.
type Status = "idle" | "running" | "ok" | "fail";
type Probe = {
  id: string;
  label: string;
  hint: string;
  run: () => Promise<{ ok: boolean; detail: string }>;
};

async function checkKey(target: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const r = await fetch("/api/projects/personal/telegram-notes/check-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    const d = (await r.json().catch(() => null)) as { ok?: boolean; detail?: string; error?: string } | null;
    if (!r.ok) return { ok: false, detail: d?.error ?? `HTTP ${r.status}` };
    return { ok: Boolean(d?.ok), detail: d?.detail ?? (d?.ok ? "OK" : "not working") };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "network error" };
  }
}

const PROBES: Probe[] = [
  { id: "openai", label: "AI key", hint: "OpenAI key authorizes", run: () => checkKey("openai") },
  { id: "telegram", label: "Telegram bot", hint: "Bot token is valid", run: () => checkKey("telegram") },
  { id: "image", label: "Image reading", hint: "Receipt vision (uses the AI key)", run: () => checkKey("openai") },
  { id: "memory", label: "Vector memory", hint: "LightRAG is reachable", run: () => checkKey("lightrag") },
  {
    id: "calendar",
    label: "Calendar",
    hint: "External calendar connector",
    run: async () => {
      try {
        const r = await fetch("/api/projects/personal/telegram-notes/calendar/status", { cache: "no-store" });
        const d = (await r.json().catch(() => null)) as { configured?: boolean; connected?: boolean } | null;
        if (!r.ok) return { ok: false, detail: `HTTP ${r.status}` };
        if (d?.connected) return { ok: true, detail: "Calendar connected" };
        if (d?.configured) return { ok: false, detail: "Configured but not connected — open Connectors" };
        return { ok: false, detail: "No calendar connector configured (optional)" };
      } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message : "network error" };
      }
    },
  },
  {
    id: "database",
    label: "Database",
    hint: "Records store responds",
    run: async () => {
      try {
        const r = await fetch("/api/projects/personal/telegram-notes/records?offset=0", { cache: "no-store" });
        return r.ok
          ? { ok: true, detail: "Database is responding" }
          : { ok: false, detail: `HTTP ${r.status}` };
      } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message : "network error" };
      }
    },
  },
];

function StatusIcon({ s }: { s: Status }) {
  if (s === "running") return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (s === "ok") return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />;
  if (s === "fail") return <XCircle className="size-4 text-rose-600 dark:text-rose-400" />;
  return <CircleDashed className="size-4 text-muted-foreground" />;
}

export function TestsPanel() {
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [detail, setDetail] = useState<Record<string, string>>({});

  async function probe(p: Probe) {
    setStatus((s) => ({ ...s, [p.id]: "running" }));
    const res = await p.run();
    setStatus((s) => ({ ...s, [p.id]: res.ok ? "ok" : "fail" }));
    setDetail((d) => ({ ...d, [p.id]: res.detail }));
    if (res.ok) toast.success(`${p.label}: ${res.detail}`);
    else toast.error(`${p.label}: ${res.detail}`);
  }

  return (
    <div className="space-y-4">
      {/* Entity tests — one probe per integration the automation depends on. */}
      <div className="space-y-2 rounded-lg border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entity tests</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROBES.map((p) => {
            const s = status[p.id] ?? "idle";
            return (
              <div key={p.id} className="flex items-center gap-2 rounded-md border p-2">
                <StatusIcon s={s} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{detail[p.id] ?? p.hint}</p>
                </div>
                <Button variant="outline" size="sm" disabled={s === "running"} onClick={() => probe(p)}>
                  Test
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom test — a manual workflow run with free-form input. */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Custom test</p>
        <RunPanel />
      </div>
    </div>
  );
}
