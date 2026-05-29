"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { X, Shield, ShieldAlert, Loader2, Copy, CheckCircle, XCircle } from "lucide-react";

interface SecurityState {
  key: string;
  open: boolean;
  live: string | null;
  files: Array<{ file: string; value: string | null }>;
  recoveryCommand: string;
}

interface DomainState {
  custom_domain: string | null;
  domain_status: "idle" | "pending" | "active" | "error";
}

interface DnsRecord {
  host: string;
  resolved: string[];
  matchesServer: boolean;
  error: string | null;
}

interface DnsCheck {
  domain: string;
  serverIp: string | null;
  allOk: boolean;
  results: DnsRecord[];
}

export function SecurityPanel({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<SecurityState | null>(null);
  const [domain, setDomain] = useState<DomainState | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dns, setDns] = useState<DnsCheck | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/config/security").then((r) => r.json()),
      fetch("/api/config/domain").then((r) => r.json()).catch(() => null),
    ])
      .then(([sec, dom]) => {
        setState(sec);
        if (dom) setDomain({ custom_domain: dom.custom_domain ?? null, domain_status: dom.domain_status ?? "idle" });
      })
      .catch(() => toast.error("Failed to load status"))
      .finally(() => setLoading(false));
  }, []);

  const runDnsCheck = useCallback(async () => {
    if (!domain?.custom_domain) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/config/domain/dns-check?domain=${encodeURIComponent(domain.custom_domain)}`).then((r) => r.json());
      setDns(res);
    } catch {
      toast.error("DNS check failed");
    } finally {
      setChecking(false);
    }
  }, [domain?.custom_domain]);

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
      await new Promise((r) => setTimeout(r, 6000));
      try {
        const fresh = await fetch("/api/config/security").then((r) => r.json());
        setState(fresh);
      } catch { /* admin restarting */ }
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

  const hasDomain = !!domain?.custom_domain;
  const dnsAllOk = dns?.allOk === true;
  const switchToSecureEnabled = hasDomain && dnsAllOk;

  return (
    <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <Shield size={13} />
          Security mode
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {loading || !state ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : (
          <>
            {/* Current mode */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-foreground">Current mode</p>
              <div className="flex items-center gap-2 text-[11px]">
                {state.open ? (
                  <>
                    <ShieldAlert size={13} className="text-destructive" />
                    <span className="font-medium text-destructive">Open / Demo</span>
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

            {/* Switch-to-Secure preflight (only when currently Open) */}
            {state.open && (
              <div className="space-y-3">
                <p className="text-[11px] font-medium text-foreground">Preflight checks</p>

                {/* Domain check */}
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    {hasDomain ? <CheckCircle size={13} className="text-green-500" /> : <XCircle size={13} className="text-destructive" />}
                    <span className="font-medium text-foreground">Domain attached</span>
                    {hasDomain ? (
                      <span className="font-mono text-muted-foreground">{domain?.custom_domain}</span>
                    ) : (
                      <span className="text-muted-foreground">— attach one in Settings → Personal Domain first</span>
                    )}
                  </div>
                </div>

                {/* DNS records check */}
                {hasDomain && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-foreground">DNS records</p>
                      <button
                        onClick={runDnsCheck}
                        disabled={checking}
                        className="h-6 px-2.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                      >
                        {checking ? <span className="flex items-center gap-1.5"><Loader2 size={10} className="animate-spin" />Checking…</span> : (dns ? "Re-check" : "Run check")}
                      </button>
                    </div>
                    {dns?.serverIp && (
                      <p className="text-[10px] text-muted-foreground">
                        Server IP: <span className="font-mono text-foreground">{dns.serverIp}</span>. Each record below must resolve to this IP.
                      </p>
                    )}
                    {dns && (
                      <div className="space-y-1 text-[10px] font-mono">
                        {dns.results.map((r) => (
                          <div key={r.host} className="flex items-center gap-2">
                            {r.matchesServer ? <CheckCircle size={11} className="text-green-500 shrink-0" /> : <XCircle size={11} className="text-destructive shrink-0" />}
                            <span className="break-all text-foreground">{r.host}</span>
                            <span className="text-muted-foreground">→</span>
                            {r.error ? (
                              <span className="text-destructive">{r.error}</span>
                            ) : r.resolved.length === 0 ? (
                              <span className="text-destructive">no A-record</span>
                            ) : r.matchesServer ? (
                              <span className="text-green-500 break-all">{r.resolved.join(", ")}</span>
                            ) : (
                              <span className="text-destructive break-all">
                                {r.resolved.join(", ")} (expected {dns.serverIp})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recovery command (always shown) */}
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

            {/* Confirmation gate */}
            {confirming && (
              <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 space-y-2">
                <p className="text-[11px] font-medium text-yellow-600 dark:text-yellow-400">
                  Ready to enable Secure mode
                </p>
                <p className="text-[10px] text-muted-foreground">
                  After switching, all admin URLs will require sign-in via your authentication provider.
                  If sign-in fails — wrong OAuth callback, certificate issue, expired session secret — the admin
                  panel becomes inaccessible from the browser. The only way to revert without admin access is
                  the SSH terminal recovery command shown above.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode(false)}
                    disabled={applying}
                    className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[10px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    {applying ? <span className="flex items-center gap-1.5"><Loader2 size={10} className="animate-spin" />Switching…</span> : "Yes, enable Secure mode"}
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

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end gap-2">
        {state?.open ? (
          <button
            onClick={() => setConfirming(true)}
            disabled={!switchToSecureEnabled || applying || confirming}
            title={!hasDomain ? "Attach a domain first" : !dnsAllOk ? "Run the DNS check and resolve any failures" : undefined}
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
