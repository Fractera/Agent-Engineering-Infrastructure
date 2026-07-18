"use client";

import { useCallback } from "react";
import { Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// ADMIN file — may import view/, must NEVER be imported by view/ and never reach into another entity.
// Enforced by `npm run check:entity-imports`.
//
// THE PROCESSES — ADMIN CHROME (step 254.6): the Run/Reset controls (step 230 — the owner decides WHEN
// the timeline starts; the runner never cold-starts on its own). Pure management: a visitor watches the
// timeline, never launches it.
export function RunResetControls({ automation, onChanged }: { automation: string; onChanged: () => void }) {
  const control = useCallback(async (action: "run" | "reset") => {
    const r = await fetch(`/api/projects/schedule/control`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automation, action }),
    });
    if (!r.ok) { toast.error("Could not " + action + " the timeline."); return; }
    toast.success(action === "run" ? "Timeline started — forks run one by one." : "Timeline reset to the plan.");
    onChanged();
  }, [automation, onChanged]);

  return (
    <div className="flex items-center gap-2" data-processes-admin="controls">
      <Button size="sm" onClick={() => void control("run")}>
        <Play className="size-3.5" /> Run
      </Button>
      <Button size="sm" variant="outline" onClick={() => void control("reset")}>
        <RotateCcw className="size-3.5" /> Reset
      </Button>
    </div>
  );
}
