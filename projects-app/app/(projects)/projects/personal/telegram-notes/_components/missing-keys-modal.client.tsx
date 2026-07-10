"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROJECT_INTEGRATIONS, REQUIRED_ENV_KEYS } from "../_data/required-keys";
import { projectTabStrings } from "../_data/tab-i18n";

// Native "missing keys" modal (step 186.3, extended 187.9) — a REUSABLE culture: any
// automation that declares integration env keys gets this. On mount it checks which
// declared keys are present and, for any absent one, shows a Dialog with an input.
//
// OPENAI_API_KEY is SPECIAL (187.9): it is the shared Fractera AI (OpenAI) key that lives
// where Hermes keeps it — it is checked/saved through the slot forwarder
// (/api/project-config/openai-key → Admin :3002 /api/config/hermes), NOT the slot env
// setter, and the memory/LightRAG key gets the same value automatically (still editable).
// Its field carries a "!" tooltip recommending an API key over a subscription. Every OTHER
// key is written to the slot's app/.env.local via the single-key setter (186.4) + restart.
//
// The user MAY dismiss (Esc / X) — nothing works and the modal returns on the next open.
const OPENAI_KEY = "OPENAI_API_KEY";

const KEY_TO_SERVICE: Record<string, string> = Object.fromEntries(
  PROJECT_INTEGRATIONS.flatMap((integration) =>
    (integration.envKeys ?? []).map((key) => [key, integration.name]),
  ),
);

// Regular keys go to the slot env setter; the OpenAI key is routed to the forwarder.
const REGULAR_KEYS = REQUIRED_ENV_KEYS.filter((k) => k !== OPENAI_KEY);
const NEEDS_OPENAI = REQUIRED_ENV_KEYS.includes(OPENAI_KEY);

// `category`/`project` identify the owning automation so a saved Telegram token can be
// registered with the substrate listener (one bot per automation, step 205). Optional so
// the modal stays reusable for automations that declare no Telegram bot.
export function MissingKeysModal({
  lang,
  category,
  project,
}: {
  lang: string;
  category?: string;
  project?: string;
}) {
  const t = projectTabStrings(lang);
  const active = REQUIRED_ENV_KEYS.length > 0;
  const [missing, setMissing] = useState<string[]>([]);
  const [openAiMissing, setOpenAiMissing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [openAiValue, setOpenAiValue] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // True from the moment the keys are saved until the post-restart reload fires.
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (!active) return;
    let alive = true;

    async function check() {
      let absent: string[] = [];
      let openAiAbsent = false;

      if (REGULAR_KEYS.length) {
        try {
          const query = encodeURIComponent(REGULAR_KEYS.join(","));
          const res = await fetch(`/api/project-config/env?keys=${query}`, { cache: "no-store" });
          const data = res.ok ? ((await res.json()) as { present?: Record<string, boolean> }) : null;
          if (data?.present) absent = REGULAR_KEYS.filter((key) => !data.present![key]);
        } catch {
          /* env status unreachable — leave absent empty */
        }
      }
      if (NEEDS_OPENAI) {
        try {
          const res = await fetch("/api/project-config/openai-key", { cache: "no-store" });
          const data = res.ok
            ? ((await res.json()) as { configured?: boolean; inconclusive?: boolean })
            : null;
          // Only nag when the key is DEFINITIVELY absent. `inconclusive` (Admin
          // non-OK/unreachable) must not force the modal (187.9 false-nag bug).
          openAiAbsent = Boolean(data) && !data!.configured && !data!.inconclusive;
        } catch {
          /* forwarder unreachable — leave openAiAbsent false */
        }
      }

      if (!alive) return;
      setMissing(absent);
      setOpenAiMissing(openAiAbsent);
      if (absent.length || openAiAbsent) setOpen(true);
    }

    check();
    return () => {
      alive = false;
    };
  }, [active]);

  async function save() {
    const entries = missing
      .map((key) => [key, (values[key] ?? "").trim()] as const)
      .filter(([, value]) => value.length > 0);
    const openAi = openAiMissing ? openAiValue.trim() : "";
    if (!entries.length && !openAi) {
      toast.error("Enter at least one value, or close to skip for now");
      return;
    }
    setSaving(true);
    try {
      // ORDERING IS LOAD-BEARING (fixes the red-toast / black-screen race). Each key write that
      // touches the slot env restarts fractera-app — the SAME process serving this modal and its
      // page. Writing several keys, each with its own restart, meant a restart killed the NEXT
      // in-flight request (the OpenAI save) and blanked the page. So: (1) write every regular slot
      // key with restart DEFERRED when an OpenAI save follows (the OpenAI forwarder restarts
      // fractera-app once, at the end, picking up these keys too); (2) if there is no OpenAI key,
      // the LAST regular write carries the single restart. Result: exactly ONE restart, at the end,
      // after every request has returned — nothing in-flight to kill.
      let telegramToken = "";
      for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i];
        const isLastRegular = i === entries.length - 1;
        const restart = openAi ? false : isLastRegular;
        const res = await fetch("/api/project-config/env", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value, restart }),
        });
        if (!res.ok) {
          const info = (await res.json().catch(() => null)) as { error?: string } | null;
          toast.error(`${key}: ${info?.error ?? `save failed (HTTP ${res.status})`}`);
          setSaving(false);
          return;
        }
        if (key === "TELEGRAM_BOT_TOKEN") telegramToken = value;
      }

      // Register this automation's bot with the substrate listener so it starts polling (one bot
      // per automation, step 205). Best-effort + only when the automation identity is known — the
      // env token is saved regardless; the listener reconciles on its next tick.
      if (telegramToken && category && project) {
        try {
          await fetch("/api/project-config/register-bot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category, project, token: telegramToken }),
          });
        } catch {
          /* best-effort — the token is persisted; registration retries on the next save */
        }
      }

      // OpenAI key LAST: the forwarder writes Hermes/Memory/slot and triggers the single
      // fractera-app restart at the very end, once every request above has already returned.
      if (openAi) {
        const res = await fetch("/api/project-config/openai-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: openAi }),
        });
        if (!res.ok) {
          const info = (await res.json().catch(() => null)) as { error?: string } | null;
          toast.error(`OpenAI: ${info?.error ?? `save failed (HTTP ${res.status})`}`);
          setSaving(false);
          return;
        }
      }
      toast.success("Keys saved — applying, the page reloads in a few seconds");
      setOpen(false);
      // AUTO-RELOAD (owner request): saving triggers ONE fractera-app restart (~5-10s). Until the
      // process is back the page keeps rendering its stale server state ("Not configured") and the
      // chat/automation look dead even though the key landed. Poll the health of the key instead of
      // guessing a delay, then reload once the app is serving again with the key in its env.
      setReloading(true);
      void waitForKeyThenReload();
    } catch {
      toast.error("Could not save keys (network error)");
    } finally {
      setSaving(false);
    }
  }

  // Poll until the restarted app reports the saved keys present (or a hard cap elapses), then
  // reload. A restart makes fetches fail for a few seconds — those errors are expected, keep polling.
  async function waitForKeyThenReload() {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2_000));
      try {
        if (NEEDS_OPENAI) {
          const res = await fetch("/api/project-config/openai-key", { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { configured?: boolean };
            if (data.configured) break;
          }
        } else {
          const query = encodeURIComponent(REGULAR_KEYS.join(","));
          const res = await fetch(`/api/project-config/env?keys=${query}`, { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { present?: Record<string, boolean> };
            if (data.present && REGULAR_KEYS.every((k) => data.present![k])) break;
          }
        }
      } catch {
        /* app is restarting — keep polling */
      }
    }
    window.location.reload();
  }

  if (!active) return null;

  // While the app restarts, keep a non-dismissible "applying" dialog up instead of dropping the
  // user onto a stale page that still says "Not configured" until they reload by hand.
  if (reloading) {
    return (
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.keysTitle}</DialogTitle>
            <DialogDescription>
              Applying your keys — the app restarts and this page reloads automatically. This takes a
              few seconds; no need to do anything.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="size-4 animate-spin" />
            Restarting…
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.keysTitle}</DialogTitle>
          <DialogDescription>{t.keysDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {missing.map((key) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`missing-key-${key}`} className="flex items-center gap-1.5">
                <span>
                  {KEY_TO_SERVICE[key] ? `${KEY_TO_SERVICE[key]} — ` : ""}
                  <code>{key}</code>
                </span>
                {key === "TELEGRAM_BOT_TOKEN" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-amber-500" aria-label="How to create a Telegram bot">
                          <AlertCircle className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{t.telegramTooltip}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </Label>
              <Input
                id={`missing-key-${key}`}
                type="password"
                autoComplete="off"
                value={values[key] ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [key]: event.target.value }))
                }
                placeholder={`Value for ${key}`}
              />
            </div>
          ))}

          {openAiMissing && (
            <div className="space-y-1.5">
              <Label htmlFor="missing-key-openai" className="flex items-center gap-1.5">
                <span>{t.openaiLabel}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-amber-500" aria-label="Why an API key">
                        <AlertCircle className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{t.openaiTooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="missing-key-openai"
                type="password"
                autoComplete="off"
                value={openAiValue}
                onChange={(event) => setOpenAiValue(event.target.value)}
                placeholder="sk-…"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            {t.keysLater}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? t.keysSaving : t.keysSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
