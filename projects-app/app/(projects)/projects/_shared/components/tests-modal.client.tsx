"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Probe, ProbeStage } from "../tests";

// FROZEN STANDARD (step 220) — the Tests modal, driven ENTIRELY by the project's PROBES declaration
// (_data/tests.ts). Each card runs its binding (a frozen shared route /api/projects/tests/<kind>, or a
// project route by the same { ok, detail } contract) and shows the probe's OWN prepared success/error
// text — no hardcoded probe list, no free-form "custom test". Grouped by flow stage.
type Status = "idle" | "running" | "ok" | "fail";

const STAGE_LABEL: Record<ProbeStage, string> = {
  input: "Inputs",
  intermediate: "Intermediate",
  output: "Outputs",
};
const STAGE_ORDER: ProbeStage[] = ["input", "intermediate", "output"];

async function runBinding(p: Probe): Promise<boolean> {
  try {
    if (p.binding.type === "shared") {
      const r = await fetch(`/api/projects/tests/${p.binding.kind}`, { method: "POST" });
      const d = (await r.json().catch(() => null)) as { ok?: boolean } | null;
      return r.ok && Boolean(d?.ok);
    }
    const method = p.binding.method ?? "GET";
    const r = await fetch(p.binding.route, {
      method,
      cache: "no-store",
      ...(p.binding.body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(p.binding.body) } : {}),
    });
    const d = (await r.json().catch(() => null)) as { ok?: boolean } | null;
    // A project route may answer { ok } explicitly; otherwise any 2xx counts as a pass.
    return r.ok && (d?.ok ?? true);
  } catch {
    return false;
  }
}

function StatusIcon({ s }: { s: Status }) {
  if (s === "running") return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (s === "ok") return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />;
  if (s === "fail") return <XCircle className="size-4 text-rose-600 dark:text-rose-400" />;
  return <CircleDashed className="size-4 text-muted-foreground" />;
}

export function TestsModal({
  probes,
  open,
  onOpenChange,
}: {
  probes: Probe[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [line, setLine] = useState<Record<string, string>>({});

  async function probe(p: Probe) {
    setStatus((s) => ({ ...s, [p.id]: "running" }));
    const ok = await runBinding(p);
    setStatus((s) => ({ ...s, [p.id]: ok ? "ok" : "fail" }));
    const text = ok ? p.successText : p.errorText;
    setLine((d) => ({ ...d, [p.id]: text }));
    if (ok) toast.success(`${p.label}: ${text}`);
    else toast.error(`${p.label}: ${text}`);
  }

  const stages = STAGE_ORDER.filter((st) => probes.some((p) => p.stage === st));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[600px] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Tests</DialogTitle>
          <DialogDescription>
            One probe per entity the automation depends on. Each verifies it actually works.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {stages.map((st) => (
            <div key={st} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{STAGE_LABEL[st]}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {probes.filter((p) => p.stage === st).map((p) => {
                  const s = status[p.id] ?? "idle";
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-md border p-2">
                      <StatusIcon s={s} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{p.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{line[p.id] ?? p.hint}</p>
                      </div>
                      <Button variant="outline" size="sm" disabled={s === "running"} onClick={() => probe(p)}>
                        Test
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
