"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { waveStrings } from "../wave-i18n";
import { adminBase } from "@/lib/runtime-urls";

// THE DEVELOPMENT LOCK (step 240) — the second half of the wave.
//
// Once a wave is handed to a coding agent, the automation page becomes READ-ONLY. The reason is the owner's:
// the brief the coder is working from must not silently change under him, and the owner must not think an
// edit he makes now is part of a batch that has already left. So while a wave step is open, every tool on the
// page (Add with AI, Save, the Builder's "+", a use-case pencil, …) refuses to act and shows ONE modal
// explaining what is happening and where to go instead.
//
// THE ESCAPE HATCH is not a new UI: amending an ALREADY-SENT brief happens on the Architecture service page,
// through its per-project todo list (steps 186.5 + 210) — the modal links straight to this project there.
//
// The lock is DERIVED, never stored: state comes from /api/projects/development-wave/state, which reads the
// step queue. When the coder closes the wave step, the page unlocks on the next poll — nothing to reset.

type WaveItem = { entityType: string; ref: string; label: string };
type WaveState = "idle" | "staging" | "locked";
// `snoozed` (step 241 E3.3): the owner postponed the banner and nothing has changed since — the state is
// still "staging" (the items are all here), the banner just hides itself while this is true.
type Wave = { state: WaveState; items: WaveItem[]; step?: number; snoozed?: boolean };

type Ctx = {
  wave: Wave;
  locked: boolean;
  refresh: () => void;
  /** Every mutating tool calls this FIRST: locked → shows the modal and returns false (do nothing). */
  guard: () => boolean;
};

const WaveCtx = createContext<Ctx | null>(null);

export function WaveLockProvider({ automation, children }: { automation: string; children: React.ReactNode }) {
  const L = waveStrings(useUiLang());
  const [wave, setWave] = useState<Wave>({ state: "idle", items: [] });
  const [showLock, setShowLock] = useState(false);

  const refresh = useCallback(() => {
    if (!automation) return;
    fetch(`/api/projects/development-wave/state?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Wave | null) => { if (d?.state) setWave(d); })
      .catch(() => { /* a failed poll must never break the page — the tools simply stay unlocked */ });
  }, [automation]);

  // Poll: a coder finishing the wave elsewhere must unlock this page without a manual reload.
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const locked = wave.state === "locked";
  const guard = useCallback(() => {
    if (!locked) return true;
    setShowLock(true);
    return false;
  }, [locked]);

  return (
    <WaveCtx.Provider value={{ wave, locked, refresh, guard }}>
      {children}

      <Dialog open={showLock} onOpenChange={setShowLock}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              {L.lockTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{wave.step ? L.lockBody.replace("{n}", String(wave.step)) : L.lockBodyNoStep}</p>
            <p>{L.lockAmend}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  `${adminBase()}/service/architecture?project=${encodeURIComponent(automation)}`,
                  "_blank",
                  "noopener",
                )
              }
            >
              <ExternalLink className="size-4" /> {L.lockOpenArchitecture}
            </Button>
            <Button onClick={() => setShowLock(false)}>{L.lockOk}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </WaveCtx.Provider>
  );
}

/** The hook every tool on the page uses. Outside a provider it degrades to "never locked", so a component
 *  rendered on a page without the wave (an older generated project) keeps working exactly as before. */
export function useWaveLock(): Ctx {
  return (
    useContext(WaveCtx) ?? {
      wave: { state: "idle", items: [] },
      locked: false,
      refresh: () => {},
      guard: () => true,
    }
  );
}
