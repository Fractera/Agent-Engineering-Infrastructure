"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessagesSquare, Rocket, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { useUiLang } from "../use-ui-lang";
import { globalCanvasStrings } from "../global-canvas-i18n";
import { fill } from "../quiz-i18n";

// THE LINK PANEL (step 225) — where a link between two automations is actually programmed. The canvas stays
// readable (a node = a project), while the precision lives here: you pick WHICH node of the source project
// feeds WHICH node of the target project. The endpoints may be ANY nodes — they do NOT have to be a parent
// and a child (unlike the tree inside one automation, 224). Then you write the brief and press "Start
// development": a development step file is materialized for the coding agent, exactly as for a node.
//
// step 236.3/236.4: full ten-language i18n (global-canvas-i18n.ts) + a mic on the brief textarea, the same
// VoiceInput primitive used everywhere else in this app — never a second recorder implementation.
type GEdge = {
  cuid: string; from_automation: string; to_automation: string; name: string; draft: number;
  active_version: number; from_node_cuid: string | null; to_node_cuid: string | null;
};
type IndexNode = { cuid: string; name: string; slug: string; draft: number };

export function GlobalEdgePanel({
  edge, onChanged, onDeleted, onQuiz, nodesLocked,
}: {
  edge: GEdge; onChanged: () => void; onDeleted: () => void; onQuiz?: () => void;
  /** step 237 — set by GroupDetailCanvas: the edge was born from an actual node-to-node drag on the
   *  expanded canvas, so the two endpoints are ALREADY the exact nodes the owner meant — asking again via
   *  an editable picker is exactly the redundant step the owner objected to. Renders the same two lines as
   *  plain, non-interactive text instead of `<select>`s. Top-level automation-to-automation edges (created
   *  without ever seeing individual nodes) keep the pickers — there the specific nodes genuinely are unknown. */
  nodesLocked?: boolean;
}) {
  const L = globalCanvasStrings(useUiLang());
  const [spec, setSpec] = useState("");
  const [fromNodes, setFromNodes] = useState<IndexNode[]>([]);
  const [toNodes, setToNodes] = useState<IndexNode[]>([]);
  const [fromNode, setFromNode] = useState(edge.from_node_cuid ?? "");
  const [toNode, setToNode] = useState(edge.to_node_cuid ?? "");
  const [busy, setBusy] = useState(false);
  const specRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void (async () => {
      const e = await fetch(`/api/projects/edges/${edge.cuid}`, { cache: "no-store" });
      if (e.ok) setSpec(((await e.json()) as { spec: string }).spec ?? "");
      for (const [automation, set] of [
        [edge.from_automation, setFromNodes],
        [edge.to_automation, setToNodes],
      ] as [string, (n: IndexNode[]) => void][]) {
        const r = await fetch(`/api/projects/nodes?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
        if (r.ok) set(((await r.json()) as { nodes: IndexNode[] }).nodes ?? []);
      }
    })();
    setFromNode(edge.from_node_cuid ?? "");
    setToNode(edge.to_node_cuid ?? "");
  }, [edge.cuid, edge.from_automation, edge.to_automation, edge.from_node_cuid, edge.to_node_cuid]);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(`/api/projects/edges/${edge.cuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, fromNodeCuid: fromNode || null, toNodeCuid: toNode || null }),
      });
      toast.success(L.linkSavedToast);
      onChanged();
    } finally { setBusy(false); }
  }, [edge.cuid, spec, fromNode, toNode, onChanged, L]);

  const startDevelopment = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(`/api/projects/edges/${edge.cuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, fromNodeCuid: fromNode || null, toNodeCuid: toNode || null }),
      });
      const r = await fetch(`/api/projects/edges/${edge.cuid}/start-development`, { method: "POST" });
      const d = (await r.json()) as { number?: number; message?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? L.edgeStepFailed); return; }
      toast.success(fill(L.stepCreatedToast, { step: d.number ?? "" }), {
        description: L.stepCopyDesc,
        duration: 30000,
        action: { label: L.copyBtn, onClick: () => void navigator.clipboard.writeText(d.message ?? "") },
      });
      onChanged();
    } finally { setBusy(false); }
  }, [edge.cuid, spec, fromNode, toNode, onChanged, L]);

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(`/api/projects/edges/${edge.cuid}`, { method: "DELETE" });
      onDeleted();
    } finally { setBusy(false); }
  }, [edge.cuid, onDeleted]);

  const picker = (
    label: string, automation: string, nodes: IndexNode[], value: string, set: (v: string) => void,
  ) => {
    // step 237 — locked: the connection was drawn node-to-node on GroupDetailCanvas, so the endpoint is
    // already exactly right; show it as plain text instead of asking the owner to pick it again.
    if (nodesLocked) {
      const found = nodes.find((n) => n.cuid === value);
      return (
        <p className="text-xs">
          <span className="font-medium text-muted-foreground">{label} — {automation}:</span>{" "}
          {found ? `${found.name}${found.draft ? L.nodeDraftSuffix : ""}` : L.nodePickerAny}
        </p>
      );
    }
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{label} — {automation}</label>
        <select
          value={value}
          onChange={(e) => set(e.target.value)}
          className="w-full rounded-md border bg-background p-2 text-sm"
        >
          <option value="">{L.nodePickerAny}</option>
          {nodes.map((n) => (
            <option key={n.cuid} value={n.cuid}>
              {n.name}{n.draft ? L.nodeDraftSuffix : ""}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{edge.name}</p>
        <p className="text-xs text-muted-foreground">
          {edge.draft ? (
            <span className="text-rose-600 dark:text-rose-400">{L.edgeDraftLabel}</span>
          ) : (
            fill(L.edgeBuiltLabel, { v: edge.active_version })
          )}
        </p>
      </div>

      {picker(L.fromNodeLabel, edge.from_automation, fromNodes, fromNode, setFromNode)}
      {picker(L.toNodeLabel, edge.to_automation, toNodes, toNode, setToNode)}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {L.specLabel}
        </label>
        <Textarea ref={specRef} value={spec} onChange={(e) => setSpec(e.target.value)} rows={6}
          placeholder={L.specPlaceholder} />
        <VoiceInput targetRef={specRef} value={spec} onChange={setSpec} className="mt-1" />
        {/* THE LINK QUIZ (step 225 G4) — the owner does not have to write this brief alone: the same
            activation Quiz that designs an automation's nodes also brainstorms a LINK (it sees both
            automations and all their nodes). It writes this very spec.md and queues one development step. */}
        {onQuiz && (
          <Button size="sm" variant="ghost" onClick={onQuiz} disabled={busy} className="w-full justify-start px-2">
            <MessagesSquare className="size-3.5" /> {L.quizBrainstormBtn}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} {L.btnSave}
        </Button>
        <Button size="sm" variant="outline" onClick={remove} disabled={busy} className="text-rose-600">
          <Trash2 className="size-3.5" /> {L.btnDelete}
        </Button>
      </div>

      <Button size="sm" variant="secondary" onClick={startDevelopment} disabled={busy} className="w-full">
        <Rocket className="size-3.5" /> {L.btnStartDevelopment}
      </Button>
    </div>
  );
}
