"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Shared delete button for the Finances / Images / GEO tables (step 207.20c — every one of the
// four integrated tables carries delete, mirroring the Records table). Confirm dialog + toast;
// calls DELETE /storage/<kind>/<id> and reports back so the table can drop the row locally.
const API = "/api/projects/personal/telegram-notes/storage";

export function DeleteRecordButton({
  kind,
  id,
  label,
  onDeleted,
}: {
  kind: "finance" | "image" | "geo";
  id: string;
  label: string;
  onDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/${kind}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(`Could not delete (HTTP ${res.status})`);
        return;
      }
      const d = (await res.json().catch(() => null)) as { memoryDeleted?: boolean } | null;
      setOpen(false);
      onDeleted(id);
      toast.success(d?.memoryDeleted ? "Deleted (database + memory)" : "Deleted");
    } catch {
      toast.error("Could not delete (network error)");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Delete"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this {kind === "geo" ? "place" : kind === "image" ? "image" : "record"}?</DialogTitle>
            <DialogDescription>
              {label ? `“${label.slice(0, 120)}” — ` : ""}
              this permanently removes it{kind === "finance" ? " from the database and from vector memory" : " and its links to records"}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={deleting} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={doDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
