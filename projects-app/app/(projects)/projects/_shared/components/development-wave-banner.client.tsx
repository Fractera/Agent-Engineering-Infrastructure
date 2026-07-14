"use client";

import { useState } from "react";
import { Lock, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiLang } from "../use-ui-lang";
import { waveStrings } from "../wave-i18n";
import { useWaveLock } from "./wave-lock.client";
import { StartDevelopment } from "./start-development.client";

// THE WAVE BANNER (step 240) — the FIRST element under the page header, and the automation page's ONLY
// launcher of development. Every per-entity "Start development" button is gone (owner's decision): the page
// now has exactly one place where work is handed over, so a batch can never leave half-formed.
//
//   staging → "You have N changes staged. Finish everything in this round, then launch once." + the button.
//   locked  → "Development step #NN was handed over. This page is locked until it is finished."
//   idle    → nothing at all (the page looks exactly as it did before the wave existed).
//
// The state comes from WaveLockProvider (one poll for the whole page), so the banner and every tool's lock can
// never disagree with each other.
export function DevelopmentWaveBanner({ automation }: { automation: string }) {
  const L = waveStrings(useUiLang());
  const { wave, refresh } = useWaveLock();
  const [open, setOpen] = useState(false);

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
        <Button size="sm" onClick={() => setOpen(true)}>
          <Rocket className="size-3.5" /> {L.bannerLaunch}
        </Button>
      </div>

      {/* The launch dialog (step 233, now the wave's): the use-cases review gate, then the step number. */}
      <StartDevelopment
        automation={automation}
        open={open}
        onOpenChange={setOpen}
        onLaunched={refresh}
      />
    </>
  );
}
