"use client";

import { useState } from "react";
import { Brain, ExternalLink, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onActivated: () => void;
};

// Gating dialog shown the first time the user clicks "Company Brain" and
// the LightRAG service has no OpenAI API key configured. Doubles as the
// onboarding for the feature — explains why a separate key is needed
// even though Hermes itself runs on a ChatGPT/Claude subscription.
export function CompanyBrainSetupModal({ open, onClose, onActivated }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave() {
    setError(null);
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith("sk-")) {
      setError("API key should start with sk-… — check that you copied it correctly.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/config/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Save failed");
        return;
      }
      onActivated();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-background shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-foreground">Company Brain — setup</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 text-sm text-foreground">
          {/* Headline value proposition */}
          <p className="leading-relaxed">
            <strong>Company Brain</strong> is the long-term memory of your project. It remembers
            your documents, notes, and history — and feeds them to the Hermes agent exactly when
            they're needed. It's not a side feature, it's an{" "}
            <strong>effectiveness multiplier</strong> for the whole system:
          </p>

          <ul className="flex flex-col gap-1.5 pl-4 text-xs text-muted-foreground leading-relaxed list-disc">
            <li>Working with documents — without memory the agent significantly loses context between sessions.</li>
            <li>Working with code — noticeably loses understanding of project architecture.</li>
            <li>Conversations with Hermes — partly loses continuity on long tasks.</li>
          </ul>

          <p className="leading-relaxed">
            The smarter the memory, the <strong>fewer tokens</strong> are burned from your
            subscription to expensive models (Codex / Claude) — because the agent asks more
            precise questions.
          </p>

          {/* What is required */}
          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] px-3 py-2.5 flex flex-col gap-1.5">
            <p className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">What's required</p>
            <p className="text-xs text-foreground/80 leading-relaxed">
              An OpenAI API key. Company Brain uses the cheapest model (<code className="text-violet-400">gpt-4o-mini</code>) —
              usually <strong>less than $1/month</strong> even under heavy use. The key takes a
              minute to get from your OpenAI account.
            </p>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors w-fit mt-0.5"
            >
              Open platform.openai.com/api-keys
              <ExternalLink size={11} />
            </a>
          </div>

          {/* Input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="openai-key" className="text-xs font-mono font-bold text-foreground/70 uppercase tracking-widest">
              OpenAI API key
            </label>
            <input
              id="openai-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              disabled={saving}
              className="w-full bg-black/30 border border-white/15 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/60 font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 leading-relaxed">{error}</p>
          )}

          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            <em>Without a key Company Brain will not activate</em> — Hermes keeps working but
            without long-term project memory. <strong>We recommend connecting it.</strong>
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
              className="text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors"
            >
              {saving ? "Activating…" : "Save and activate"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-sm font-semibold text-foreground/60 hover:text-foreground border border-border px-4 py-2 rounded-md transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
