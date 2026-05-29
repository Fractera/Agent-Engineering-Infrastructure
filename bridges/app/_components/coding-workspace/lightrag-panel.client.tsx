"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Brain, Loader2, Send, CheckCircle, AlertCircle, BookOpen, ChevronDown, RefreshCw } from "lucide-react";

// Fallback used only when /api/config/openai-models can't reach OpenAI
// (no key set yet, or upstream blocked). Source of truth for the canonical
// ids: developers.openai.com/api/docs/models/all (verified 2026-05).
// Order = preferred default first.
const FALLBACK_MODELS = [
  "gpt-5.4-mini",   // recommended default for embeddings+queries — cheap, current
  "gpt-5-mini",     // older but widely available
  "gpt-5.5",        // flagship, expensive
  "gpt-5.4",
  "gpt-5",
  "gpt-4.1-mini",   // last-gen fallback
  "gpt-4o-mini",    // legacy fallback
];

type ModelOption = { id: string; family?: string; recommended?: boolean };

export function LightRagPanel({ onClose }: { onClose: () => void }) {
  const [available, setAvailable]     = useState<boolean | null>(null);
  const [configured, setConfigured]   = useState(false);
  const [model, setModel]             = useState("gpt-5.4-mini");
  const [apiKey, setApiKey]           = useState("");
  const [saving, setSaving]           = useState(false);
  const [query, setQuery]             = useState("");
  const [querying, setQuerying]       = useState(false);
  const [answer, setAnswer]           = useState<string | null>(null);
  const [ingesting, setIngesting]     = useState(false);
  const [modelOpen, setModelOpen]     = useState(false);
  const [savedAt, setSavedAt]         = useState<number | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(FALLBACK_MODELS.map((id) => ({ id })));
  const [modelsLive, setModelsLive]   = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkStatus();
    loadConfig();
    loadModels();
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch("/api/rag/status");
      const data = await res.json();
      setAvailable(data.available === true);
    } catch {
      setAvailable(false);
    }
  }

  async function loadConfig() {
    try {
      const res = await fetch("/api/rag/config");
      const data = await res.json();
      setConfigured(data.configured === true);
      if (data.model) setModel(data.model);
    } catch {}
  }

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rag/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vars: { LLM_BINDING_API_KEY: apiKey.trim(), LLM_MODEL: model } }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfigured(true);
        setApiKey("");
        setSavedAt(Date.now());
        if (data.alsoUpdated === "hermes") {
          toast.success("Saved — key also applied to Brain (it had no key)");
        } else {
          toast.success("Saved — LightRAG restarting");
        }
      } else {
        toast.error(data.error ?? "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuery() {
    if (!query.trim()) return;
    setQuerying(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (data.available === false) {
        setAnswer("LightRAG is not available or not configured.");
      } else {
        setAnswer(data.response ?? data.result ?? JSON.stringify(data));
      }
    } catch {
      setAnswer("Query failed — check that LightRAG is running.");
    } finally {
      setQuerying(false);
    }
  }

  async function handleIngest() {
    setIngesting(true);
    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.available === false) {
        toast.error("LightRAG not available");
      } else {
        const count = data.inserted?.filter((r: { ok: boolean }) => r.ok).length ?? 0;
        toast.success(`Ingesting ${count} documents — this may take several minutes`);
      }
    } catch {
      toast.error("Ingest failed");
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="w-full h-full bg-background border-l border-border shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
        <Brain size={13} className="mr-2 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground flex-1">Knowledge Base</span>
        <div className="flex items-center gap-2 mr-3">
          {available === null && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
          {available === true  && <><span className="size-1.5 rounded-full bg-green-500" /><span className="text-[11px] text-green-500">Online</span></>}
          {available === false && <><span className="size-1.5 rounded-full bg-destructive" /><span className="text-[11px] text-destructive">Offline</span></>}
        </div>
        <button type="button" onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Not available */}
        {available === false && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertCircle size={13} className="text-destructive mt-0.5 shrink-0" />
            <div className="text-[11px] text-destructive leading-relaxed">
              LightRAG service is not running.<br />
              Run: <code className="font-mono bg-destructive/10 px-1 rounded">pm2 start fractera-rag</code>
            </div>
          </div>
        )}

        {/* Config section */}
        {available === true && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-foreground">OpenAI API Configuration</span>
              {configured && <span className="flex items-center gap-1 text-[10px] text-green-500"><CheckCircle size={10} />Configured</span>}
            </div>

            {/* Model selector — live list from OpenAI /v1/models when a key
                is set, otherwise the FALLBACK_MODELS guess. "★" = first model
                in its family per OpenAI (e.g. gpt-5 over gpt-5-mini). */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Model</span>
                <span className="text-[9px] text-muted-foreground">
                  {modelsLive ? `${modelOptions.length} live · sorted newest first` : "fallback list (set a key to load live)"}
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
            </div>

            {/* API key input */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                {configured ? "Update API Key" : "API Key (sk-...)"}
              </span>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder={configured ? "Enter new key to update" : "sk-..."}
                  className="flex-1 px-2.5 py-1.5 text-[11px] border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="button" onClick={handleSave} disabled={saving || !apiKey.trim()}
                  className="px-3 py-1.5 text-[11px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium">
                  {saving ? <Loader2 size={11} className="animate-spin" /> : "Save"}
                </button>
              </div>
            </div>

            {/* Ingest docs button */}
            {configured && (
              <button type="button" onClick={handleIngest} disabled={ingesting}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] border border-border rounded-md hover:bg-muted transition-colors text-foreground disabled:opacity-40">
                {ingesting ? <Loader2 size={11} className="animate-spin" /> : <BookOpen size={11} />}
                {ingesting ? "Loading docs…" : "Load project docs"}
              </button>
            )}

            {/* Post-save banner */}
            {savedAt && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 space-y-1.5">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={12} /> Saved
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Changes will take effect within 10 seconds while LightRAG restarts. If the embed
                  next to this panel still looks unchanged, reload the page.
                </p>
                <button onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-emerald-500/50 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                  <RefreshCw size={10} /> Reload page
                </button>
              </div>
            )}
          </div>
        )}

        {/* Query section */}
        {available === true && configured && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium text-foreground">Query Knowledge Base</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                placeholder="Ask about the project…"
                className="flex-1 px-2.5 py-1.5 text-[11px] border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="button" onClick={handleQuery} disabled={querying || !query.trim()}
                className="flex items-center justify-center size-[30px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                {querying ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              </button>
            </div>

            {answer !== null && (
              <div className="p-3 rounded-md bg-muted border border-border text-[11px] text-foreground leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {answer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
