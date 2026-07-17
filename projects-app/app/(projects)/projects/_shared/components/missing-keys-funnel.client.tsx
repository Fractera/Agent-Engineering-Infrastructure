"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requiredEnvKeys, type InputChannel } from "../channels";
import { useUiLang } from "../use-ui-lang";
import { warningStrings } from "../warning-i18n";

// THE MISSING-KEYS FUNNEL (step 248, owner's design) — the GENERIC descendant of the telegram-notes-only
// modal of step 186.3, built on the channels standard instead of a parallel declaration: an automation
// whose _data/channels.ts declares REQUIRED keys that have no value yet gets (a) a compact amber badge in
// the status bar and (b) a funnel dialog that auto-opens ONCE per page load, pointing the owner at the
// Settings modal (the "automation:open-settings" event — the same door the credentials warning uses).
//
// HIERARCHY (the modal pecking order of 247.13, extended): open PROBLEMS outrank everything — while any
// warning is unanswered this funnel never auto-opens (the badge still shows); the Quiz already yields to
// problems and, being the use-case gate, outranks the funnel on a fresh automation (no cases yet = the
// Quiz is the first duty; the funnel auto-opens only when it is the only thing left to say).
export function MissingKeysFunnel({ automation, channels }: { automation: string; channels: InputChannel[] }) {
  const W = warningStrings(useUiLang());
  const [missing, setMissing] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const autoOpened = useRef(false);

  useEffect(() => {
    const keys = requiredEnvKeys(channels);
    if (!keys.length) return;
    let alive = true;

    const check = async (allowAutoOpen: boolean) => {
      try {
        const r = await fetch(`/api/project-config/env?keys=${keys.join(",")}`, { cache: "no-store" });
        if (!r.ok || !alive) return;
        const d = (await r.json()) as { present?: Record<string, boolean> };
        const gaps = keys.filter((k) => !d.present?.[k]);
        if (!alive) return;
        setMissing(gaps);           // [] hides the badge — a re-check after a save clears it
        if (!gaps.length || !allowAutoOpen) return;
        // Auto-open once per load — but NEVER over the problems modal (warnings outrank the funnel).
        if (autoOpened.current) return;
        autoOpened.current = true;
        const w = await fetch(`/api/projects/entity-warning?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
        if (w.ok) {
          const wd = (await w.json()) as { warnings?: unknown[] };
          if (wd.warnings?.length) return;
        }
        if (alive) setOpen(true);
      } catch { /* a failed check never blocks the page */ }
    };

    void check(true);
    // A key was just saved in Settings (owner's find: the badge used to hang forever after the keys were
    // in): re-check presence and hide the badge. The save triggers a ~5s pm2 restart, so re-check after a
    // delay AND once more later — whichever request survives the bounce updates the state.
    const onSaved = () => { setTimeout(() => void check(false), 1500); setTimeout(() => void check(false), 8000); };
    window.addEventListener("automation:keys-saved", onSaved);
    return () => { alive = false; window.removeEventListener("automation:keys-saved", onSaved); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation]);

  if (!missing.length) return null;

  const openSettings = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("automation:open-settings", { detail: { automation } }));
  };

  return (
    <>
      <Button
        size="sm" variant="outline" onClick={() => setOpen(true)}
        className="h-6 gap-1 border-amber-500/60 bg-amber-500/10 px-2 text-xs text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
      >
        <KeyRound className="size-3" /> {W.funnelBadge.replace("{n}", String(missing.length))}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-amber-600 dark:text-amber-400" /> {W.funnelTitle}
            </DialogTitle>
            <DialogDescription>{W.funnelBody.replace("{keys}", missing.join(", "))}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={openSettings} className="gap-2">
              <Settings className="size-4" /> {W.openSettings}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
