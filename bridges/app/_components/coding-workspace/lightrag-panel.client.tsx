"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Brain, Loader2, Send, CheckCircle, AlertCircle, BookOpen, ChevronDown, RefreshCw, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
  const [powering, setPowering]       = useState(false);
  const [powerError, setPowerError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<{ id: string; status: string; source: string | null; summary: string; chunks: number }[] | null>(null);
  // What the confirmation dialog is about: one document, or the whole base.
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | { all: true } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [model, setModel]             = useState("gpt-5.4-mini");
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
    loadDocs();
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

  async function togglePower(on: boolean) {
    setPowering(true);
    setAvailable(null);
    try {
      const r = await fetch("/api/rag/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      });
      const d = await r.json();
      // Trust what the server observed, not what we asked for.
      setAvailable(r.ok ? d.running === true : false);
      if (!r.ok) setPowerError(String(d.error ?? "could not switch the service"));
      else setPowerError(null);
    } catch (e) {
      setAvailable(false);
      setPowerError(String((e as Error).message ?? e));
    } finally {
      setPowering(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const payload = "all" in pendingDelete ? { all: true } : { ids: [pendingDelete.id] };
      const r = await fetch("/api/rag/documents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        toast.success("all" in pendingDelete ? "Knowledge base emptied" : "Document removed");
        setPendingDelete(null);
        setTimeout(loadDocs, 1500);
      } else {
        toast.error(String(d.error ?? `Delete failed (${r.status})`));
      }
    } catch (e) {
      toast.error(String((e as Error).message ?? e));
    } finally {
      setDeleting(false);
    }
  }

  async function loadDocs() {
    try {
      const r = await fetch("/api/rag/documents", { cache: "no-store" });
      const d = await r.json();
      setDocs(d.available ? d.documents : []);
    } catch { setDocs([]); }
  }

  async function checkStatus() {
    try {
      const res = await fetch("/api/rag/status", { cache: "no-store" });
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

  // The OpenAI key is UNIFIED (step 199) — set once in OpenAI settings, it powers
  // Brain, Memory, and automations. This panel no longer takes a separate memory
  // key; it only picks the Memory model (a merge-only write that preserves the key).
  async function handleSaveModel() {
    setSaving(true);
    try {
      const res = await fetch("/api/rag/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vars: { LLM_MODEL: model } }),
      });
      const data = await res.json();
      if (data.ok) {
        setSavedAt(Date.now());
        toast.success("Memory model saved — LightRAG restarting");
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
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.available === false) {
        setAnswer(`The service answered ${res.status}${data?.error ? `: ${data.error}` : ""}.`);
      } else {
        setAnswer(data.response ?? data.result ?? JSON.stringify(data));
      }
    } catch (e) {
      // A thrown fetch means the REQUEST never completed — a dropped connection,
      // not a service that is down. Saying "check that LightRAG is running" sent
      // the owner looking in the wrong place while the service was healthy: a
      // graph query takes ~20s, and an admin restart in that window kills it.
      setAnswer(`The request did not complete: ${String((e as Error).message ?? e)}. A graph query takes about 20 seconds — if the admin service was restarting, just ask again.`);
    } finally {
      setQuerying(false);
    }
  }

  // (step 500) The knowledge base takes the OWNER'S documents. The old button
  // posted an empty body, which made the server index the slot's source code —
  // 285 .ts/.tsx/.json files, each costing an entity-extraction pass. It also
  // crashed here before it could say so: the server returns `inserted` as a
  // NUMBER, and this code called .filter() on it, so every run ended in the
  // catch below reporting a bare "Ingest failed" whatever actually happened.
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIngesting(true);
    let ok = 0;
    const failed: string[] = [];
    try {
      for (const file of Array.from(files)) {
        try {
          const text = await file.text();
          if (text.trim().length < 20) { failed.push(`${file.name} (empty)`); continue; }
          const res = await fetch("/api/rag/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, description: file.name }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) ok++;
          else failed.push(`${file.name}: ${data.error ?? res.status}`);
        } catch (e) {
          failed.push(`${file.name}: ${String((e as Error).message ?? e)}`);
        }
      }
      if (ok > 0) {
        toast.success(`${ok} document(s) accepted — the graph is built in the background, ask a question in a minute`);
        setTimeout(loadDocs, 3000);
      }
      if (failed.length) toast.error(failed.slice(0, 3).join("; "));
    } finally {
      setIngesting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="relative w-full h-full bg-background border-l border-border shadow-xl flex flex-col">
      {/* Confirmation. Deleting knowledge is cheap to click and expensive to undo:
          the entities and relations built from a document go with it, and getting
          them back means paying for the whole extraction pass again. So the dialog
          names WHAT is going and says what it costs. */}
      {pendingDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deleting && setPendingDelete(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-4 flex flex-col gap-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="text-destructive mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-foreground">
                  {"all" in pendingDelete ? "Empty the knowledge base?" : "Remove this document?"}
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed break-words">
                  {"all" in pendingDelete
                    ? `All ${docs?.length ?? 0} document(s) will be removed, together with every entity and relation built from them.`
                    : pendingDelete.label}
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  Loading it again means paying for the extraction pass a second time.
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setPendingDelete(null)}
                className="px-3 py-1.5 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40">
                Cancel
              </button>
              <button type="button" disabled={deleting} onClick={confirmDelete}
                className="px-3 py-1.5 text-[11px] rounded-md bg-destructive/90 text-white hover:bg-destructive transition-colors disabled:opacity-40 flex items-center gap-1.5">
                {deleting && <Loader2 size={11} className="animate-spin" />}
                {deleting ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
        <Brain size={13} className="mr-2 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground flex-1">Knowledge Base</span>
        <div className="flex items-center gap-2 mr-3">
          {available === null && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
          {available === true  && <><span className="size-1.5 rounded-full bg-green-500" /><span className="text-[11px] text-green-500">Online</span></>}
          {available === false && <><span className="size-1.5 rounded-full bg-destructive" /><span className="text-[11px] text-destructive">Offline</span></>}
          {/* (step 500) The architect decides whether this project uses agentic RAG.
              The installer always puts it on the server; this switch runs or stops
              the process, which is the same fact every other surface here reads. */}
          <Switch
            checked={available === true}
            disabled={available === null || powering}
            onCheckedChange={togglePower}
            aria-label="Agentic RAG"
          />
          {powering && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
        </div>
        <button type="button" onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {powerError && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertCircle size={13} className="text-destructive mt-0.5 shrink-0" />
            <div className="text-[11px] text-destructive leading-relaxed break-all">{powerError}</div>
          </div>
        )}

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

            {/* Unified key (step 199): no separate memory key here. Set the ONE
                OpenAI key in OpenAI settings — it powers Brain, Memory, and
                automations. This panel only picks the Memory model. */}
            {!configured && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/5 border border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                <AlertCircle size={11} className="shrink-0 mt-0.5" />
                <span>No OpenAI key yet. Set it in <strong>OpenAI settings</strong> — one key powers Brain, Memory, and automations.</span>
              </div>
            )}
            <button type="button" onClick={handleSaveModel} disabled={saving}
              className="self-start px-3 py-1.5 text-[11px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium">
              {saving ? <Loader2 size={11} className="animate-spin" /> : "Save model"}
            </button>

            {/* What the base actually holds. The model cannot answer "how many
                documents do you have" — that fact is not in any passage — so it
                is shown here instead of being asked of the graph. */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-foreground">
                  Knowledge base{docs ? ` — ${docs.length} document(s)` : ""}
                </span>
                <button type="button" onClick={loadDocs}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline">refresh</button>
                {docs && docs.length > 0 && (
                  <button type="button" onClick={() => setPendingDelete({ all: true })}
                    className="ml-auto text-[10px] text-destructive hover:underline">empty the base</button>
                )}
              </div>
              {docs === null && <span className="text-[10px] text-muted-foreground">not loaded yet</span>}
              {docs?.length === 0 && (
                <span className="text-[10px] text-muted-foreground">Empty — add documents below, then ask about what is in them.</span>
              )}
              {docs && docs.length > 0 && (
                <div className="rounded-md border border-border divide-y divide-border max-h-40 overflow-y-auto">
                  {docs.map((d) => (
                    <div key={d.id} className="px-2.5 py-1.5 flex items-start gap-2">
                      <span className={`mt-1 size-1.5 shrink-0 rounded-full ${d.status === "processed" ? "bg-green-500" : d.status === "failed" ? "bg-destructive" : "bg-amber-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-foreground truncate">{d.source ?? d.summary ?? d.id}</div>
                        <div className="text-[9px] text-muted-foreground">{d.status} · {d.chunks} chunk(s)</div>
                      </div>
                      <button type="button" aria-label="Remove document"
                        onClick={() => setPendingDelete({ id: d.id, label: d.source ?? d.summary ?? d.id })}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add documents to the knowledge base */}
            {configured && (
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".md,.txt,.json,.csv,.html,.htm,.yml,.yaml"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={ingesting}
                  className="flex items-center gap-2 px-3 py-1.5 text-[11px] border border-border rounded-md hover:bg-muted transition-colors text-foreground disabled:opacity-40 self-start">
                  {ingesting ? <Loader2 size={11} className="animate-spin" /> : <BookOpen size={11} />}
                  {ingesting ? "Adding…" : "Add documents"}
                </button>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Text formats for now: md, txt, json, csv, html, yaml. PDF and DOCX need text
                  extraction, which this build does not do — converting them outside and uploading
                  the text works today.
                </p>
              </div>
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
