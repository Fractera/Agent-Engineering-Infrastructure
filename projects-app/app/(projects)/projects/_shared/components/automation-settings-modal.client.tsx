"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InputChannel } from "../channels";
import { ModelKeySettings } from "./model-key-settings.client";
import { InputChannelsPanel } from "./input-channels-panel.client";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";

// FROZEN STANDARD (step 220) — the generic automation Settings, opened from the menu as a 600×600 modal
// of FLAT sections (no accordion, owner rule). Driven entirely by the project's declarations: the AI
// model section is global-key + per-automation model; Input channels come from _data/channels.ts (empty
// on a fresh skeleton → an instructive stub). This is the version a project is BORN with; a mature
// automation (see telegram-notes) may carry a richer settings surface once it has the backend for it.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function AutomationSettingsModal({
  modelEnvKey,
  defaultModel,
  channels,
  automation,
  open,
  onOpenChange,
}: {
  modelEnvKey: string;
  defaultModel: string;
  channels: InputChannel[];
  /** "category/slug" — enables the live channel refresh below. */
  automation?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const L = automationMenuStrings(useUiLang());
  // LIVE CHANNELS (263.1 round 7, the owner's blocked flow): the `channels` prop is BAKED at build
  // time, but the coding agent declares channels mid-development (gated apply writes _data/channels.ts
  // on disk). Refresh from disk on every open so a freshly declared bot-token field appears without a
  // rebuild; the prop stays as the instant seed, and a failed fetch keeps it.
  const [liveChannels, setLiveChannels] = useState<InputChannel[] | null>(null);
  useEffect(() => {
    if (!open || !automation) return;
    fetch(`/api/projects/channels?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { channels?: InputChannel[] | null } | null) => {
        if (Array.isArray(d?.channels)) setLiveChannels(d.channels);
      })
      .catch(() => { /* keep the build-time seed */ });
  }, [open, automation]);
  const shownChannels = liveChannels ?? channels;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[600px] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{L.settingsTitle}</DialogTitle>
          <DialogDescription>{L.settingsDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Section title={L.aiModelSection}>
            <ModelKeySettings modelEnvKey={modelEnvKey} defaultModel={defaultModel} />
          </Section>
          {/* Step 248 cleanup (owner): no empty containers. The Run interval stub is GONE (scheduling lives
              in the Cron entity now); the channels/keys section renders ONLY when the automation actually
              declares keys — it is the door the missing-credentials warning and the funnel open, so it
              cannot be removed outright, but a fresh skeleton shows just the AI model. */}
          {shownChannels.length > 0 && (
            <Section title={L.inputChannelsSection}>
              <InputChannelsPanel channels={shownChannels} />
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
