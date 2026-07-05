"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROJECT_INTEGRATIONS, REQUIRED_ENV_KEYS } from "../_data/required-keys";
import { projectTabStrings } from "../_data/tab-i18n";

// Native "missing keys" modal (step 186.3) — a REUSABLE culture, not a one-off: any
// automation that declares integration env keys gets this. On mount it asks the slot
// env setter which of REQUIRED_ENV_KEYS are present; any that are absent surface as a
// Dialog with one input each. Saving POSTs each supplied key to /api/project-config/env
// (single-key setter, 186.4), which writes the slot's app/.env.local and restarts
// fractera-app so the runtime var takes effect. The user MAY dismiss (Esc / X) — then
// nothing works and the modal returns on the next open (remount re-checks). Keys left
// blank are simply skipped and re-prompted next time.
//
// Keys map back to the integration that declared them, so the dialog can name the
// service ("Telegram" needs TELEGRAM_BOT_TOKEN) instead of a bare variable.
const KEY_TO_SERVICE: Record<string, string> = Object.fromEntries(
  PROJECT_INTEGRATIONS.flatMap((integration) =>
    (integration.envKeys ?? []).map((key) => [key, integration.name]),
  ),
);

export function MissingKeysModal({ lang }: { lang: string }) {
  const t = projectTabStrings(lang);
  const active = REQUIRED_ENV_KEYS.length > 0;
  const [missing, setMissing] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const query = encodeURIComponent(REQUIRED_ENV_KEYS.join(","));
    fetch(`/api/project-config/env?keys=${query}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { present?: Record<string, boolean> } | null) => {
        if (!alive || !data?.present) return;
        const absent = REQUIRED_ENV_KEYS.filter((key) => !data.present![key]);
        if (absent.length) {
          setMissing(absent);
          setOpen(true);
        }
      })
      .catch(() => {
        // env status unreachable — stay silent; the modal will try again next mount
      });
    return () => {
      alive = false;
    };
  }, [active]);

  async function save() {
    const entries = missing
      .map((key) => [key, (values[key] ?? "").trim()] as const)
      .filter(([, value]) => value.length > 0);
    if (!entries.length) {
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
      toast.success(
        entries.length === 1
          ? "Key saved — the app is applying it (a brief restart)"
          : `${entries.length} keys saved — the app is applying them (a brief restart)`,
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
