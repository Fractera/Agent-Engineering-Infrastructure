"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setAutomationEnabled } from "../_lib/automation-status";

// Shared activate/deactivate confirmation (step 218) — the ONE place that flips an automation's
// enabled flag. Used by both the top status-bar's Activate/Deactivate button AND the Settings
// tab's bot-key toggle, which used to flip instantly with zero confirmation — standardized so
// stopping an automation (no more scheduled runs, no more replies) always requires a deliberate
// confirm, everywhere, not just in the newer surface.
export function ActivateConfirmModal({
  category,
  slug,
  enabled,
  open,
  onOpenChange,
}: {
  category: string;
  slug: string;
  enabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const next = !enabled;

  async function confirm() {
    setBusy(true);
    setAutomationEnabled(next); // optimistic — the pill/dots react instantly
    try {
      const r = await fetch(`/api/projects/${category}/${slug}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!r.ok) {
        setAutomationEnabled(!next); // revert on failure
        toast.error(`Could not update (HTTP ${r.status})`);
        return;
      }
      toast.success(next ? "Automation activated" : "Automation deactivated");
      onOpenChange(false);
    } catch {
      setAutomationEnabled(!next);
      toast.error("Could not update (network error)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{next ? "Activate this automation?" : "Deactivate this automation?"}</DialogTitle>
          <DialogDescription>
            {next
              ? "Scheduled runs and replies resume."
              : "This stops all scheduled runs and replies until you activate it again."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={next ? "default" : "destructive"} disabled={busy} onClick={confirm}>
            {busy ? "Applying…" : next ? "Activate" : "Deactivate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
