"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Bot, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

type Props = {
  onClose: () => void;
  autoFocusKey?: boolean;
};

type HermesStatus = {
  configured: boolean;
  keyMasked: string | null;
  telegramConfigured: boolean;
  telegramMasked: string | null;
};

export function HermesPanel({ onClose, autoFocusKey = false }: Props) {
  const [status, setStatus]     = useState<HermesStatus | null>(null);
  const [apiKey, setApiKey]     = useState("");
  const [tgToken, setTgToken]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [savedAt, setSavedAt]   = useState<number | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/config/hermes")
      .then((r) => r.json())
      .then((data: HermesStatus) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (autoFocusKey && !loading) {
      const t = setTimeout(() => keyRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocusKey, loading]);

  async function handleSave() {
    if (!apiKey.trim() && !tgToken.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/config/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          telegramBotToken: tgToken.trim() || undefined,
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
      // Refresh status without trusting the in-flight admin restart.
      try {
        const fresh = await fetch("/api/config/hermes").then((r) => r.json());
        setStatus(fresh);
      } catch { /* admin reloading */ }
      if (data.alsoUpdated === "rag") {
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {loading || !status ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : (
          <>
            {/* OpenAI key */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-medium text-foreground flex-1">OpenAI API key</p>
                {status.configured ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <CheckCircle size={10} />
                    <span className="font-mono">{status.keyMasked}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-yellow-500">
                    <AlertCircle size={10} /> not set
                  </span>
                )}
              </div>
              <input
                ref={keyRef}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={status.configured ? "Paste new key to replace" : "sk-…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Used as a fallback when no AI subscription is connected, and for memory recall.
                If Memory has no key, this one is applied there too automatically.
              </p>
            </div>

            {/* Telegram bot token */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-medium text-foreground flex-1">Telegram bot token</p>
                {status.telegramConfigured ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <CheckCircle size={10} />
                    <span className="font-mono">{status.telegramMasked}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">optional</span>
                )}
              </div>
              <input
                type="password"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder={status.telegramConfigured ? "Paste new token to replace" : "1234567:ABC…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Talk to Hermes from your phone. Get a token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">@BotFather</a> in Telegram:
                send <code className="px-1 py-0.5 rounded bg-muted">/newbot</code>, pick a name — BotFather replies with a token like <code className="px-1 py-0.5 rounded bg-muted">1234567:ABC…</code>.
              </p>
            </div>

            {savedAt && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 space-y-1.5">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={12} /> Saved
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Changes will take effect within 10 seconds while Hermes Agent restarts. If the embed
                  next to this panel still looks unchanged, reload the page.
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
          disabled={(!apiKey.trim() && !tgToken.trim()) || saving}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {saving ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Saving…</span> : "Save"}
        </button>
      </div>
    </div>
  );
}
