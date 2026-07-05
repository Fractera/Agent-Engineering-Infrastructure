"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Admin launch panel (contract R9): accepts the run input and starts the
// project's durable workflow through its trigger route. The started run
// journals itself into project_cron_runs, so it appears in the processes /
// results tables below on the next page load.
export function RunPanel() {
  const [input, setInput] = useState("");
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startRun() {
    setBusy(true);
    try {
      const res = await fetch("/api/projects/{{CATEGORY}}/{{PROJECT}}/run", {
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
    } catch {
      toast.error("Run did not start (network error)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
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
            Started run <code>{lastRunId}</code> — reload the page to see it in
            the tables.
          </span>
        )}
      </div>
    </div>
  );
}
