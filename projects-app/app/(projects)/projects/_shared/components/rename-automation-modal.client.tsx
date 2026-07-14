"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";

// RENAME AN AUTOMATION (step 241 E3.2, owner's request) — the Danger zone's second modal, beside Delete.
//
// Renaming is NOT destructive (only the display name moves; the slug, URL and data stay), so the confirmation
// is not "type the name" — it is simply an explicit modal: the owner types the NEW name and presses Rename.
// The action never fires from the menu click itself, which is the "explicit confirmation" the owner asked for.
export function RenameAutomationModal({
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

  // Seed the field with a readable version of the current slug each time the modal opens.
  useEffect(() => {
    if (open) setName(slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  }, [open, slug]);

  const valid = name.trim().length > 0;

  async function rename() {
    if (!valid) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, title: name.trim() }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? L.renameFailed);
        return;
      }
      toast.success(L.renamed);
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
            <Pencil className="size-4" /> {L.renameTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{L.renameBody}</p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{L.renameLabel}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={L.renamePlaceholder}
              autoComplete="off"
              onKeyDown={(e) => { if (e.key === "Enter" && valid && !busy) rename(); }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {L.renameCancel}
          </Button>
          <Button onClick={rename} disabled={!valid || busy} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
            {busy ? L.renaming : L.renameConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
