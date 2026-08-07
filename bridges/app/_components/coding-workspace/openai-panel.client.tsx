"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, KeyRound, Loader2, CheckCircle, AlertCircle, RefreshCw, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpNote } from "./help-note.client";

type Props = {
  onClose: () => void;
};

type MemoryStatus = { configured: boolean; model: string | null };

// OpenAI settings — the OpenAI API key that powers Vector memory. (step 500:
// the Brain/Hermes half was removed together with Hermes.)
export function OpenAiPanel({ onClose }: Props) {
  const [memory, setMemory] = useState<MemoryStatus | null>(null);
  const [memoryKey, setMemoryKey] = useState("");
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function refresh() {
    try {
      const [m] = await Promise.all([
        fetch("/api/config/embeddings").then((r) => r.json()).catch(() => null),
      ]);
      if (m) setMemory({ configured: !!m.configured, model: m.model ?? null });
    } catch { /* keep prior state */ }
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  // (step 500) Only the Memory key remains — no mirroring.
  function onMemoryChange(v: string) {
    setMemoryKey(v);

  }

  async function handleSave() {

    const mKey = memoryKey.trim();
    if (!mKey) { toast.error("Paste an OpenAI key first"); return; }

    if (mKey && !mKey.startsWith("sk-")) { toast.error("Key looks invalid (expected sk-…)"); return; }

    setSaving(true);
    try {
      const ops: Promise<Response>[] = [];
      if (mKey) {
        ops.push(fetch("/api/config/embeddings", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: mKey }),
        }));
      }
      const results = await Promise.all(ops);
      // A 400 is the only hard error here — a bad key format / nothing to save.
      // Surface it so the user fixes the key.
      const invalid = results.find((r) => r.status === 400);
      if (invalid) {
        const data = await invalid.json().catch(() => null);
        toast.error(data?.error ?? "Invalid key — check and retry");
        return;
      }
      // Any other non-2xx is almost always the fresh-server restart race: the key
      // IS written (the route persists it best-effort), the data service is
      // just still (re)starting when the second concurrent call hits it. Do NOT
      // scare the user with "failed" — the keys are saved; the chat only needs a
      // reload once the restart settles. Show the Saved panel (with its reload
      // button) either way.
      setSavedAt(Date.now());
      setMemoryKey("");
      await refresh();
      toast.success("Key saved — the data service restarts to pick it up");
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
    // REFERENCE LAYOUT (Users): the panel fills its anchored box — height from the
    // wrapper's two anchors, width from the stretch. The FORM inside is capped at a
    // readable column, because a single key field stretched across a wide screen is
    // harder to use, not easier.
    <div className="flex flex-col h-full w-full bg-background border-t border-border">
      {/* Header — same shape as the Users panel: title left, status, close right. */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <KeyRound size={13} />
          OpenAI settings
          <HelpNote title="One key — what spends it, and why this is not a subscription">
            <p>
              <strong>What you get.</strong> One key, entered once, that every part of the platform draws
              on. It is not a plan with a monthly fee — it is a balance you top up, and you are charged for
              what was actually used, down to the request.
            </p>
            <p>
              <strong>What spends it.</strong> Vector memory turns each chunk of text into a vector, once
              at ingest and once per search. Agentic RAG spends far more: it reads every chunk to extract
              entities and relations, then writes an answer for each question. Voice input pays for
              transcription, by the minute of audio. Images and video pay a vision model, by the picture.
              Different jobs, different models, different prices — a search costs a fraction of a cent, a
              graph pass over a long document costs minutes of compute.
            </p>
            <p>
              <strong>Why a subscription cannot replace it.</strong> A single flat plan does not exist for
              this shape of work. Embeddings, transcription, vision and reasoning are separate services
              priced separately, and a consumer plan that covers one covers none of the others. More to the
              point, most consumer plans restrict commercial use, and many forbid automated or agent-driven
              access outright — which is exactly what a platform like this does all day. A key on a
              pay-as-you-go balance is not a workaround; it is the only arrangement that is both permitted
              and predictable.
            </p>
            <p>
              <strong>What we do about the cost.</strong> Fractera treats tokens as money, because they are.
              Embeddings run on the cheap <strong>text-embedding-3-small</strong>, not the large model — the
              quality difference is imperceptible for this work and the price is about seven times lower.
              The vector store answers from a real index, so a search reads a handful of rows instead of the
              whole base. The graph pays its expensive pass once at ingest and stays cheap per question
              afterwards. Nothing here calls a model that a cheaper path could have answered.
            </p>
            <p>
              <strong>Where you should watch it.</strong> Ingesting a large corpus into the knowledge base
              is the one operation that costs real money in one go. Load what you will actually ask about,
              and remember that re-loading a document pays for that pass again.
            </p>
            <p>
              <strong>Changing the provider.</strong> OpenAI is the default we chose for the balance of
              price, quality and availability. If your project needs a different provider or model, write to{" "}
              <a href="mailto:admin@fractera.ai" className="text-primary underline underline-offset-2">admin@fractera.ai</a>{" "}
              and the developer will arrange it.
            </p>
          </HelpNote>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">embeddings · data service</span>
        <span className="ml-auto">{!loading && memory && statusChip(memory.configured)}</span>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X size={13} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {loading ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
              Paste an OpenAI API key so the data layer can turn text into vectors. Embeddings run on the cheap
              <strong> text-embedding-3-small</strong> — top up a balance from $5 at{" "}
              <a href="https://platform.openai.com/login" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a>.
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                  <BrainCircuit size={12} /> Vector memory key
                </p>
                {memory && statusChip(memory.configured)}
              </div>
              <input
                type="password"
                value={memoryKey}
                onChange={(e) => onMemoryChange(e.target.value)}
                placeholder={memory?.configured ? "Paste new key to replace" : "sk-…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              {memory?.model && (
                <p className="text-[10px] font-mono text-muted-foreground">model: {memory.model}</p>
              )}
            </div>

            <p className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>The key is stored only on your own server, in the data service env.</span>
            </p>

            {savedAt && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-1.5">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={12} /> Key saved
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  The data service restarts for about 10 seconds to pick up the key.
                </p>
                <Button variant="outline" size="xs" onClick={() => window.location.reload()}>
                  <RefreshCw size={10} /> Reload project
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end">
        <Button onClick={handleSave} disabled={saving || !memoryKey.trim()}>
          {saving ? <><Loader2 size={11} className="animate-spin" />Saving…</> : "Save"}
        </Button>
      </div>
    </div>
  );
}
