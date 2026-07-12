"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, Rocket, Save, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { IndexNode } from "./diagram-canvas.client";

// FROZEN STANDARD (step 224 L4) — the BUILDER side panel of a node. A DRAFT (red) node has no instruction
// yet: the owner writes a free-form spec (what it should do, what result it brings) and presses "Start
// development" (L6) to hand it to the coding agent. A MATERIALIZED node shows its system instruction —
// editing it is how a live node becomes a target for its OWN optimization — plus its version history with
// a rollback to an earlier, more effective version. Fork/Instance nodes never reach this panel (a fork is
// parameters + delete only, step 223.C.4).
type Version = { version: number; summary: string; created_at: string };

export function BuilderNodePanel({
  node,
  spec,
  instruction,
  onChanged,
  onDeleted,
}: {
  node: IndexNode;
  spec: string;
  instruction: string;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [text, setText] = useState(node.draft ? spec : instruction);
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => setText(node.draft ? spec : instruction), [node.cuid, node.draft, spec, instruction]);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(`/api/projects/nodes/${node.cuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(node.draft ? { spec: text } : { instruction: text }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }, [node.cuid, node.draft, text, onChanged]);

  const loadHistory = useCallback(async () => {
    const r = await fetch(`/api/projects/nodes/${node.cuid}/versions`, { cache: "no-store" });
    if (r.ok) setVersions(((await r.json()) as { versions: Version[] }).versions ?? []);
    setShowHistory(true);
  }, [node.cuid]);

  const rollback = useCallback(
    async (version: number) => {
      setBusy(true);
      try {
        await fetch(`/api/projects/nodes/${node.cuid}/rollback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version }),
        });
        onChanged();
      } finally {
        setBusy(false);
      }
    },
    [node.cuid, onChanged],
  );

  // Save the brief/instruction first (so the step carries the latest text), then materialize the step file
  // and show the copy-paste message. The owner pastes it into a coder chat; the agent executes step #N.
  const startDevelopment = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(`/api/projects/nodes/${node.cuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(node.draft ? { spec: text } : { instruction: text }),
      });
      const r = await fetch(`/api/projects/nodes/${node.cuid}/start-development`, { method: "POST" });
      if (!r.ok) {
        // THE USER-CASE GATE (step 231): no cases, or the owner has not confirmed the current set. The server
        // says exactly which — show it, and take him to the Use cases panel to settle it.
        const err = (await r.json().catch(() => ({}))) as { error?: string; reason?: string };
        const gated = err.reason === "no-cases" || err.reason === "not-reviewed";
        toast.error(err.error ?? "Could not create the development step.", {
          duration: 15000,
          action: gated
            ? {
                label: "Open user cases",
                // One Use cases panel per page — it listens for this and opens its review dialog.
                onClick: () => window.dispatchEvent(new CustomEvent("usecases:review", { detail: {} })),
              }
            : undefined,
        });
        return;
      }
      const d = (await r.json()) as { number: number; message: string };
      toast.success(`You created a technical brief for the coding agent (step #${d.number})`, {
        description: "Copy this message and paste it into the coding agent's chat.",
        duration: 30000,
        action: {
          label: "Copy",
          onClick: () => { void navigator.clipboard.writeText(d.message); toast.success("Copied — paste it into the coder's chat."); },
        },
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }, [node.cuid, node.draft, text, onChanged]);

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(`/api/projects/nodes/${node.cuid}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setBusy(false);
    }
  }, [node.cuid, onDeleted]);

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{node.name}</p>
        <p className="text-xs text-muted-foreground">
          {node.draft ? (
            <span className="text-rose-600 dark:text-rose-400">Draft — not built yet</span>
          ) : (
            <>
              Version {node.active_version}
              {node.latest_version > node.active_version ? ` (rolled back; latest is ${node.latest_version})` : ""}
            </>
          )}
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {node.draft ? "Brief — how should this node work, what result does it bring?" : "System instruction"}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full rounded-md border bg-background p-2 text-sm"
          placeholder={node.draft ? "Describe what this node does and what it returns…" : "The node's system instruction…"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
        </Button>
        {!node.draft && (
          <Button size="sm" variant="outline" onClick={loadHistory} disabled={busy}>
            <History className="size-3.5" /> History
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={remove} disabled={busy} className="text-rose-600">
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>

      {/* START DEVELOPMENT (step 224 L6) — saves the brief/instruction, materializes a development step file
          into the product queue (:3002/service/development-steps) and shows the copy-paste message for the
          coding agent. A draft = first build; a live node whose instruction was edited = an OPTIMIZATION. */}
      <Button size="sm" variant="secondary" onClick={startDevelopment} disabled={busy} className="w-full">
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />} Start development
      </Button>

      {showHistory && (
        <div className="space-y-1 rounded-md border p-2">
          <p className="text-xs font-medium text-muted-foreground">Version history</p>
          {versions.length === 0 && <p className="text-xs text-muted-foreground">No versions yet.</p>}
          {versions.map((v) => (
            <div key={v.version} className="flex items-center justify-between gap-2 text-xs">
              <span>
                v{v.version} {v.summary ? `— ${v.summary}` : ""}
                {v.version === node.active_version ? " (active)" : ""}
              </span>
              {v.version !== node.active_version && (
                <Button size="sm" variant="ghost" onClick={() => rollback(v.version)} disabled={busy}>
                  <Undo2 className="size-3" /> Roll back
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
