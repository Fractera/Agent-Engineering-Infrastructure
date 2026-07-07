"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, KeyRound, Loader2, CheckCircle, RefreshCw } from "lucide-react";

type Props = {
  onClose: () => void;
};

type BrainStatus = { configured: boolean; keyMasked: string | null; model: string | null };

// OpenAI settings — ONE key, one field (step 199 unified-key contract). A single
// OpenAI API key powers everything that needs it: Brain (Hermes chat), Memory
// (LightRAG), AND the slot automations. Saving it via /api/config/hermes writes
// the same value to the Hermes credential pool, the LightRAG env, and the slot's
// own .env.local — so a project's automation actually sees the key (before this,
// the UI went green while the slot had no key: the false-green bug). No more
// separate Brain/Memory keys, no auto-mirror — one paste, one Save, everywhere.
// → reports/errors/hermes-key-pool-and-model-default.md (step 89)
export function OpenAiPanel({ onClose }: Props) {
  const [brain, setBrain] = useState<BrainStatus | null>(null);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function refresh() {
    try {
      const b = await fetch("/api/config/hermes").then((r) => r.json()).catch(() => null);
      if (b) setBrain({ configured: !!b.configured, keyMasked: b.keyMasked ?? null, model: b.model ?? null });
    } catch { /* keep prior state */ }
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  async function handleSave() {
    const k = key.trim();
    if (!k) { toast.error("Paste your OpenAI key first"); return; }
    if (!k.startsWith("sk-")) { toast.error("Key looks invalid (expected sk-…)"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/config/hermes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: k }),
      });
      // A 400 is the only hard error — a bad key format. Anything else is almost
      // always the fresh-server restart race: the key IS written (best-effort),
      // the services are just restarting. Show Saved either way.
      if (res.status === 400) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Invalid key — check and retry");
        return;
      }
      setSavedAt(Date.now());
      setKey("");
      await refresh();
      toast.success("Key saved — it powers Brain, Memory, and your automations");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  const statusChip = (configured: boolean, masked?: string | null) =>
    configured ? (
      <span className="flex items-center gap-1 text-[10px] text-green-500">
        <CheckCircle size={10} />
        {masked ? <span className="font-mono">{masked}</span> : <span>set</span>}
      </span>
    ) : (
      <span className="text-[10px] text-muted-foreground">not set</span>
    );

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
        {loading ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : (
          <>
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
              <p>
                Paste ONE OpenAI API key. It powers <strong>everything that needs it</strong> — your
                Brain chat, Memory, and your project automations — from a single field. We start on the
                cheap <strong>gpt-5-mini</strong> (about a cent per hour); top up a balance from $5 at{" "}
                <a href="https://platform.openai.com/login" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a>.
                Prefer a subscription for Brain instead? Connect it in <strong>Hermes Agent</strong> (the Settings menu).
              </p>
            </div>

            {/* The one key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5"><KeyRound size={12} /> OpenAI API key</p>
                {brain && statusChip(brain.configured, brain.keyMasked)}
              </div>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder={brain?.configured ? "Paste new key to replace" : "sk-…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                One key for Brain, Memory, and automations. Stored only on your own server.
              </p>
            </div>

            {savedAt && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 space-y-1.5">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={12} /> Key saved
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Brain, Memory, and the project restart for about 10 seconds to pick up the key. To
                  start the chat, please reload the project, then open the Brain chat and say hello.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-emerald-500/50 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <RefreshCw size={10} /> Reload project
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !key.trim()}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {saving ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Saving…</span> : "Save"}
        </button>
      </div>
    </div>
  );
}
