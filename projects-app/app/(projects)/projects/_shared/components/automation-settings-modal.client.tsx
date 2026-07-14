"use client";

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
  open,
  onOpenChange,
}: {
  modelEnvKey: string;
  defaultModel: string;
  channels: InputChannel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const L = automationMenuStrings(useUiLang());
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
          <Section title={L.inputChannelsSection}>
            <InputChannelsPanel channels={channels} />
          </Section>
          <Section title={L.runIntervalSection}>
            <p className="text-sm text-muted-foreground">{L.runIntervalBody}</p>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
