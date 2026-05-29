"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Bot, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type Props = {
  onClose: () => void;
  autoFocusKey?: boolean;
};

export function HermesPanel({ onClose, autoFocusKey = false }: Props) {
  const [configured, setConfigured] = useState(false);
  const [keyMasked, setKeyMasked]   = useState<string | null>(null);
  const [apiKey, setApiKey]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/config/hermes")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(data.configured === true);
        setKeyMasked(data.keyMasked ?? null);
      })
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
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/config/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      setConfigured(true);
      setKeyMasked(`${apiKey.trim().slice(0, 7)}…${apiKey.trim().slice(-4)}`);
      setApiKey("");
      if (data.alsoUpdated === "rag") {
        toast.success("Key saved — also applied to Company Memory (it had no key)");
      } else {
        toast.success("Key saved — Hermes Agent restarting");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }}
      className="flex flex-col bg-background border-t border-border"
    >
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
        {loading ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-foreground">Status</p>
              <div className="flex items-center gap-2 text-[11px]">
                {configured ? (
                  <>
                    <CheckCircle size={13} className="text-green-500" />
                    <span className="text-green-500 font-medium">Configured</span>
                    {keyMasked && <span className="text-muted-foreground font-mono">{keyMasked}</span>}
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} className="text-yellow-500" />
                    <span className="text-yellow-500 font-medium">No key set</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              <p>
                Hermes uses this OpenAI API key when no AI subscription is connected.
                It's also used to drive memory recall and background tasks.
              </p>
              <p>
                If <strong>Company Memory</strong> already has a key, this field will be
                filled with the same value the next time you save it there — you can leave
                this empty and rely on Memory's key, or paste a different one if you want
                Hermes and Memory to use separate keys.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-foreground">OpenAI API key</label>
              <input
                ref={keyRef}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={configured ? "Paste a new key to replace the current one" : "sk-…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={!apiKey.trim() || saving}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {saving ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Saving…</span> : "Save key"}
        </button>
      </div>
    </div>
  );
}
