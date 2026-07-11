"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InputChannelsPanel } from "../../../_shared/components/input-channels-panel.client";
import { INPUT_CHANNELS } from "../_data/channels";
import { ModelSettings } from "./model-settings.client";
import { IntervalSettings } from "./interval-settings.client";

// FROZEN STANDARD (step 220) — the automation's Settings, opened from the menu as a 600×600 modal of
// accordions: AI model, Run interval, and the declaration-driven Input channels. The old fixed
// settings-accordion (bot chat / connectors hardcoded) is replaced: channels now come from
// INPUT_CHANNELS (_data/channels.ts). Telegram-specific reception setup (register the bot with the
// listener + set its command menu) is preserved via onKeySaved when the bot token is saved — the one
// project-specific hook, kept out of the generic channels panel.
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
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="model">
            <AccordionTrigger>AI model</AccordionTrigger>
            <AccordionContent>
              <ModelSettings />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="interval">
            <AccordionTrigger>Run interval</AccordionTrigger>
            <AccordionContent>
              <IntervalSettings />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="channels">
            <AccordionTrigger>Input channels</AccordionTrigger>
            <AccordionContent>
              <InputChannelsPanel
                channels={INPUT_CHANNELS}
                onKeySaved={(env, value) => {
                  if (env === "TELEGRAM_BOT_TOKEN") void registerTelegramBot(value);
                }}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
