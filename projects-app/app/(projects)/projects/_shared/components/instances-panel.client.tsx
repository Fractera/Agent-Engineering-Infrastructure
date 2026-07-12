"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NodeContract } from "../node-contract";

// FROZEN STANDARD (step 223.C.4) — Master → Instance fork. An Instance inherits ALL the Master's nodes
// (the Master lives in code); it adds a `specialization` (the run's overall condition, e.g. "about
// cats") and per-node OVERRIDES (disable a function, add a constraint like "no Siamese cats"). Editing
// one Instance never touches the Master or the siblings. Only for finite-process automations (the
// content scenario); a reactive automation has no Instances.
type Override = { disabledFunctions?: string[]; note?: string };
type Instance = {
  id: string;
  title: string;
  specialization: string;
  status: string;
  overrides: Record<string, Override>;
};

export function InstancesPanel({ nodes, automation }: { nodes: NodeContract[]; automation: string }) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [spec, setSpec] = useState("");
  const [draft, setDraft] = useState<Record<string, Override>>({});

  const refetch = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/instances/list?automation=${encodeURIComponent(automation)}`, {
        cache: "no-store",
      });
      if (r.ok) setInstances(((await r.json()) as { instances: Instance[] }).instances ?? []);
    } catch {
      /* leave as-is */
    }
  }, [automation]);
  useEffect(() => {
    void refetch();
  }, [refetch]);

  const selected = instances.find((i) => i.id === selectedId) ?? null;
  useEffect(() => {
    setDraft(selected?.overrides ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function create() {
    if (!title.trim()) return;
    const r = await fetch("/api/projects/instances/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automation, title, specialization: spec }),
    });
    if (r.ok) {
      setTitle("");
      setSpec("");
      toast.success("Instance created — forked from the Master");
      await refetch();
    } else toast.error("Could not create instance");
  }

  function toggleFn(nodeId: string, fnName: string) {
    setDraft((prev) => {
      const cur = prev[nodeId] ?? {};
      const set = new Set(cur.disabledFunctions ?? []);
      if (set.has(fnName)) set.delete(fnName);
      else set.add(fnName);
      return { ...prev, [nodeId]: { ...cur, disabledFunctions: [...set] } };
    });
  }
  function setNote(nodeId: string, note: string) {
    setDraft((prev) => ({ ...prev, [nodeId]: { ...(prev[nodeId] ?? {}), note } }));
  }
  async function saveNode(nodeId: string) {
    const o = draft[nodeId] ?? {};
    const r = await fetch("/api/projects/instances/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceId: selectedId, nodeId, disabledFunctions: o.disabledFunctions ?? [], note: o.note ?? "" }),
    });
    if (r.ok) {
      toast.success(`Saved override for "${nodeId}"`);
      await refetch();
    } else toast.error("Could not save override");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-medium">Instances</h2>
        <p className="text-sm text-muted-foreground">
          A run of this finite process, forked from the Master and edited per node.
        </p>
      </div>

      {/* Create a fork */}
      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cats post" />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium">Specialization (the run&apos;s overall condition)</label>
          <Input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="e.g. about cats" />
        </div>
        <Button onClick={create} disabled={!title.trim()}>Create instance</Button>
      </div>

      {/* Instances list */}
      {instances.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {instances.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setSelectedId(i.id === selectedId ? null : i.id)}
              className={`rounded-md border p-2 text-left ${i.id === selectedId ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <p className="text-sm font-medium">{i.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {i.specialization || "no specialization"} · {i.status}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Per-node override editor for the selected instance */}
      {selected && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm">
            Editing <span className="font-medium">{selected.title}</span> — disable functions or add a
            constraint per node. The Master and other instances are untouched.
          </p>
          {nodes.map((n) => {
            const d = draft[n.id] ?? {};
            const disabled = new Set(d.disabledFunctions ?? []);
            return (
              <div key={n.id} className="space-y-2 rounded-md border p-2">
                <p className="text-sm font-medium">{n.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {n.functions.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => toggleFn(n.id, f.name)}
                      className={`rounded border px-2 py-0.5 font-mono text-[11px] ${disabled.has(f.name) ? "text-muted-foreground line-through opacity-60" : ""}`}
                    >
                      {f.name}
                    </button>
                  ))}
                  {n.functions.length === 0 && <span className="text-xs text-muted-foreground">no functions</span>}
                </div>
                <Textarea
                  value={d.note ?? ""}
                  onChange={(e) => setNote(n.id, e.target.value)}
                  placeholder="Constraint for this run, e.g. do not use Siamese cats"
                  className="min-h-[40px] text-xs"
                />
                <Button variant="outline" size="sm" onClick={() => saveNode(n.id)}>Save {n.name}</Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
