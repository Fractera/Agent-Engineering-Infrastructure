"use client";

import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminBase } from "@/lib/runtime-urls";

// FROZEN STANDARD (step 220) — the "add / modify automation" button under a project's description.
// Clicking it does NOT redirect straight away: it opens a confirmation that explains HOW to request a
// change (write the requirements step by step in the to-do list on the RIGHT column of the Architecture
// page, then press the rocket icon next to the automation on the LEFT column to launch them into
// development). "Continue" then redirects to that project's section of the Architecture page
// (admin :3002 /service/architecture?project=<category>/<slug> — the same deep-link the zone footer's
// "Continue development" uses); "Cancel" closes it.
export function AddModifyAutomationButton({
  category,
  slug,
}: {
  category: string;
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [admin, setAdmin] = useState("");
  // Admin base derived from window.location after mount (IP vs domain) — the link stays inert until then.
  useEffect(() => {
    setAdmin(adminBase());
  }, []);

  const href = admin ? `${admin}/service/architecture?project=${category}/${slug}` : undefined;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Rocket className="size-4" />
        Add or modify automation
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add or modify this automation</DialogTitle>
            <DialogDescription>
              To change how this automation works, lay out your requirements one by one in the to-do
              list in the RIGHT column of the Architecture page. Then, in the LEFT column, press the
              rocket icon next to the automation to launch your wishes into development.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => href && (window.location.href = href)} disabled={!href}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
