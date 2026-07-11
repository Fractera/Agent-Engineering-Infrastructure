"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputChannelsPanel } from "../../../_shared/components/input-channels-panel.client";
import { INPUT_CHANNELS } from "../_data/channels";
import { ModelSettings } from "./model-settings.client";
import { IntervalSettings } from "./interval-settings.client";

// FROZEN STANDARD (step 220) — the automation's Settings, opened from the menu as a 600×600 modal.
// FLAT sections, NOT accordions (owner, step 220: the accordion is dropped — settings live plainly on
// the Settings surface). The AI model section carries BOTH the ONE global OpenAI key (owner: duplicate
// it here — it is set with the global propagating setter, step 208) AND the per-automation model
// dropdown. Input channels come from the INPUT_CHANNELS declaration. Telegram reception setup (register
// the bot + set its command menu) is preserved via onKeySaved when the bot token is saved.
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

function OpenAiKeyField() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/project-config/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: value.trim() }),
      });
      if (!r.ok) {
        const info = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(info?.error ?? `Save failed (HTTP ${r.status})`);
        return;
      }
      setValue("");
      toast.success("OpenAI key saved — applying to every automation (a brief restart).");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">OpenAI API key</label>
      <p className="text-xs text-muted-foreground">
        One global key powers every automation. platform.openai.com → API keys → Create new secret key.
      </p>
      <div className="flex gap-2">
        <Input type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="sk-…" />
        <Button onClick={save} disabled={busy || !value.trim()}>Save</Button>
      </div>
    </div>
  );
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
            <OpenAiKeyField />
            <ModelSettings />
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
