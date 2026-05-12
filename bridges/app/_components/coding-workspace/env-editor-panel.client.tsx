"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, AlertTriangle, X, Lock, Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EnvEntry = { key: string; value: string; isNew: boolean };
type Props = { onClose: () => void };

const WEAK_SECRET_MAX_LEN = 10;
const THEME_OPTIONS = ["light", "dark", "system"];

// Переменные, изменение которых сломает проект безвозвратно
const LOCKED_KEYS = new Set([
  "DATABASE_URL",
  "COOKIE_DOMAIN",
  "AUTH_TRUST_HOST",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_ADMIN_URL",
  "NEXT_PUBLIC_AUTH_URL",
  "ALLOWED_ORIGINS",
]);

const LOCK_REASONS: Record<string, string> = {
  DATABASE_URL:         "Path to the auth database. Changing it makes all existing data inaccessible.",
  COOKIE_DOMAIN:        "Session cookie domain. Wrong value will lock out all users immediately.",
  AUTH_TRUST_HOST:      "Required when running behind an nginx reverse proxy. Disabling it breaks all auth flows.",
  NEXTAUTH_URL:         "Must exactly match the deployment URL. Changing it breaks OAuth callbacks and redirects.",
  NEXT_PUBLIC_ADMIN_URL:"URL of the admin panel (bridges). Used by the browser for redirects — changing it breaks navigation.",
  NEXT_PUBLIC_AUTH_URL: "URL of the auth service. All login/logout requests go here — changing it breaks authentication.",
  ALLOWED_ORIGINS:      "Comma-separated list of domains allowed CORS access to the auth service. Wrong value may block cross-domain requests.",
};

// Editable keys with informational tooltip
const INFO_TIPS: Record<string, string> = {
  AUTH_SECRET:   "Secret key used to sign JWT tokens and sessions. Must be a random string of at least 32 characters. Changing it invalidates all active sessions — all users will be logged out.",
  COOKIE_SECURE: "true = cookie is sent over HTTPS only (required on production). false = also sent over HTTP (for local dev only). Must be true when running behind nginx with SSL.",
};

function isLocked(key: string) { return LOCKED_KEYS.has(key); }
function infoTip(key: string): string | null { return INFO_TIPS[key] ?? null; }

function isSecret(key: string) {
  return key.includes("TOKEN") || key.includes("KEY") || key.includes("SECRET");
}

function isThemeKey(key: string) {
  return key === "NEXT_PUBLIC_DEFAULT_THEME";
}

export function EnvEditorPanel({ onClose }: Props) {
  const [entries, setEntries] = useState<EnvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config/env")
      .then((r) => r.json())
      .then((data) => {
        const vars = (data.vars ?? {}) as Record<string, string>;
        const loaded: EnvEntry[] = Object.entries(vars).map(([key, value]) => ({ key, value, isNew: false }));
        const existingKeys = new Set(loaded.map((e) => e.key));
        const gitDefaults = ["GIT_REPO_URL", "GIT_TOKEN"]
          .filter((k) => !existingKeys.has(k))
          .map((k) => ({ key: k, value: "", isNew: false }));
        setEntries([...loaded, ...gitDefaults]);
      })
      .catch(() => setError("Failed to load environment variables."))
      .finally(() => setLoading(false));
  }, []);

  function updateValue(idx: number, val: string) {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, value: val } : e));
    setSaved(false);
  }

  function updateKey(idx: number, val: string) {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, key: val } : e));
    setSaved(false);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
    setSaved(false);
  }

  function addEntry() {
    setEntries((prev) => [...prev, { key: "", value: "", isNew: true }]);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const vars: Record<string, string> = {};
    for (const { key, value } of entries) {
      if (key.trim()) vars[key.trim()] = value;
    }
    try {
      const res = await fetch("/api/config/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaved(true);
      setEntries((prev) => prev.map((e) => ({ ...e, isNew: false })));
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const authSecret = entries.find((e) => e.key === "AUTH_SECRET")?.value ?? "";
  const weakSecret = authSecret.length > 0 && authSecret.length < WEAK_SECRET_MAX_LEN;

  return (
    <div style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }}
      className="bg-background flex flex-col">

      {/* Header */}
      <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground flex-1">Environment Variables</span>
        <a
          href="/api/config/env-export"
          download=".env.local"
          title="Download .env.local for local development"
          className="flex items-center gap-1 mr-2 px-2 h-6 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download size={11} />
          <span className="font-mono">.env.local</span>
        </a>
        <button type="button" onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <X size={13} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs gap-2">
          <Loader2 size={13} className="animate-spin" />Loading…
        </div>
      ) : (
        <>
          {weakSecret && (
            <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-[11px] text-destructive">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span><strong>AUTH_SECRET</strong> is too short (min {WEAK_SECRET_MAX_LEN} chars). Generate one at{" "}
                <a href="https://generate-secret.vercel.app/32" target="_blank" rel="noopener noreferrer" className="underline">generate-secret.vercel.app</a>.
              </span>
            </div>
          )}

          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-muted border border-border px-3 py-2 text-[11px] text-muted-foreground">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-orange-400" />
            <span>Changes take effect after a server restart. Changing <strong>AUTH_SECRET</strong> invalidates all sessions.</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
            {entries.map((entry, idx) => {
              const locked = isLocked(entry.key);
              const secret = isSecret(entry.key);
              const theme  = isThemeKey(entry.key);
              const weak   = entry.key === "AUTH_SECRET" && weakSecret;

              const tip = infoTip(entry.key);

              return (
                <div key={idx} className={`flex items-center gap-2 ${locked ? "opacity-60" : ""}`}>
                  {entry.isNew ? (
                    <Input
                      type="text"
                      value={entry.key}
                      onChange={(e) => updateKey(idx, e.target.value)}
                      placeholder="NEW_KEY"
                      className="w-52 shrink-0 text-[11px] font-mono"
                    />
                  ) : (
                    <span className={`w-52 shrink-0 h-8 flex items-center gap-1.5 px-2.5 text-[11px] font-mono rounded-lg border text-foreground ${locked ? "border-amber-500/40 bg-amber-500/5" : "border-border"}`}>
                      <span className="flex-1 truncate">{entry.key}</span>
                      {tip && (
                        <span title={tip} className="shrink-0 text-blue-400/70 cursor-help">
                          <Info size={10} />
                        </span>
                      )}
                    </span>
                  )}

                  {locked ? (
                    <Input
                      type={secret ? "password" : "text"}
                      value={entry.value}
                      readOnly
                      className="flex-1 text-[11px] font-mono cursor-not-allowed bg-muted/30 text-muted-foreground"
                    />
                  ) : theme ? (
                    <select
                      value={entry.value}
                      onChange={(e) => updateValue(idx, e.target.value)}
                      className="flex-1 h-8 rounded-lg border border-border bg-muted px-2.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    >
                      {THEME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <Input
                      type={secret ? "password" : "text"}
                      value={entry.value}
                      onChange={(e) => updateValue(idx, e.target.value)}
                      className={`flex-1 text-[11px] font-mono ${
                        weak
                          ? "border-destructive/50 bg-destructive/5 text-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                          : ""
                      }`}
                    />
                  )}

                  {locked ? (
                    <div
                      title={LOCK_REASONS[entry.key] ?? "Эта переменная защищена от изменений"}
                      className="shrink-0 flex items-center justify-center size-7 rounded text-amber-500/70 cursor-help"
                    >
                      <Lock size={11} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeEntry(idx)}
                      className="shrink-0 flex items-center justify-center size-7 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            <Button
              variant="ghost"
              size="xs"
              onClick={addEntry}
              className="mt-2 justify-start text-muted-foreground"
            >
              <Plus size={12} />Add variable
            </Button>
          </div>

          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between shrink-0">
            {error && <span className="text-[11px] text-destructive">{error}</span>}
            {saved && !error && <span className="text-[11px] text-green-500">Saved. Restart server to apply.</span>}
            {!error && !saved && <span />}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={11} className="animate-spin" />Saving…</> : "Save & apply"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
