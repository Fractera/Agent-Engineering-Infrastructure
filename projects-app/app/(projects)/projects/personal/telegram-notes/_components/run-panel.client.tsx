"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Admin launch panel (contract R9): accepts a manual run input to start the project's durable
// workflow through its trigger route. The started run journals itself into project_cron_runs, so
// it appears in the results table on the next refresh. (The next-run countdown bar was removed —
// owner decision, step 207.20: a relic of the 188 polling model; reminder delivery still ticks on
// the cron schedule, it just is not visualized here.)
export function RunPanel() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startRun() {
    setBusy(true);
    try {
      const res = await fetch("/api/projects/personal/telegram-notes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.trim() ? { input: input.trim() } : {}),
      });
      if (!res.ok) {
        toast.error(`Run did not start (HTTP ${res.status})`);
        return;
      }
      const data = (await res.json()) as { runId?: string };
      setLastRunId(data.runId ?? null);
      toast.success("Workflow run started");
      // The run journals + writes asynchronously; give it a moment, then refresh the (dynamic)
      // server components so records / finances / calendar reflect the result without a reload.
      setTimeout(() => router.refresh(), 1500);
    } catch {
      toast.error("Run did not start (network error)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Run manually (test)
      </div>
      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Run input (optional) — passed to the workflow as its input"
        rows={3}
      />
      <div className="flex items-center gap-3">
        <Button onClick={startRun} disabled={busy}>
          {busy ? "Starting…" : "Run now"}
        </Button>
        {lastRunId && (
          <span className="text-sm text-muted-foreground">
            Started run <code>{lastRunId}</code> — the tables update automatically.
          </span>
        )}
      </div>
    </div>
  );
}
