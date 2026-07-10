"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { refreshAutomationStatus } from "../_lib/automation-status";

// Map an env key to the integration the check-key endpoint knows how to probe (188-R). The
// OpenAI key is special — it lives where Hermes keeps it (the forwarder), not the slot env.
const KEY_TARGET: Record<string, "telegram" | "openai" | "lightrag"> = {
  TELEGRAM_BOT_TOKEN: "telegram",
  OPENAI_API_KEY: "openai",
};
const OPENAI_KEY = "OPENAI_API_KEY";

// Per-node key configuration inside the diagram's info panel — the THIRD place a key can be
// set (after the entry modal and the settings accordion, 188-R). For each of the node's env
// keys: a value input to save it (slot env setter, or the OpenAI forwarder) + a "Check" button
// that verifies the credential actually works (Telegram getMe / OpenAI / LightRAG).
export function NodeKeyCheck({ envKeys }: { envKeys: string[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, { ok: boolean; detail: string }>>({});

  async function save(key: string) {
    const value = (values[key] ?? "").trim();
    if (!value) return;
    setBusy(key);
    try {
      const isOpenAi = key === OPENAI_KEY;
      const res = await fetch(
        isOpenAi ? "/api/project-config/openai-key" : "/api/project-config/env",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isOpenAi ? { apiKey: value } : { key, value }),
        },
      );
      if (!res.ok) {
        const info = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(`${key}: ${info?.error ?? `save failed (HTTP ${res.status})`}`);
        return;
      }
      setValues((p) => ({ ...p, [key]: "" }));
      void refreshAutomationStatus();
      toast.success(`${key} saved — applying (a brief restart)`);
    } catch {
      toast.error(`${key}: could not save (network error)`);
    } finally {
      setBusy(null);
    }
  }

  async function check(key: string) {
    const target = KEY_TARGET[key];
    if (!target) {
      toast.message(`${key} has no live check — it is used directly by the step.`);
      return;
    }
    setBusy(key);
    try {
      const res = await fetch("/api/projects/personal/telegram-notes/check-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const d = (await res.json().catch(() => null)) as { ok?: boolean; detail?: string } | null;
      const ok = Boolean(d?.ok);
      setResult((p) => ({ ...p, [key]: { ok, detail: d?.detail ?? "no detail" } }));
      if (ok) toast.success(`${key}: ${d?.detail}`);
      else toast.error(`${key}: ${d?.detail ?? "check failed"}`);
      void refreshAutomationStatus();
    } catch {
      setResult((p) => ({ ...p, [key]: { ok: false, detail: "check request failed" } }));
      toast.error(`${key}: check request failed`);
    } finally {
      setBusy(null);
    }
  }

  if (!envKeys.length) return null;
  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-1.5 font-medium">
        <KeyRound className="size-3.5" /> Keys
      </h4>
      {envKeys.map((key) => {
        const r = result[key];
        const canCheck = Boolean(KEY_TARGET[key]);
        return (
          <div key={key} className="space-y-1.5">
            <code className="text-xs">{key}</code>
            <div className="flex gap-1.5">
              <Input
                type="password"
                autoComplete="off"
                value={values[key] ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                placeholder="new value…"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                disabled={busy === key || !(values[key] ?? "").trim()}
                onClick={() => save(key)}
              >
                Save
              </Button>
            </div>
            {canCheck && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-full justify-start text-xs"
                disabled={busy === key}
                onClick={() => check(key)}
              >
                {busy === key ? "Checking…" : "Check key / API"}
              </Button>
            )}
            {r && (
              <p
                className={
                  "flex items-start gap-1 text-xs " +
                  (r.ok ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500")
                }
              >
                {r.ok ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                )}
                {r.detail}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
