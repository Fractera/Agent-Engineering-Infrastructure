"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessagesSquare, Rocket, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// THE LINK PANEL (step 225) — where a link between two automations is actually programmed. The canvas stays
// readable (a node = a project), while the precision lives here: you pick WHICH node of the source project
// feeds WHICH node of the target project. The endpoints may be ANY nodes — they do NOT have to be a parent
// and a child (unlike the tree inside one automation, 224). Then you write the brief and press "Start
// development": a development step file is materialized for the coding agent, exactly as for a node.
type GEdge = {
  cuid: string; from_automation: string; to_automation: string; name: string; draft: number;
  active_version: number; from_node_cuid: string | null; to_node_cuid: string | null;
};
type IndexNode = { cuid: string; name: string; slug: string; draft: number };

export function GlobalEdgePanel({
  edge, onChanged, onDeleted, onQuiz,
}: { edge: GEdge; onChanged: () => void; onDeleted: () => void; onQuiz?: () => void }) {
  const [spec, setSpec] = useState("");
  const [fromNodes, setFromNodes] = useState<IndexNode[]>([]);
  const [toNodes, setToNodes] = useState<IndexNode[]>([]);
  const [fromNode, setFromNode] = useState(edge.from_node_cuid ?? "");
  const [toNode, setToNode] = useState(edge.to_node_cuid ?? "");
  const [busy, setBusy] = useState(false);

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
      toast.success("Link saved.");
      onChanged();
    } finally { setBusy(false); }
  }, [edge.cuid, spec, fromNode, toNode, onChanged]);

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
      if (!r.ok) { toast.error(d.error ?? "Could not create the development step."); return; }
      toast.success(`You created a technical brief for the coding agent (step #${d.number})`, {
        description: "Copy this message and paste it into the coding agent's chat.",
        duration: 30000,
        action: { label: "Copy", onClick: () => void navigator.clipboard.writeText(d.message ?? "") },
      });
      onChanged();
    } finally { setBusy(false); }
  }, [edge.cuid, spec, fromNode, toNode, onChanged]);

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(`/api/projects/edges/${edge.cuid}`, { method: "DELETE" });
      onDeleted();
    } finally { setBusy(false); }
  }, [edge.cuid, onDeleted]);

  const picker = (
    label: string, automation: string, nodes: IndexNode[], value: string, set: (v: string) => void,
  ) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label} — {automation}</label>
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className="w-full rounded-md border bg-background p-2 text-sm"
      >
        <option value="">(any / not chosen)</option>
        {nodes.map((n) => (
          <option key={n.cuid} value={n.cuid}>
            {n.name}{n.draft ? " (draft)" : ""}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{edge.name}</p>
        <p className="text-xs text-muted-foreground">
          {edge.draft ? (
            <span className="text-rose-600 dark:text-rose-400">Draft — the integration is not built yet</span>
          ) : (
            `Built · version ${edge.active_version}`
          )}
        </p>
      </div>

      {picker("Source node (its output feeds the link)", edge.from_automation, fromNodes, fromNode, setFromNode)}
      {picker("Target node (the link feeds its input)", edge.to_automation, toNodes, toNode, setToNode)}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          How exactly are these automations connected?
        </label>
        <Textarea value={spec} onChange={(e) => setSpec(e.target.value)} rows={6}
          placeholder="Which output feeds which input, under what conditions, how they stay in sync…" />
        {/* THE LINK QUIZ (step 225 G4) — the owner does not have to write this brief alone: the same
            activation Quiz that designs an automation's nodes also brainstorms a LINK (it sees both
            automations and all their nodes). It writes this very spec.md and queues one development step. */}
        {onQuiz && (
          <Button size="sm" variant="ghost" onClick={onQuiz} disabled={busy} className="w-full justify-start px-2">
            <MessagesSquare className="size-3.5" /> Quiz — brainstorm this link instead of writing it
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
        </Button>
        <Button size="sm" variant="outline" onClick={remove} disabled={busy} className="text-rose-600">
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>

      <Button size="sm" variant="secondary" onClick={startDevelopment} disabled={busy} className="w-full">
        <Rocket className="size-3.5" /> Start development
      </Button>
    </div>
  );
}
