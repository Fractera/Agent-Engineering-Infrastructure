"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Lock, RotateCcw, Rocket, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { waveStrings } from "../wave-i18n";
import { useWaveLock } from "./wave-lock.client";
import { StartDevelopment } from "./start-development.client";
import { ProblemsCenter } from "./warning-panel.client";

// THE WAVE BANNER (step 240; three actions since 241 E3.3) — the FIRST element under the page header, and the
// automation page's ONLY launcher of development. Every per-entity "Start development" button is gone
// (owner's decision): the page has exactly one place where work is handed over, so a batch can never leave
// half-formed.
//
//   staging → "You have N changes staged." with the owner's THREE actions:
//               • Launch development — hands the whole batch to a coding agent as ONE step,
//               • Postpone launch    — hides the banner AND freezes the current staged state as "not worth a
//                                     notification"; it returns only when a requirement actually changes.
//                                     Nothing is lost — the state is persisted server-side (a signature), so a
//                                     reload does NOT bring it back the way a plain hide would,
//               • Cancel launch      — throws the staged requirements away (all entities at once), behind a
//                                     confirmation, because it cannot be undone.
//   locked  → "Development step #NN was handed over. This page is locked until it is finished."
//   idle / snoozed → nothing at all.
//
// The state comes from WaveLockProvider (one poll for the whole page), so the banner and every tool's lock can
// never disagree with each other.
// STEP 246 — the banner also hosts the PROBLEMS CENTER (the ⚠ N badge + the Quiz-like problems modal):
// warnings a coding agent left (the escalation channel) surface right where development is launched, on
// every automation page, regardless of the wave's own state. Split into an inner component because the
// banner's own render has early returns (idle/locked/snoozed) that must not unmount the problems UI.
export function DevelopmentWaveBanner({ automation }: { automation: string }) {
  return (
    <>
      <ProblemsCenter automation={automation} />
      <WaveBannerInner automation={automation} />
    </>
  );
}

function WaveBannerInner({ automation }: { automation: string }) {
  const L = waveStrings(useUiLang());
  const { wave, refresh } = useWaveLock();
  const [open, setOpen] = useState(false);
  // Optimistic hide the instant Postpone is clicked, so the banner does not linger during the round-trip; the
  // next poll then reports snoozed:true and it stays hidden for real.
  const [hidden, setHidden] = useState(false);
  const [postponing, setPostponing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // The optimistic hide only stands until the server agrees the wave is postponed. The moment a poll reports
  // it is NO LONGER snoozed (the owner changed a requirement, so the signature stopped matching), clear the
  // local hide so the banner returns — otherwise it would stay hidden until a page reload.
  useEffect(() => {
    if (!wave.snoozed) setHidden(false);
  }, [wave.snoozed]);

  if (wave.state === "idle") return null;

  if (wave.state === "locked") {
    // The locked banner GUIDES, not just informs (owner 2026-07-16): it says whom to hand the brief to and
    // carries the SAME copyable hand-off instruction as the launch dialog — so a reload never strands the
    // owner without the text his coding agent needs.
    const handoff = wave.step ? L.handoffLine.replace("{n}", String(wave.step)) : "";
    return (
      <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{L.lockedTitle}</p>
            <p className="text-sm text-muted-foreground">
              {wave.step ? L.lockedBody.replace("{n}", String(wave.step)) : L.lockBodyNoStep}
            </p>
          </div>
        </div>
        {wave.step ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/60 p-2">
            <code className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] text-sm">{handoff}</code>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => { void navigator.clipboard.writeText(handoff); toast.success(L.lockedCopied); }}
            >
              <Copy className="size-3.5" /> {L.lockedCopy}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  // POSTPONED — the owner froze the current staged state (server-side signature). Nothing was lost: the
  // changes are still staged, and the banner returns the moment any requirement changes (the signature stops
  // matching). `hidden` is the optimistic local twin for the click-to-poll gap. This is the difference from
  // Cancel, and the UI must not blur it.
  if (hidden || wave.snoozed) return null;

  async function doPostpone() {
    setPostponing(true);
    try {
      const r = await fetch(`/api/projects/development-wave/postpone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      if (!r.ok) {
        toast.error(L.postponeFailed);
        return;
      }
      setHidden(true);
      toast.success(L.postponeDone);
      refresh();
    } catch {
      toast.error(L.postponeFailed);
    } finally {
      setPostponing(false);
    }
  }

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
          {/* Postpone: hides the banner AND freezes the current staged state; it returns only on the next
              change. Nothing is lost — persisted server-side, so a reload does not undo it. */}
          <Button size="sm" variant="ghost" onClick={doPostpone} disabled={postponing}>
            {postponing ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
            {L.bannerPostpone}
          </Button>
          {/* Cancel: throws the staged requirements away — irreversible, so it asks first. */}
          <Button size="sm" variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={() => setResetOpen(true)}>
            <RotateCcw className="size-3.5" /> {L.bannerCancel}
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
