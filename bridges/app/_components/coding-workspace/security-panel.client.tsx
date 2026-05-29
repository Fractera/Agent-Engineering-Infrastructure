"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Shield, ShieldAlert, Loader2, Copy, CheckCircle } from "lucide-react";

interface SecurityState {
  key: string;
  open: boolean;
  live: string | null;
  files: Array<{ file: string; value: string | null }>;
  recoveryCommand: string;
}

export function SecurityPanel({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<SecurityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/config/security")
      .then((r) => r.json())
      .then((data: SecurityState) => setState(data))
      .catch(() => toast.error("Failed to load security status"))
      .finally(() => setLoading(false));
  }, []);

  async function setMode(open: boolean) {
    setApplying(true);
    try {
      const res = await fetch("/api/config/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open }),
      }).then((r) => r.json());
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(open ? "Switching to Open mode — services reloading…" : "Switching to Secure mode — services reloading…");
      // pm2 reload runs detached on the server (~5 sec). Wait, then re-fetch.
      await new Promise((r) => setTimeout(r, 6000));
      try {
        const fresh = await fetch("/api/config/security").then((r) => r.json());
        setState(fresh);
      } catch {
        // Admin process may still be restarting — user can refresh manually.
      }
      setConfirming(false);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setApplying(false);
    }
  }

  async function copyRecovery() {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(state.recoveryCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div
      style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }}
      className="flex flex-col bg-background border-t border-border"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <Shield size={13} />
          Security mode
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {loading || !state ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-foreground">Current mode</p>
              <div className="flex items-center gap-2 text-[11px]">
                {state.open ? (
                  <>
                    <ShieldAlert size={13} className="text-yellow-500" />
                    <span className="font-medium text-yellow-500">Open / Demo</span>
                    <span className="text-muted-foreground">— no authentication required</span>
                  </>
                ) : (
                  <>
                    <Shield size={13} className="text-green-500" />
                    <span className="font-medium text-green-500">Secure</span>
                    <span className="text-muted-foreground">— sign-in required</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              {state.open ? (
                <>
                  <p>
                    This server runs in <strong>open demo mode</strong> because no domain is attached
                    yet. Anyone with the server IP can access the admin panel and all platform services.
                  </p>
                  <p>
                    Switching to <strong>Secure mode</strong> will require all visitors to sign in via
                    the authentication provider you configured (Google OAuth or email).
                  </p>
                  <p className="flex items-start gap-1.5 text-yellow-600 dark:text-yellow-500">
                    <ShieldAlert size={12} className="shrink-0 mt-0.5" />
                    <span>
                      <strong>Before switching:</strong> verify that you can sign in successfully using
                      the configured provider. If sign-in fails after switching, you will be locked out
                      and will need to restore demo mode from the server terminal (command below).
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    This server is in <strong>Secure mode</strong>. Every request to the admin panel
                    and data service is gated by a valid session cookie.
                  </p>
                  <p>
                    Switch back to <strong>Open / Demo mode</strong> if you need to test or demo the
                    server without sign-in. This will make the admin panel accessible to anyone with
                    the server IP or domain.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-foreground">Terminal recovery command</p>
              <p className="text-[10px] text-muted-foreground">
                Run this over SSH if you ever lock yourself out of Secure mode.
              </p>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-[10px] font-mono text-foreground whitespace-pre-wrap break-all">
                {state.recoveryCommand}
              </div>
              <button
                onClick={copyRecovery}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <><CheckCircle size={10} /> Copied</> : <><Copy size={10} /> Copy command</>}
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-foreground">Env files updated by toggle</p>
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-[10px] font-mono text-muted-foreground">
                {state.files.map((f) => (
                  <div key={f.file} className="flex items-center justify-between gap-2">
                    <span className="break-all">{f.file}</span>
                    <span className={f.value === "true" ? "text-yellow-500" : f.value === "false" ? "text-green-500" : ""}>
                      {f.value ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {confirming && (
              <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 space-y-2">
                <p className="text-[11px] font-medium text-yellow-600 dark:text-yellow-400">
                  Are you sure?
                </p>
                <p className="text-[10px] text-muted-foreground">
                  After switching to Secure mode you must sign in to use the admin panel. If
                  sign-in fails, recover demo mode from the terminal command above.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode(false)}
                    disabled={applying}
                    className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[10px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    {applying ? <span className="flex items-center gap-1.5"><Loader2 size={10} className="animate-spin" />Switching…</span> : "Yes, switch to Secure"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={applying}
                    className="h-7 px-3 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end gap-2">
        {state?.open ? (
          <button
            onClick={() => setConfirming(true)}
            disabled={applying || confirming}
            className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Switch to Secure mode
          </button>
        ) : (
          <button
            onClick={() => setMode(true)}
            disabled={applying}
            className="h-8 px-4 rounded-md border border-border text-[11px] text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            {applying ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Switching…</span> : "Switch back to Open / Demo"}
          </button>
        )}
      </div>
    </div>
  );
}
