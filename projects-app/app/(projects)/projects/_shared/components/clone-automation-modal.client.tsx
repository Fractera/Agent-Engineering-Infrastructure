"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";

// CLONE AN AUTOMATION (owner 2026-07-18) — the Danger zone's third action, between Rename and Delete. Cloning
// is not destructive (the source is untouched), so the confirmation is simply an explicit modal: the owner
// types the NEW name and presses Clone. The clone is CLEAN — same nodes/diagram/scenarios, zero runtime data,
// no secrets — and lands in the same category on the global canvas. Its page appears after the rebuild.
export function CloneAutomationModal({
  automation,
  open,
  onOpenChange,
}: {
  automation: string;        // "category/slug"
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const L = automationMenuStrings(useUiLang());
  const slug = automation.split("/")[1] ?? automation;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // Seed the field with a readable version of the current slug + the "clone" word each time it opens.
  useEffect(() => {
    if (open) {
      const readable = slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      setName(`${readable} ${L.cloneSuffix}`);
    }
  }, [open, slug, L.cloneSuffix]);

  const valid = name.trim().length > 0;

  async function clone() {
    if (!valid) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, title: name.trim() }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? L.cloneFailed);
        return;
      }
      toast.success(L.cloned);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-4" /> {L.cloneTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{L.cloneBody}</p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{L.renameLabel}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={L.renamePlaceholder}
              autoComplete="off"
              onKeyDown={(e) => { if (e.key === "Enter" && valid && !busy) clone(); }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {L.renameCancel}
          </Button>
          <Button onClick={clone} disabled={!valid || busy} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
            {busy ? L.cloning : L.cloneConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
