"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";

// DELETE AN AUTOMATION (step 241 E3.2, owner's request) — the Danger zone's modal.
//
// Deleting is IRREVERSIBLE and COMPLETE: the automation's folder (its nodes, their functions, every _data
// file) and every row that belonged to it are gone. So the confirmation is not a bare "are you sure?" — the
// owner must TYPE THE AUTOMATION'S NAME. A destructive action that a stray click can trigger is a bug waiting
// to happen, and this is the one action in the product with nothing to undo it.
export function DeleteAutomationModal({
  automation,
  open,
  onOpenChange,
}: {
  automation: string;         // "category/slug"
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const L = automationMenuStrings(useUiLang());
  const slug = automation.split("/")[1] ?? automation;
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const matches = typed.trim() === slug;

  async function remove() {
    if (!matches) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, confirm: slug }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? L.deleteFailed);
        return;
      }
      toast.success(L.deleted, { description: L.deletedDesc, duration: 15000 });
      // The automation's own page no longer exists — leave it for the category hub.
      window.location.href = `/projects/${automation.split("/")[0]}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { setTyped(""); onOpenChange(v); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="size-4" /> {L.deleteTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{L.deleteBody}</p>
          <p className="rounded-md border border-rose-500/40 bg-rose-500/5 p-2 text-rose-700 dark:text-rose-300">
            {L.deleteIrreversible}
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {L.deleteConfirmLabel.replace("{name}", slug)}
            </label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={slug}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {L.deleteCancel}
          </Button>
          <Button variant="destructive" onClick={remove} disabled={!matches || busy} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {busy ? L.deleting : L.deleteConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
