"use client";

import { useState } from "react";
import { Loader2, Lock, RotateCcw, Rocket, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { waveStrings } from "../wave-i18n";
import { useWaveLock } from "./wave-lock.client";
import { StartDevelopment } from "./start-development.client";

// THE WAVE BANNER (step 240; three actions since 241 E3.3) — the FIRST element under the page header, and the
// automation page's ONLY launcher of development. Every per-entity "Start development" button is gone
// (owner's decision): the page has exactly one place where work is handed over, so a batch can never leave
// half-formed.
//
//   staging → "You have N changes staged." with THREE actions (owner's design):
//               • Launch development — hands the whole batch to a coding agent as ONE step,
//               • Dismiss           — just hides the banner; NOTHING is lost, the changes stay staged and the
//                                     banner returns on the next change or reload,
//               • Reset             — throws the staged requirements away (all entities at once), behind a
//                                     confirmation, because it cannot be undone.
//   locked  → "Development step #NN was handed over. This page is locked until it is finished."
//   idle    → nothing at all.
//
// The state comes from WaveLockProvider (one poll for the whole page), so the banner and every tool's lock can
// never disagree with each other.
export function DevelopmentWaveBanner({ automation }: { automation: string }) {
  const L = waveStrings(useUiLang());
  const { wave, refresh } = useWaveLock();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (wave.state === "idle") return null;

  if (wave.state === "locked") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{L.lockedTitle}</p>
          <p className="text-sm text-muted-foreground">
            {wave.step ? L.lockedBody.replace("{n}", String(wave.step)) : L.lockBodyNoStep}
          </p>
        </div>
      </div>
    );
  }

  // DISMISSED — the owner hid the banner. Nothing was lost: the changes are still staged, and the banner
  // comes back on the next change or reload. That is the difference from Reset, and the UI must not blur it.
  if (dismissed) return null;

  async function doReset() {
    setResetting(true);
    try {
      const r = await fetch(`/api/projects/development-wave/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      const d = (await r.json().catch(() => ({}))) as { cleared?: number; reason?: string };
      if (!r.ok) {
        toast.error(d.reason === "locked" ? L.resetLocked : L.resetFailed);
        return;
      }
      toast.success(L.resetDone.replace("{n}", String(d.cleared ?? 0)));
      setResetOpen(false);
      refresh();
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
        <div className="flex items-start gap-3">
          <Rocket className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{L.bannerTitle}</p>
            <p className="text-sm text-muted-foreground">
              {L.bannerBody.replace("{n}", String(wave.items.length))}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Rocket className="size-3.5" /> {L.bannerLaunch}
          </Button>
          {/* Hides the banner only — the staged changes are untouched. */}
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            <X className="size-3.5" /> {L.bannerDismiss}
          </Button>
          {/* Throws the staged requirements away — irreversible, so it asks first. */}
          <Button size="sm" variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={() => setResetOpen(true)}>
            <RotateCcw className="size-3.5" /> {L.bannerReset}
          </Button>
        </div>
      </div>

      {/* The launch dialog (step 233, now the wave's): the use-cases review gate, then the step number. */}
      <StartDevelopment automation={automation} open={open} onOpenChange={setOpen} onLaunched={refresh} />

      <Dialog open={resetOpen} onOpenChange={(v) => { if (!resetting) setResetOpen(v); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <RotateCcw className="size-4" /> {L.resetTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{L.resetBody.replace("{n}", String(wave.items.length))}</p>
            {/* Said plainly rather than implied: a reset clears the BRIEFS. Nodes you drafted and cases you
                wrote are not requirements and stay where they are. */}
            <p className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-amber-700 dark:text-amber-300">
              {L.resetKeeps}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setResetOpen(false)} disabled={resetting}>
              {L.resetCancel}
            </Button>
            <Button variant="destructive" onClick={doReset} disabled={resetting} className="gap-2">
              {resetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {resetting ? L.resetting : L.resetConfirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
