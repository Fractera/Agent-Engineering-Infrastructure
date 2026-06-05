"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, KeyRound, Loader2, CheckCircle, AlertCircle, RefreshCw, BrainCircuit, Brain } from "lucide-react";

type Props = {
  onClose: () => void;
};

type BrainStatus = { configured: boolean; keyMasked: string | null; model: string | null };
type MemoryStatus = { configured: boolean; model: string | null };

// OpenAI settings — one place for the OpenAI API key(s) that power Brain (Hermes)
// and Memory (LightRAG). Two independent stores (Brain → Hermes credential pool,
// Memory → LightRAG .env) mean a user can use ONE key for both, or TWO keys to
// track spend separately. Entering the first key auto-mirrors into the other
// field (until edited), so the common "one key" case is one paste + Save.
// → reports/errors/hermes-key-pool-and-model-default.md (step 89)
export function OpenAiPanel({ onClose }: Props) {
  const [brain, setBrain]   = useState<BrainStatus | null>(null);
  const [memory, setMemory] = useState<MemoryStatus | null>(null);
  const [brainKey, setBrainKey]   = useState("");
  const [memoryKey, setMemoryKey] = useState("");
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function refresh() {
    try {
      const [b, m] = await Promise.all([
        fetch("/api/config/hermes").then((r) => r.json()).catch(() => null),
        fetch("/api/rag/config").then((r) => r.json()).catch(() => null),
      ]);
      if (b) setBrain({ configured: !!b.configured, keyMasked: b.keyMasked ?? null, model: b.model ?? null });
      if (m) setMemory({ configured: !!m.configured, model: m.model ?? null });
    } catch { /* keep prior state */ }
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  // Auto-mirror: typing the first key fills the still-empty / unconfigured other
  // field, so one key covers both. Editing the mirrored field later diverges them.
  function onBrainChange(v: string) {
    setBrainKey(v);
    if (v && !memoryKey && memory && !memory.configured) setMemoryKey(v);
  }
  function onMemoryChange(v: string) {
    setMemoryKey(v);
    if (v && !brainKey && brain && !brain.configured) setBrainKey(v);
  }

  async function handleSave() {
    const bKey = brainKey.trim();
    const mKey = memoryKey.trim();
    if (!bKey && !mKey) { toast.error("Paste at least one OpenAI key first"); return; }
    if (bKey && !bKey.startsWith("sk-")) { toast.error("Brain key looks invalid (expected sk-…)"); return; }
    if (mKey && !mKey.startsWith("sk-")) { toast.error("Memory key looks invalid (expected sk-…)"); return; }

    setSaving(true);
    try {
      const ops: Promise<Response>[] = [];
      if (bKey) {
        ops.push(fetch("/api/config/hermes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: bKey }),
        }));
      }
      if (mKey) {
        ops.push(fetch("/api/rag/config", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vars: { LLM_BINDING_API_KEY: mKey } }),
        }));
      }
      const results = await Promise.all(ops);
      const bad = results.find((r) => !r.ok);
      if (bad) { toast.error("Some keys failed to save — check and retry"); return; }

      setSavedAt(Date.now());
      setBrainKey(""); setMemoryKey("");
      await refresh();
      toast.success("Saved — your chat is connecting to OpenAI");
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
                Paste an OpenAI API key to power your Brain chat and Memory. We start on the cheap
                <strong> gpt-5-mini</strong> (about a cent per hour) — top up a balance from $5 at{" "}
                <a href="https://platform.openai.com/login" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a>.
                One key works for both. Prefer a subscription for Brain instead? Connect it in{" "}
                <strong>Hermes Agent</strong> (the Settings menu).
              </p>
            </div>

            {/* Brain key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5"><Brain size={12} /> Brain key (Hermes chat)</p>
                {brain && statusChip(brain.configured, brain.keyMasked)}
              </div>
              <input
                type="password"
                value={brainKey}
                onChange={(e) => onBrainChange(e.target.value)}
                placeholder={brain?.configured ? "Paste new key to replace" : "sk-…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>

            {/* Memory key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5"><BrainCircuit size={12} /> Memory key (LightRAG)</p>
                {memory && statusChip(memory.configured)}
              </div>
              <input
                type="password"
                value={memoryKey}
                onChange={(e) => onMemoryChange(e.target.value)}
                placeholder={memory?.configured ? "Paste new key to replace" : "sk-…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
              <p className="flex items-start gap-1.5">
                <AlertCircle size={11} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Want to track spend separately?</strong> Brain and Memory keep their keys in
                  two independent places. Create <strong>two different keys</strong> in OpenAI and paste
                  one into each field — then watch each line item in the Usage dashboard at
                  platform.openai.com. One key for both is perfectly fine too. Keys are stored only on
                  your own server.
                </span>
              </p>
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
          disabled={saving || (!brainKey.trim() && !memoryKey.trim())}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {saving ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Saving…</span> : "Save"}
        </button>
      </div>
    </div>
  );
}
