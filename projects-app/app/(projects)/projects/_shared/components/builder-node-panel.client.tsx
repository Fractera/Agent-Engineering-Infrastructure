"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { History, Loader2, Save, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { useWaveLock } from "./wave-lock.client";
import type { IndexNode } from "./diagram-canvas.client";

// FROZEN STANDARD (step 224 L4) — the BUILDER side panel of a node. A DRAFT (red) node has no instruction
// yet: the owner writes a free-form spec (what it should do, what result it brings) and presses "Start
// development" (L6) to hand it to the coding agent. A MATERIALIZED node shows its system instruction —
// editing it is how a live node becomes a target for its OWN optimization — plus its version history with
// a rollback to an earlier, more effective version. Fork/Instance nodes never reach this panel (a fork is
// parameters + delete only, step 223.C.4).
//
// step 239.1 (owner) — the brief/instruction field carries the shared VoiceInput primitive, exactly as the
// link panel and the chain-brief panel do: a real controlled <Textarea> + a ref, so speech lands at the
// caret. There is no second microphone anywhere in the product — this MOUNTS the one primitive.
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
  // The page-wide development lock (step 240): while a wave is with a coding agent this panel is read-only.
  const { guard, refresh: refreshWave } = useWaveLock();
  const [text, setText] = useState(node.draft ? spec : instruction);
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => setText(node.draft ? spec : instruction), [node.cuid, node.draft, spec, instruction]);

  const save = useCallback(async () => {
    if (!guard()) return;   // a wave is with a coding agent → the lock modal explains, nothing is written
    setBusy(true);
    try {
      await fetch(`/api/projects/nodes/${node.cuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(node.draft ? { spec: text } : { instruction: text }),
      });
      onChanged();
      refreshWave();   // the node is now STAGED — the wave banner must appear at once (step 240)
    } finally {
      setBusy(false);
    }
  }, [node.cuid, node.draft, text, onChanged, guard, refreshWave]);

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

  // STEP 240 — this panel no longer dispatches a development step of its own (its "Start development" button
  // is gone, like every other per-entity button). Saving STAGES the node: a draft's spec.md is pending by
  // definition, and editing a LIVE node's instruction stages an optimization (the node PATCH writes it into
  // the node's transport slot). The page's single wave banner hands the whole batch over at once.

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
        <Textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={node.draft ? "Describe what this node does and what it returns…" : "The node's system instruction…"}
        />
        {/* THE ONE VOICE PRIMITIVE (step 232) — hold, speak, the transcript lands at the caret of the field
            above. Mounted, never re-implemented. */}
        <VoiceInput targetRef={textRef} value={text} onChange={setText} disabled={busy} className="mt-1" />
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

      {/* STEP 240 — the node's own "Start development" button is GONE. Saving is what STAGES this node: a
          draft's spec.md is pending by definition, and editing a LIVE node's instruction stages an
          optimization (the PATCH writes it into the node's transport slot). The whole batch is then handed
          over ONCE, by the wave banner under the page header. */}

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
