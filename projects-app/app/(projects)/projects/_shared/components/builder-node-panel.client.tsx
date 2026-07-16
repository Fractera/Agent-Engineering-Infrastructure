"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { History, Loader2, Save, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { useWaveLock } from "./wave-lock.client";
import type { IndexNode } from "./diagram-canvas.client";
import { INPUT_TYPE_DESCRIPTIONS, OUTPUT_TYPE_DESCRIPTIONS, INTERMEDIATE_TYPE_DESCRIPTIONS } from "../node-contract";
import { useUiLang } from "../use-ui-lang";
import { builderStrings } from "../builder-i18n";
import { WarningBlock, type WarningRow } from "./warning-panel.client";

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
  role,
  ioType,
  automation,
  onChanged,
  onDeleted,
}: {
  node: IndexNode;
  spec: string;
  instruction: string;
  /** The node's LIVE role/type from its meta.ts (polled with the index) — the type editor's current value. */
  role?: string;
  ioType?: string;
  /** "category/slug" — needed to read/answer this node's WARNING (step 246). */
  automation?: string;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const L = builderStrings(useUiLang());
  // The page-wide development lock (step 240): while a wave is with a coding agent this panel is read-only.
  const { guard, refresh: refreshWave } = useWaveLock();
  const [text, setText] = useState(node.draft ? spec : instruction);
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  // THE TYPE EDITOR (owner 2026-07-16) — while a node is a DRAFT the owner can (re)classify it: pick the
  // role (input/intermediate/output), then the per-role type — for an intermediate node the two kinds
  // (transform | condition, the owner's "switch between the two middle types to build logic chains"), for
  // input/output a channel/surface from the taxonomy or a CUSTOM name typed by hand (e.g. "WhatsApp").
  const canonicalTypes = (r: string): string[] =>
    r === "input" ? Object.keys(INPUT_TYPE_DESCRIPTIONS).filter((k) => k !== "custom")
      : r === "output" ? Object.keys(OUTPUT_TYPE_DESCRIPTIONS).filter((k) => k !== "custom")
        : Object.keys(INTERMEDIATE_TYPE_DESCRIPTIONS);
  const [editRole, setEditRole] = useState(role ?? "intermediate");
  const isCanonical = (r: string, t: string | undefined) => !!t && canonicalTypes(r).includes(t);
  const [editType, setEditType] = useState<string>(
    ioType && isCanonical(role ?? "intermediate", ioType) ? ioType : ioType ? "custom" : (role ?? "intermediate") === "intermediate" ? "transform" : "",
  );
  const [customType, setCustomType] = useState(ioType && !isCanonical(role ?? "intermediate", ioType) ? ioType : "");

  useEffect(() => setText(node.draft ? spec : instruction), [node.cuid, node.draft, spec, instruction]);

  // THIS NODE'S WARNING (step 246) — the drawer shows the agent's blocker (with the Hermes-scout reveal and
  // the answer field) right under the node's own brief; answering clears it and re-stages the node.
  const [nodeWarning, setNodeWarning] = useState<WarningRow | null>(null);
  const refetchWarning = useCallback(async () => {
    if (!automation) return;
    try {
      const r = await fetch(`/api/projects/entity-warning?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { warnings?: WarningRow[] };
      setNodeWarning((d.warnings ?? []).find((w) => w.entityType === "node" && w.ref === node.cuid) ?? null);
    } catch { /* keep last */ }
  }, [automation, node.cuid]);
  useEffect(() => { void refetchWarning(); }, [refetchWarning]);
  useEffect(() => {
    const r = role ?? "intermediate";
    setEditRole(r);
    setEditType(ioType && isCanonical(r, ioType) ? ioType : ioType ? "custom" : r === "intermediate" ? "transform" : "");
    setCustomType(ioType && !isCanonical(r, ioType) ? ioType : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.cuid, role, ioType]);

  const saveType = useCallback(async () => {
    if (!guard()) return;
    const finalType = editType === "custom" ? customType.trim() : editType;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/nodes/${node.cuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, ioType: finalType }),
      });
      if (r.ok) { toast.success(L.typeSaved); onChanged(); }
    } finally {
      setBusy(false);
    }
  }, [node.cuid, editRole, editType, customType, guard, onChanged, L.typeSaved]);

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

      {node.draft === 1 && (
        <div className="space-y-2 rounded-md border p-2">
          <p className="text-xs font-medium text-muted-foreground">{L.typeSection}</p>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">{L.roleLabel}</label>
            <select
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              value={editRole}
              onChange={(e) => {
                const r = e.target.value;
                setEditRole(r);
                setEditType(r === "intermediate" ? "transform" : canonicalTypes(r)[0] ?? "custom");
                setCustomType("");
              }}
            >
              <option value="input">{L.roleInput}</option>
              <option value="intermediate">{L.roleIntermediate}</option>
              <option value="output">{L.roleOutput}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">{L.typeLabel}</label>
            <select
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
            >
              {canonicalTypes(editRole).map((t) => (
                <option key={t} value={t}>
                  {editRole === "intermediate" ? (t === "transform" ? L.typeTransform : L.typeCondition) : t}
                </option>
              ))}
              <option value="custom">{L.typeCustom}</option>
            </select>
          </div>
          {editType === "custom" && (
            <input
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder={L.customTypePlaceholder}
            />
          )}
          <Button size="sm" variant="outline" onClick={saveType} disabled={busy || (editType === "custom" && !customType.trim())}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} {L.saveType}
          </Button>
        </div>
      )}

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

      {/* STEP 246 — the node's WARNING (the agent's blocker), with the Hermes-scout reveal + the answer
          field. Below the instruction/functions, as the owner specified. */}
      {automation && nodeWarning && (
        <WarningBlock
          automation={automation} entityType="node" refId={node.cuid} warning={nodeWarning.warning} label={node.name}
          onAnswered={() => { setNodeWarning(null); onChanged(); refreshWave(); }}
        />
      )}

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
