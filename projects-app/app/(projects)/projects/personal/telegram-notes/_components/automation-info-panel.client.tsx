"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAutomationStatus } from "../_lib/automation-status";
import { ActivateConfirmModal } from "./activate-confirm-modal.client";

// FROZEN STANDARD — the automation info panel (step 218), revealed by expanding the top
// status bar. Bot name · AI provider · AI model · separator · Activate/Deactivate. Every
// field degrades gracefully (missing route/key → an em-dash, never a crash) so this same
// component can later be dropped into a project whose plumbing (bot-link, model key) does
// not exist yet.
const NAME_LIMIT = 60;

// Hard-cap at 60 chars + an ellipsis, no wrap (owner spec) — CSS truncate alone is
// width-based, not character-count-based, so the string itself is sliced first.
function truncateName(name: string): string {
  return name.length > NAME_LIMIT ? `${name.slice(0, NAME_LIMIT)}…` : name;
}

export function AutomationInfoPanel({
  category,
  slug,
  modelEnvKey,
  defaultModel,
}: {
  category: string;
  slug: string;
  modelEnvKey: string;
  defaultModel: string;
}) {
  const status = useAutomationStatus();
  const [botName, setBotName] = useState<string | null | undefined>(undefined); // undefined = loading
  const [model, setModel] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${category}/${slug}/bot-link`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { name?: string | null } | null) => { if (!cancelled) setBotName(d?.name ?? null); })
      .catch(() => { if (!cancelled) setBotName(null); });
    fetch(`/api/project-config/env?keys=${modelEnvKey}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { values?: Record<string, string> } | null) => {
        const v = d?.values?.[modelEnvKey];
        if (!cancelled) setModel(typeof v === "string" && v ? v : null);
      })
      .catch(() => { if (!cancelled) setModel(null); });
    return () => { cancelled = true; };
  }, [category, slug, modelEnvKey]);

  const enabled = status.loaded ? status.enabled : null;

  return (
    <div className="space-y-2.5 rounded-md border bg-muted/20 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Telegram bot</span>
        <span
          className="max-w-[60ch] truncate whitespace-nowrap font-medium"
          title={botName ?? undefined}
        >
          {botName === undefined ? "…" : botName ? truncateName(botName) : "Not connected"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">AI provider</span>
        {/* Constant, not fabricated: one global OpenAI key powers every automation today
            (step 208 unification) — there is no per-automation provider switch to read. */}
        <span className="font-medium">OpenAI API</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">AI model</span>
        <span className="font-medium">{model ?? defaultModel}</span>
      </div>
      <Separator />
      <div className="flex justify-end">
        <Button
          variant={enabled ? "outline" : "default"}
          size="sm"
          disabled={enabled === null}
          onClick={() => setConfirmOpen(true)}
        >
          {enabled ? "Deactivate" : "Activate"}
        </Button>
      </div>
      <ActivateConfirmModal
        category={category}
        slug={slug}
        enabled={Boolean(enabled)}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </div>
  );
}
