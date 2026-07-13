"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateAutomationStrings } from "../create-automation-i18n";

/** Poll the OpenAI-key forwarder until it reports `configured:true`, or a cap elapses. Fetch errors are
 *  EXPECTED here: saving the key restarts `fractera-projects` server-side (bridges/app propagateOpenAiKey),
 *  so the process is briefly unreachable — swallow those, keep polling, exactly like missing-keys-modal's
 *  `waitForKeyThenReload` (which this mirrors, minus the page reload — this panel's own local state is all
 *  that depended on the key, so a silent retry is enough). */
async function pollUntilConfigured(): Promise<boolean> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_000));
    try {
      const r = await fetch("/api/project-config/openai-key", { cache: "no-store" });
      if (r.ok) {
        const d = (await r.json()) as { configured?: boolean };
        if (d.configured) return true;
      }
    } catch { /* restarting — keep polling */ }
  }
  return false;
}

/** Inline "add/fix the OpenAI key" widget — extracted from create-automation-card.client.tsx (was scoped
 *  there to the "new category" panel only) so `AddCategoryButton`'s standalone dialog can reuse the exact
 *  same network sequence (POST the forwarder → poll → proceed) without a second implementation. NEVER writes
 *  the key anywhere except this one POST to /api/project-config/openai-key — that forwarder is the only
 *  correct path (step 208: one key, one store). */
export function InlineOpenAiKeyPanel({ L, onSaved }: { L: CreateAutomationStrings; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const apiKey = value.trim();
    if (!apiKey) return;
    setBusy(true);
    try {
      const r = await fetch("/api/project-config/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (!r.ok) {
        const info = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(info?.error ?? L.errKeyMissing);
        return;
      }
      const ok = await pollUntilConfigured();
      if (!ok) { toast.error(L.errTranslateFailed); return; }
      setValue("");
      onSaved(); // parent clears needsKey and auto-retries with what the owner already typed
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/5 p-3">
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs text-muted-foreground">{L.keyMissingBanner}</p>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="cat-openai-key" className="sr-only">{L.keyInputLabel}</Label>
        <Input
          id="cat-openai-key"
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-…"
          className="flex-1"
        />
        <Button type="button" size="sm" onClick={save} disabled={busy || !value.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : L.keySaveBtn}
        </Button>
      </div>
    </div>
  );
}
