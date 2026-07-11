"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAutomationStatus } from "../_lib/automation-status";
import { ActivateConfirmModal } from "./activate-confirm-modal.client";

// FROZEN STANDARD — the automation info menu (step 218). A hamburger button on the status bar
// opens a shadcn DropdownMenu: bot name · AI provider · AI model · separator · Activate/Deactivate.
// Every field degrades gracefully (missing route/key → "Not connected" / the default), so this
// same component can later be dropped into a project whose plumbing does not exist yet.
const NAME_LIMIT = 60;

// Hard-cap at 60 chars + an ellipsis, never wrap (owner spec) — CSS truncate alone is
// width-based, not character-count-based, so the string itself is sliced first.
function truncateName(name: string): string {
  return name.length > NAME_LIMIT ? `${name.slice(0, NAME_LIMIT)}…` : name;
}

function InfoRow({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60ch] truncate whitespace-nowrap font-medium" title={title}>
        {value}
      </span>
    </div>
  );
}

export function AutomationInfoMenu({
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
  const botLabel = botName === undefined ? "…" : botName ? truncateName(botName) : "Not connected";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Automation menu">
            <Menu className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Automation</DropdownMenuLabel>
          <InfoRow label="Telegram bot" value={botLabel} title={botName ?? undefined} />
          {/* Constant, not fabricated: one global OpenAI key powers every automation today
              (step 208 unification) — there is no per-automation provider switch to read. */}
          <InfoRow label="AI provider" value="OpenAI API" />
          <InfoRow label="AI model" value={model ?? defaultModel} />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={enabled === null}
            variant={enabled ? "destructive" : "default"}
            onSelect={(e) => {
              e.preventDefault(); // keep the dialog from unmounting with the menu
              setConfirmOpen(true);
            }}
          >
            {enabled ? "Deactivate automation" : "Activate automation"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ActivateConfirmModal
        category={category}
        slug={slug}
        enabled={Boolean(enabled)}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </>
  );
}
