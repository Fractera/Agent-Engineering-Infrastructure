"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Bot, Loader2, CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronRight, Sparkles, KeyRound, Send } from "lucide-react";

type Props = {
  onClose: () => void;
  autoFocusKey?: boolean;
};

type HermesStatus = {
  configured: boolean;
  keyMasked: string | null;
  telegramConfigured: boolean;
  telegramMasked: string | null;
  model: string | null;
  // Owner-pairing: one-tap "Message your bot" deep link + ownership state.
  botUsername: string | null;
  ownerClaimed: boolean;
  telegramDeepLink: string | null;
};

type ModelOption = { id: string; family?: string; recommended?: boolean };

const FALLBACK_MODELS = [
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.3-codex",
  "gpt-5.1-codex",
  "gpt-5-codex",
  "gpt-5",
];

type AccordionId = "subscription" | "key" | "telegram";

export function HermesPanel({ onClose, autoFocusKey = false }: Props) {
  const [status, setStatus]     = useState<HermesStatus | null>(null);
  const [apiKey, setApiKey]     = useState("");
  const [tgToken, setTgToken]   = useState("");
  const [model, setModel]       = useState<string>("gpt-5.5");
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [savedAt, setSavedAt]   = useState<number | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(FALLBACK_MODELS.map((id) => ({ id })));
  const [modelsLive, setModelsLive] = useState(false);
  // Default-open the API-key accordion when the parent asked us to surface
  // the key field (clicked Brain in carousel with no key configured).
  const [openAccordion, setOpenAccordion] = useState<AccordionId | null>(autoFocusKey ? "key" : "telegram");
  const keyRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/config/hermes")
      .then((r) => r.json())
      .then((data: HermesStatus) => {
        setStatus(data);
        if (data.model) setModel(data.model);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    loadModels();
  }, []);

  useEffect(() => {
    if (autoFocusKey && !loading && openAccordion === "key") {
      const t = setTimeout(() => keyRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocusKey, loading, openAccordion]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadModels() {
    try {
      const res = await fetch("/api/config/openai-models");
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        setModelOptions(data.models);
        setModelsLive(true);
      }
    } catch { /* keep fallback */ }
  }

  async function handleSave() {
    const sentKey = apiKey.trim();
    const sentTg  = tgToken.trim();
    const sentModel = model && model !== status?.model ? model : "";
    if (!sentKey && !sentTg && !sentModel) {
      toast.error("Nothing to save");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/config/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: sentKey || undefined,
          telegramBotToken: sentTg || undefined,
          model: sentModel || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      setSavedAt(Date.now());
      setApiKey("");
      setTgToken("");
      try {
        const fresh = await fetch("/api/config/hermes").then((r) => r.json());
        setStatus(fresh);
        if (fresh.model) setModel(fresh.model);
      } catch { /* admin reloading */ }
      if (data.modelWriteError) {
        toast.warning(`Model not written: ${data.modelWriteError}`);
      } else if (data.providerSwitched) {
        toast.success("Saved — your bot will now reply using your OpenAI key");
      } else if (data.alsoUpdated === "rag") {
        toast.success("Saved — key also applied to Memory (it had no key)");
      } else {
        toast.success("Saved — Hermes Agent restarting");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleAccordion(id: AccordionId) {
    setOpenAccordion((prev) => (prev === id ? null : id));
  }

  type AccordionProps = { id: AccordionId; icon: React.ReactNode; label: string; status?: React.ReactNode; children: React.ReactNode };
  function Accordion({ id, icon, label, status, children }: AccordionProps) {
    const open = openAccordion === id;
    return (
      <div className="rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => toggleAccordion(id)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {icon}
          <span className="flex-1 text-left">{label}</span>
          {status}
        </button>
        {open && <div className="px-3 py-3 border-t border-border bg-muted/30 space-y-3">{children}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <Bot size={13} />
          Hermes Agent settings
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
            {/* Model selector — stays outside accordions because it's the primary
                control and applies regardless of which auth method is active. */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground">Default model</p>
                <span className="text-[9px] text-muted-foreground">
                  {modelsLive ? `${modelOptions.length} live · newest first` : "fallback list"}
                </span>
              </div>
              <div ref={modelRef} className="relative">
                <button type="button" onClick={() => setModelOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] border border-border rounded-md bg-background hover:bg-muted transition-colors">
                  <span className="font-mono">{model}</span>
                  <ChevronDown size={11} className="text-muted-foreground" />
                </button>
                {modelOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
                    {modelOptions.map((m) => (
                      <button key={m.id} type="button"
                        onClick={() => { setModel(m.id); setModelOpen(false); }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-left hover:bg-muted transition-colors ${m.id === model ? "text-primary" : "text-foreground"}`}>
                        <span className="font-mono flex-1">{m.id}</span>
                        {m.recommended && <span className="text-[9px] text-amber-500" title="Top of its family">★</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Written to <code className="px-1 rounded bg-muted">/root/.hermes/config.yaml</code> as <code className="px-1 rounded bg-muted">model:</code>.
              </p>
            </div>

            {/* Accordion — Telegram (primary path: talk to your bot) */}
            <Accordion
              id="telegram"
              icon={<Send size={11} className={status.telegramConfigured ? "text-green-500" : "text-muted-foreground"} />}
              label="Telegram bot token"
              status={status.telegramConfigured ? (
                <span className="flex items-center gap-1 text-[10px] text-green-500">
                  <CheckCircle size={10} />
                  <span className="font-mono">{status.telegramMasked}</span>
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">not set</span>
              )}
            >
              <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
                <p>
                  Brain has no built-in web chat — communication happens only through external
                  channels (Telegram, Discord, Slack, WhatsApp, Signal, SMS, CLI, …). Use the
                  field below to wire up a Telegram bot, or open <strong>Brain → Keys</strong>
                  panel in the left menu of the Hermes window to find the full list of supported
                  messengers and gateway options.
                </p>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Talk to Brain from your phone. In Telegram: message <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">@BotFather</a>,
                send <code className="px-1 py-0.5 rounded bg-muted">/newbot</code>, choose a name —
                BotFather replies with a token like <code className="px-1 py-0.5 rounded bg-muted">1234567:ABC…</code>.
              </p>
              <input
                type="password"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder={status.telegramConfigured ? "Paste new token to replace" : "1234567:ABC…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              {/* One-tap "Message your bot": opens the chat with your bot in
                  Telegram. Before ownership is claimed the link carries a
                  one-time secret — tapping Start auto-approves you as the owner,
                  so you never see a pairing code. After that it's just a handy
                  shortcut back to your bot. */}
              {status.telegramConfigured && status.telegramDeepLink && (
                <a
                  href={status.telegramDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-[#229ED9] text-white text-[11px] font-medium hover:opacity-90 transition-opacity"
                >
                  <Send size={12} />
                  {status.botUsername ? `Message @${status.botUsername}` : "Message your bot"}
                </a>
              )}
              {status.telegramConfigured && (
                status.ownerClaimed ? (
                  <p className="flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400">
                    <CheckCircle size={11} className="shrink-0" />
                    You are connected as the bot owner.
                  </p>
                ) : (
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Tap the button above and press <strong>Start</strong> in Telegram — that one tap
                    registers you as the owner. No codes, no approvals. If the bot still asks for a
                    pairing code, reload this panel and use the button (the old chat may be cached).
                  </p>
                )
              )}
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                <p className="flex items-start gap-1.5">
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  <span>
                    The bot can only reply once a model provider is connected (Subscription or OpenAI
                    key below). Until then it will recognize you but stay silent.
                  </span>
                </p>
              </div>
            </Accordion>

            {/* Accordion — Subscription (info-only) */}
            <Accordion id="subscription" icon={<Sparkles size={11} className="text-amber-500" />} label="Subscription via OpenAI Codex (recommended)">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Whenever possible use a <strong>subscription</strong> for Hermes rather than a raw
                API key — costs are far more predictable. We recommend <strong>OpenAI Codex</strong>;
                Anthropic Claude Code is supported as a fallback but can charge for some operations
                that Codex covers under the flat-rate subscription.
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                To sign in with your Codex subscription: open the Hermes window (Brain in the carousel),
                go to the <strong>Keys</strong> tab in its left menu, and pick <strong>OpenAI Codex →
                Sign in with browser</strong>. Follow the prompts — Hermes will store the OAuth
                credentials in <code className="px-1 rounded bg-muted">/root/.hermes</code> and use them
                automatically.
              </p>
            </Accordion>

            {/* Accordion 2 — OpenAI API key (existing) */}
            <Accordion
              id="key"
              icon={<KeyRound size={11} className={status.configured ? "text-green-500" : "text-yellow-500"} />}
              label="OpenAI API key (fallback)"
              status={status.configured ? (
                <span className="flex items-center gap-1 text-[10px] text-green-500">
                  <CheckCircle size={10} />
                  <span className="font-mono">{status.keyMasked}</span>
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">not set</span>
              )}
            >
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Used when no subscription is connected, and for memory recall. If <strong>Memory</strong>
                has no key, this one is applied there too automatically.
              </p>
              <input
                ref={keyRef}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={status.configured ? "Paste new key to replace" : "sk-…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </Accordion>

            {savedAt && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 space-y-1.5">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={12} /> Saved
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Changes take effect within 10 seconds while Hermes Agent restarts. If the embed
                  beside this panel still looks unchanged, reload the page.
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
          disabled={saving || (!apiKey.trim() && !tgToken.trim() && (!model || model === status?.model))}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {saving ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Saving…</span> : "Save"}
        </button>
      </div>
    </div>
  );
}
