"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
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

export function MissingKeysModal({ lang }: { lang: string }) {
  const t = projectTabStrings(lang);
  const active = REQUIRED_ENV_KEYS.length > 0;
  const [missing, setMissing] = useState<string[]>([]);
  const [openAiMissing, setOpenAiMissing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [openAiValue, setOpenAiValue] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
          const data = res.ok ? ((await res.json()) as { configured?: boolean }) : null;
          openAiAbsent = !data?.configured;
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
      for (const [key, value] of entries) {
        const res = await fetch("/api/project-config/env", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        if (!res.ok) {
          const info = (await res.json().catch(() => null)) as { error?: string } | null;
          toast.error(`${key}: ${info?.error ?? `save failed (HTTP ${res.status})`}`);
          setSaving(false);
          return;
        }
      }
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
      toast.success(
        entries.length + (openAi ? 1 : 0) === 1
          ? "Key saved — the app is applying it (a brief restart)"
          : "Keys saved — the app is applying them (a brief restart)",
      );
      setOpen(false);
    } catch {
      toast.error("Could not save keys (network error)");
    } finally {
      setSaving(false);
    }
  }

  if (!active) return null;

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
              <Label htmlFor={`missing-key-${key}`}>
                {KEY_TO_SERVICE[key] ? `${KEY_TO_SERVICE[key]} — ` : ""}
                <code>{key}</code>
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
