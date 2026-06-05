"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, KeyRound, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

type Props = {
  onClose: () => void;
};

type HermesStatus = {
  configured: boolean;
  keyMasked: string | null;
  model: string | null;
};

// OpenAI settings — the simple "paste your key and the chat works" drawer.
// Saving the key POSTs to /api/config/hermes, which (step 87 "key→provider")
// writes the key, switches the agent to the openai-api / gpt-5-mini provider
// when no subscription is connected, and restarts Hermes + its web chat. This
// is the canonical low-cost on-ramp for Brain (and Memory autofills from it).
export function OpenAiPanel({ onClose }: Props) {
  const [status, setStatus] = useState<HermesStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/config/hermes")
      .then((r) => r.json())
      .then((data: HermesStatus) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const sent = apiKey.trim();
    if (!sent) {
      toast.error("Paste your OpenAI key first");
      return;
    }
    if (!sent.startsWith("sk-")) {
      toast.error("Invalid key (expected sk-… format)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/config/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: sent }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      setSavedAt(Date.now());
      setApiKey("");
      try {
        const fresh = await fetch("/api/config/hermes").then((r) => r.json());
        setStatus(fresh);
      } catch { /* admin reloading */ }
      toast.success("Saved — your chat is connecting to OpenAI");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <KeyRound size={13} />
          OpenAI settings
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading || !status ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : (
          <>
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
              <p>
                Paste an OpenAI API key to power your Brain chat. We start it on the cheap
                <strong> gpt-5-mini</strong> (about a cent per hour) — top up a balance from $5 at{" "}
                <a href="https://platform.openai.com/login" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a>.
                The same key also powers Memory. Prefer a subscription instead? Connect it in{" "}
                <strong>Hermes Agent</strong> (the Settings menu).
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground">OpenAI API key</p>
                {status.configured ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <CheckCircle size={10} />
                    <span className="font-mono">{status.keyMasked}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">not set</span>
                )}
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={status.configured ? "Paste new key to replace" : "sk-…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              {status.model && (
                <p className="text-[10px] text-muted-foreground">
                  Active model: <code className="px-1 py-0.5 rounded bg-muted">{status.model}</code>
                </p>
              )}

              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                <p className="flex items-start gap-1.5">
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  <span>
                    Your key is stored only on your own server. Saving it switches the agent to the
                    direct OpenAI provider and restarts the chat — give it a few seconds.
                  </span>
                </p>
              </div>
            </div>

            {savedAt && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 space-y-1.5">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={12} /> Saved
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  The chat restarts within about 10 seconds to pick up the key. Reload the page, then
                  open the Brain chat and say hello.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-emerald-500/50 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <RefreshCw size={10} /> Reload page
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !apiKey.trim()}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {saving ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Saving…</span> : "Save"}
        </button>
      </div>
    </div>
  );
}
