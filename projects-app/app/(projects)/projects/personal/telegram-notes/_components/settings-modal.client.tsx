"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModelKeySettings } from "../../../_shared/components/model-key-settings.client";
import { InputChannelsPanel } from "../../../_shared/components/input-channels-panel.client";
import { INPUT_CHANNELS } from "../_data/channels";
import { IntervalSettings } from "./interval-settings.client";

// telegram-notes Settings (step 220) — a 600×600 modal of FLAT sections (no accordion, owner rule).
// The AI model section (global key + per-automation model) is the SHARED ModelKeySettings, the same one
// the frozen skeleton uses. This automation additionally has a real Run interval (it owns a cron.json +
// settings endpoint) and Telegram reception setup (register the bot + set its command menu on token
// save, via onKeySaved) — the two things a mature automation carries beyond the birth skeleton.
async function registerTelegramBot(token: string) {
  try {
    await fetch("/api/project-config/register-bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "personal", project: "telegram-notes", token }),
    });
  } catch { /* best-effort — the listener reconciles on its tick */ }
  try {
    await fetch("/api/projects/personal/telegram-notes/set-menu", { method: "POST" });
  } catch { /* best-effort */ }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[600px] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure this automation&apos;s model, schedule and input channels.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Section title="AI model">
            <ModelKeySettings modelEnvKey="TELEGRAM_NOTES_MODEL" defaultModel="gpt-4o-mini" />
          </Section>
          <Section title="Run interval">
            <IntervalSettings />
          </Section>
          <Section title="Input channels">
            <InputChannelsPanel
              channels={INPUT_CHANNELS}
              onKeySaved={(env, value) => {
                if (env === "TELEGRAM_BOT_TOKEN") void registerTelegramBot(value);
              }}
            />
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
