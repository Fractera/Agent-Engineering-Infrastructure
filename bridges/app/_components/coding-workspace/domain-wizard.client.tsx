"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight, AlertTriangle,
  Globe, Shield, Upload, Sparkles, Rocket, ExternalLink, RefreshCw, HelpCircle, ShieldCheck,
} from "lucide-react";

type WizardState = {
  domain: string;
  serverIp: string | null;
  expectedHosts: string[];
  step1: { complete: boolean; missingHosts: string[] };
  step2: {
    complete: boolean;
    certSource: "auto" | "upload";
    certPath: string;
    certExists: boolean;
    certSans: string[];
    certExpiresAt: string | null;
    status?: string;
    error?: string | null;
    hosts?: { host: string; covered: boolean }[];
  };
  step3: { ready: boolean };
  step4: { complete: boolean };
  currentStep: 1 | 2 | 3 | 4 | 5;
};

type HealthResult = {
  host: string;
  dnsOk: boolean;
  resolved: string[];
  httpsStatus: number | null;
  certValid: boolean;
  error: string | null;
};

export function DomainWizard({ domain, onClose }: { domain: string; onClose: () => void }) {
  const [state, setState] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [openStep, setOpenStep] = useState<1 | 2 | 3 | 4 | 5 | null>(null);

  // Step 2 local choice — checkbox starts ON (auto Let's Encrypt).
  const [useAuto, setUseAuto]   = useState(true);
  const [issuing, setIssuing]   = useState(false);
  // Seconds left on the issue cooldown. While > 0 the button is locked and
  // shows a countdown so the user can't fire certbot several times by mistake.
  const [issueCountdown, setIssueCountdown] = useState(0);
  const issueTimers = useRef<{ tick?: ReturnType<typeof setInterval>; poll?: ReturnType<typeof setInterval> }>({});
  // "Why no password?" trust explainer toggle.
  const [showTrust, setShowTrust] = useState(false);
  const [pem, setPem]           = useState("");
  const [key, setKey]           = useState("");
  const [uploading, setUploading] = useState(false);

  // Step 3 last-run result lives in component state so we don't re-probe on
  // every wizard-state refresh.
  const [healthRun, setHealthRun] = useState<{ at: number; allOk: boolean; results: HealthResult[] } | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);

  // Step 4 activation
  const [activating, setActivating] = useState(false);
  // Step 5 — switch back to IP / demo mode (reversibility).
  const [deactivating, setDeactivating] = useState(false);
  // Step 5 — manual "email me the subdomain list". A user-initiated trigger
  // (the auto-email after activation can silently fail). Goes over the shared
  // server↔L1 secret + the signed-in user's email, so it does NOT depend on the
  // per-server token. Surfaces success/error explicitly (no silent failure).
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent]       = useState(false);
  const [emailRecipient, setEmailRecipient] = useState<string | null>(null);
  const [emailError, setEmailError]     = useState<string | null>(null);

  // Step 1 DNS re-check button state.
  const [checkingDns, setCheckingDns] = useState(false);

  const refresh = useCallback(async (): Promise<WizardState | null> => {
    try {
      const res = await fetch("/api/config/domain/wizard-state");
      const data: WizardState = await res.json();
      setState(data);
      if (data.step2?.certSource) setUseAuto(data.step2.certSource !== "upload");
      // Auto-open whichever step is currently active.
      setOpenStep((curr) => curr ?? data.currentStep);
      return data;
    } catch {
      toast.error("Failed to load domain status");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function toggle(step: 1 | 2 | 3 | 4 | 5) {
    setOpenStep((curr) => (curr === step ? null : step));
  }

  async function runDnsCheck() {
    setCheckingDns(true);
    try {
      // refresh() returns the freshly-fetched state — we must read from its
      // return value, not the `state` closure (which is stale until re-render).
      const data = await refresh();
      if (!data) return;
      if (data.step1.complete) {
        toast.success("All eight A-records resolve to this server");
      } else {
        const missing = data.step1.missingHosts;
        toast.warning(
          missing.length
            ? `Still not resolving: ${missing.join(", ")}. DNS can take a few minutes to propagate.`
            : "DNS not fully propagated yet — give it a few minutes and re-check.",
        );
      }
    } finally {
      setCheckingDns(false);
    }
  }

  function stopIssueTimers() {
    if (issueTimers.current.tick) clearInterval(issueTimers.current.tick);
    if (issueTimers.current.poll) clearInterval(issueTimers.current.poll);
    issueTimers.current = {};
  }
  // Clean up timers if the panel unmounts mid-issue.
  useEffect(() => () => stopIssueTimers(), []);

  async function issueAutoCert() {
    // Lock immediately so a double-click can't fire certbot twice.
    if (issuing || issueCountdown > 0) return;
    setIssuing(true);
    try {
      const res = await fetch("/api/config/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); setIssuing(false); return; }
      toast.success("Certificate issuance started — this takes 60–120 seconds");

      // Lock the button with a visible countdown while certbot runs server-side.
      const TOTAL = 120;
      setIssueCountdown(TOTAL);
      const start = Date.now();
      stopIssueTimers();
      issueTimers.current.tick = setInterval(() => {
        const left = Math.max(0, TOTAL - Math.floor((Date.now() - start) / 1000));
        setIssueCountdown(left);
        if (left <= 0 && issueTimers.current.tick) { clearInterval(issueTimers.current.tick); issueTimers.current.tick = undefined; }
      }, 1_000);

      // Poll wizard-state until the cert lands (complete) or certbot errors.
      // Read from refresh()'s return value, not the stale `state` closure.
      issueTimers.current.poll = setInterval(async () => {
        const fresh = await refresh();
        const timedOut = Date.now() - start > 180_000;
        if (fresh?.step2?.complete) {
          stopIssueTimers(); setIssueCountdown(0); setIssuing(false);
          toast.success("Certificate issued — covers all 8 hostnames");
        } else if (fresh?.step2?.status === "error") {
          stopIssueTimers(); setIssueCountdown(0); setIssuing(false);
          toast.error("Certificate issuance failed — see details in Step 2");
        } else if (timedOut) {
          stopIssueTimers(); setIssueCountdown(0); setIssuing(false);
          toast.warning("Still working… use “Refresh status” to check the result.");
        }
      }, 5_000);
    } catch {
      toast.error("Issuance failed");
      stopIssueTimers(); setIssueCountdown(0); setIssuing(false);
    }
  }

  async function uploadCert() {
    if (!pem.trim() || !key.trim()) { toast.error("Both certificate and key are required"); return; }
    setUploading(true);
    try {
      const res = await fetch("/api/config/domain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, fullchainPem: pem.trim(), privateKeyPem: key.trim() }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success("Certificate installed — verifying coverage…");
      setPem(""); setKey("");
      setTimeout(refresh, 3000);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function runHealthCheck() {
    setHealthChecking(true);
    try {
      const res = await fetch("/api/config/domain/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setHealthRun({ at: Date.now(), allOk: data.allOk, results: data.results });
      if (data.allOk) toast.success("All eight hostnames respond over HTTPS with valid certs");
      else toast.warning("Some hostnames still failing — see details below");
    } catch {
      toast.error("Health check failed");
    } finally {
      setHealthChecking(false);
    }
  }

  async function activate() {
    if (!confirm(`Activate Secure mode on ${domain}? You'll be redirected to https://admin.${domain} and need to sign in.`)) return;
    setActivating(true);
    try {
      const res = await fetch("/api/config/domain/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success("Switching — redirecting to your domain in 3 seconds…");
      // Give PM2 a beat to actually start serving on the new config before
      // we throw the browser at it.
      setTimeout(() => { window.location.href = data.redirectTo; }, 3000);
    } catch {
      toast.error("Activation failed");
    } finally {
      setActivating(false);
    }
  }

  async function deactivate() {
    if (!confirm(`Switch back to IP / demo mode?\n\n${domain} stays configured, but the project will be served over plain HTTP on its IP again and the admin demo session returns. You can re-activate Secure mode anytime.`)) return;
    setDeactivating(true);
    try {
      const res = await fetch("/api/config/domain/deactivate", { method: "POST" });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success("Switching back — redirecting to IP mode in a few seconds…");
      setTimeout(() => {
        window.location.href = state?.serverIp ? `http://${state.serverIp}:3002` : "/";
      }, 6000);
    } catch {
      toast.error("Switch back failed");
    } finally {
      setDeactivating(false);
    }
  }

  async function sendSubdomainEmail() {
    setEmailSending(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/config/domain/send-email", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setEmailError(data.error || `Failed (HTTP ${res.status})`);
        return;
      }
      setEmailRecipient(data.recipient ?? null);
      setEmailSent(true);
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "Network error");
    } finally {
      setEmailSending(false);
    }
  }

  if (loading || !state) {
    return (
      <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[12px] font-medium text-foreground flex items-center gap-2">
            <Globe size={13} /> Personal Domain
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">×</button>
        </div>
        <div className="flex items-center gap-2 p-4 text-[11px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  type StepProps = {
    n: 1 | 2 | 3 | 4 | 5;
    title: string;
    enabled: boolean;
    complete: boolean;
    children: React.ReactNode;
    icon: React.ReactNode;
  };
  function Step({ n, title, enabled, complete, children, icon }: StepProps) {
    const open = openStep === n;
    return (
      <div className={`rounded-md border ${complete ? "border-green-500/40 bg-green-500/5" : enabled ? "border-border" : "border-border opacity-50"}`}>
        <button
          type="button"
          onClick={() => enabled && toggle(n)}
          disabled={!enabled}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium transition-colors ${enabled ? "hover:bg-muted text-foreground" : "cursor-not-allowed text-muted-foreground"}`}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {complete ? <CheckCircle size={12} className="text-green-500" /> : icon}
          <span className="flex-1 text-left">Step {n} — {title}</span>
          {complete && <span className="text-[10px] text-green-500 font-medium">done</span>}
        </button>
        {open && enabled && (
          <div className="px-3 py-3 border-t border-border bg-muted/30 space-y-3">{children}</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-[12px] font-medium text-foreground flex items-center gap-2">
          <Globe size={13} /> Personal Domain — <span className="font-mono">{domain}</span>
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* STEP 1 — DNS A-records */}
        <Step n={1} title="DNS A-records" enabled={true} complete={state.step1.complete} icon={<Globe size={12} />}>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Add <strong>all eight</strong> A-records below at your DNS provider (your registrar's
            own panel, not Cloudflare). Each one points to the same IP: <span className="font-mono text-foreground">{state.serverIp ?? "…"}</span>.
          </p>
          <div className="rounded-md border border-border bg-background p-3 space-y-1 text-[10px] font-mono">
            <div className="grid gap-x-3 text-muted-foreground pb-1 border-b border-border" style={{ gridTemplateColumns: "3rem 5rem 1fr" }}>
              <span>Type</span><span>Name</span><span>Value</span>
            </div>
            {[
              { name: "@",        note: "site (apex)" },
              { name: "www",      note: "site (www alias)" },
              { name: "auth",     note: "sign-in" },
              { name: "admin",    note: "this panel" },
              { name: "data",     note: "media + db" },
              { name: "hermes",   note: "Brain" },
              { name: "lightrag", note: "Memory" },
              { name: "chat",     note: "Remote Command Post (chat)" },
            ].map(({ name, note }) => (
              <div key={name} className="grid gap-x-3 text-foreground" style={{ gridTemplateColumns: "3rem 5rem 1fr" }}>
                <span>A</span><span>{name}</span>
                <span className="break-all">{state.serverIp ?? "…"} <span className="text-muted-foreground font-sans">— {note}</span></span>
              </div>
            ))}
          </div>
          {state.step1.missingHosts.length > 0 && !state.step1.complete && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[10px] text-amber-700 dark:text-amber-300">
              Missing or wrong: {state.step1.missingHosts.map((h) => <code key={h} className="px-1 mx-0.5 rounded bg-muted">{h}</code>)}
            </div>
          )}
          <button onClick={runDnsCheck} disabled={checkingDns}
            className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">
            {checkingDns
              ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Checking DNS…</span>
              : state.step1.complete ? "Re-check DNS" : "I added the records — check DNS"}
          </button>
        </Step>

        {/* STEP 2 — Certificate (auto / upload) */}
        <Step n={2} title="SSL certificate" enabled={state.step1.complete} complete={state.step2.complete} icon={<Shield size={12} />}>
          {/* Trust explainer — answers the natural "why aren't you asking for
              my server password?" doubt. Issuance runs locally on the user's
              own server; we never connect in. */}
          <div className="rounded-md border border-border bg-muted/30">
            <button type="button" onClick={() => setShowTrust((v) => !v)}
              className="w-full flex items-center gap-1.5 px-2.5 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
              <HelpCircle size={12} className="text-primary shrink-0" />
              <span className="flex-1 text-left font-medium">Why don&rsquo;t we ask for your server password?</span>
              {showTrust ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {showTrust && (
              <div className="px-3 pb-3 pt-1 text-[10px] leading-relaxed text-muted-foreground space-y-2 border-t border-border">
                <p>
                  Issuing an SSL certificate traditionally requires logging into the server over SSH.
                  <strong className="text-foreground"> Fractera never does that.</strong> The admin panel
                  you&rsquo;re using right now runs as an application <strong className="text-foreground">on your own
                  server</strong> and issues the certificate locally (via <code className="px-1 rounded bg-muted">certbot</code>).
                  Nothing connects in from the outside, and we never receive or store your server password
                  — we keep it as <code className="px-1 rounded bg-muted">*****</code>.
                </p>
                <p className="flex items-start gap-1.5 text-foreground">
                  <ShieldCheck size={12} className="text-green-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Proof you can verify yourself:</strong> change your server&rsquo;s root password
                    right now. Certificate issuance will still work exactly the same — because Fractera runs
                    as your own application on your own machine and has no technical ability to reach into
                    your server or your data.
                  </span>
                </p>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-[11px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useAuto}
              onChange={(e) => setUseAuto(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-foreground">
              Use automatic Let&rsquo;s Encrypt certificate (free, recommended)
              <br />
              <span className="text-muted-foreground text-[10px]">Uncheck only if you need to install your own cert (regulated regions, EV/OV from a specific CA, etc.)</span>
            </span>
          </label>

          {/* Sub-2A — Auto issuance */}
          <div className={`rounded-md border ${useAuto ? "border-border" : "border-border opacity-40 pointer-events-none"} p-3 space-y-2`}>
            <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5"><Sparkles size={11} className="text-amber-500" /> Auto issuance</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              One certbot call issues a multi-SAN cert covering all 8 hostnames. Renewal runs
              automatically every ~60 days via the system <code className="px-1 rounded bg-muted">certbot.timer</code>.
            </p>
            {state.step2.certExists && state.step2.certSource === "auto" && (
              <p className="text-[10px] text-muted-foreground">
                Current cert: covers <strong>{state.step2.certSans.length}</strong> hostnames
                {state.step2.certExpiresAt && <> · expires <strong>{new Date(state.step2.certExpiresAt).toLocaleDateString()}</strong></>}
              </p>
            )}

            {/* Per-host coverage — like the Step 1 DNS list. Makes a partial
                cert (e.g. a host the user temporarily removed at the registrar)
                diagnosable per hostname instead of all-or-nothing. */}
            {state.step2.hosts && state.step2.hosts.length > 0 && (
              <div className="rounded-md border border-border bg-background p-2 space-y-1 text-[10px] font-mono">
                {state.step2.hosts.map((h) => (
                  <div key={h.host} className="flex items-center gap-2">
                    {h.covered
                      ? <CheckCircle size={11} className="text-green-500 shrink-0" />
                      : <XCircle size={11} className="text-destructive shrink-0" />}
                    <span className="break-all text-foreground flex-1">{h.host}</span>
                    <span className={h.covered ? "text-green-500" : "text-destructive"}>{h.covered ? "in cert" : "missing"}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={issueAutoCert} disabled={!useAuto || issuing || issueCountdown > 0}
              className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">
              {issuing || issueCountdown > 0
                ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Issuing… {issueCountdown > 0 ? `${issueCountdown}s` : ""}</span>
                : state.step2.complete ? "Re-issue certificate" : "Issue certificate"}
            </button>
            <button onClick={refresh} disabled={issuing || issueCountdown > 0} className="ml-2 text-[10px] text-muted-foreground hover:text-foreground underline disabled:opacity-40">Refresh status</button>

            {/* Last failed issuance — surfaced so the user isn't left guessing. */}
            {state.step2.status === "error" && state.step2.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[10px] leading-relaxed text-destructive">
                <p className="font-medium flex items-center gap-1.5"><XCircle size={11} /> Last issuance failed</p>
                <p className="mt-1 font-mono break-all whitespace-pre-wrap max-h-32 overflow-y-auto">{state.step2.error}</p>
                <p className="mt-1 text-muted-foreground">Usually one of the 8 hosts isn&rsquo;t resolving yet (check the list above / Step 1), then press &ldquo;Issue certificate&rdquo; again.</p>
              </div>
            )}
          </div>

          {/* Sub-2B — Upload your own */}
          <div className={`rounded-md border ${!useAuto ? "border-border" : "border-border opacity-40 pointer-events-none"} p-3 space-y-2`}>
            <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5"><Upload size={11} /> Upload your own</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Paste a PEM chain + private key. Must cover all 8 hostnames (multi-SAN) or include a
              wildcard <span className="font-mono">*.{domain}</span> alongside the apex.
              Accepts certs from any CA — including the RSA variant of the free МинЦифры certificate
              from Госуслуги. <strong>ГОСТ variant not supported</strong> (КриптоПро container, needs
              a separate gateway).
            </p>
            <div>
              <label className="text-[10px] text-foreground">Full chain (fullchain.pem)</label>
              <textarea value={pem} onChange={(e) => setPem(e.target.value)} disabled={useAuto}
                placeholder="-----BEGIN CERTIFICATE-----&#10;…&#10;-----END CERTIFICATE-----"
                className="w-full h-20 px-2 py-1 text-[10px] font-mono rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-[10px] text-foreground">Private key (privkey.pem)</label>
              <textarea value={key} onChange={(e) => setKey(e.target.value)} disabled={useAuto}
                placeholder="-----BEGIN PRIVATE KEY-----&#10;…&#10;-----END PRIVATE KEY-----"
                className="w-full h-20 px-2 py-1 text-[10px] font-mono rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <button onClick={uploadCert} disabled={useAuto || uploading || !pem.trim() || !key.trim()}
              className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">
              {uploading ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Installing…</span> : "Install uploaded certificate"}
            </button>
          </div>
        </Step>

        {/* STEP 3 — End-to-end check */}
        <Step n={3} title="End-to-end HTTPS check" enabled={state.step3.ready} complete={!!healthRun?.allOk} icon={<RefreshCw size={12} />}>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Final check: for each of the 8 hostnames we resolve DNS and open an HTTPS connection
            with strict cert validation. Any failure here means switching to Secure mode will
            break that endpoint.
          </p>
          <button onClick={runHealthCheck} disabled={healthChecking}
            className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">
            {healthChecking ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Checking…</span> : "Run final check"}
          </button>
          {healthRun && (
            <div className="rounded-md border border-border bg-background p-2 space-y-1 text-[10px] font-mono">
              {healthRun.results.map((r) => {
                const ok = r.dnsOk && r.certValid && r.httpsStatus !== null && r.httpsStatus >= 200 && r.httpsStatus < 500;
                return (
                  <div key={r.host} className="flex items-center gap-2">
                    {ok ? <CheckCircle size={11} className="text-green-500" /> : <XCircle size={11} className="text-destructive" />}
                    <span className="break-all text-foreground flex-1">{r.host}</span>
                    {!r.dnsOk && <span className="text-destructive">DNS</span>}
                    {r.dnsOk && !r.certValid && <span className="text-destructive">cert: {r.error}</span>}
                    {r.dnsOk && r.certValid && r.httpsStatus !== null && <span className="text-green-500">HTTP {r.httpsStatus}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </Step>

        {/* STEP 4 — Activate Secure mode */}
        <Step n={4} title="Activate Secure mode" enabled={!!healthRun?.allOk && !state.step4.complete} complete={state.step4.complete} icon={<Rocket size={12} />}>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed space-y-1.5">
            <p className="font-medium flex items-center gap-1.5"><AlertTriangle size={12} /> After clicking Activate:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>All admin URLs move from <code className="px-1 rounded bg-muted">http://&lt;ip&gt;:port</code> to <code className="px-1 rounded bg-muted">https://{domain}</code></li>
              <li>You&rsquo;ll be redirected to <code className="px-1 rounded bg-muted">https://admin.{domain}</code> in this tab</li>
              <li>Demo session ends — the first user to register becomes the new administrator</li>
              <li>A welcome email with the new URLs goes to your account email</li>
              <li>If anything breaks within 30 seconds, we automatically revert to IP-mode and you stay on this admin panel</li>
            </ul>
          </div>
          <button onClick={activate} disabled={activating}
            className="h-9 px-5 rounded-md bg-emerald-600 text-white text-[11px] font-medium disabled:opacity-40 hover:bg-emerald-700 transition-colors">
            {activating ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Activating…</span> : `Activate Secure mode on https://${domain}`}
          </button>
        </Step>

        {/* STEP 5 — Post-activation */}
        <Step n={5} title="You're on your domain" enabled={state.step4.complete} complete={state.step4.complete} icon={<CheckCircle size={12} className="text-green-500" />}>
          <p className="text-[11px] text-foreground leading-relaxed">
            <strong>✓ {domain}</strong> is live, secured by a <strong>{state.step2.certSource === "upload" ? "user-uploaded" : "Let's Encrypt"}</strong> certificate
            {state.step2.certExpiresAt && <> that expires <strong>{new Date(state.step2.certExpiresAt).toLocaleDateString()}</strong></>}.
          </p>
          {state.step2.certSource === "auto" && (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Auto-renews every ~60 days through the system <code className="px-1 rounded bg-muted">certbot.timer</code>.
              Manual renewal and email expiry alerts will ship in a future update.
            </p>
          )}
          <div className="flex gap-2">
            <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer"
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5">
              <ExternalLink size={11} /> Open live site
            </a>
            <button disabled
              title="Manual cert renewal ships in a future update"
              className="h-8 px-3 rounded-md border border-border text-[11px] text-muted-foreground opacity-40 cursor-not-allowed">
              Re-issue certificate <span className="ml-1 text-[9px] uppercase tracking-wider">coming soon</span>
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
              Email yourself the full list of your new HTTPS addresses (apex, admin, auth, data, Brain,
              Memory, and your <strong>chat</strong> Remote Command Post) — a handy reminder for later. Future
              server and certificate-expiry notices will arrive at your account email too.
            </p>
            {emailSent ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 text-[10px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                Email sent successfully{emailRecipient ? <> to <strong>{emailRecipient}</strong></> : ""}. Please
                check your Spam folder — if you find it there, move it to your inbox and mark “Not spam” so future
                notices arrive reliably.
              </div>
            ) : (
              <>
                <button onClick={sendSubdomainEmail} disabled={emailSending}
                  className="h-8 px-3 rounded-md border border-violet-500/40 text-violet-600 dark:text-violet-400 text-[11px] font-medium hover:bg-violet-500/10 disabled:opacity-40 transition-colors flex items-center gap-1.5">
                  {emailSending
                    ? <><Loader2 size={11} className="animate-spin" />Sending email…</>
                    : <><RefreshCw size={11} />Email me my subdomain list</>}
                </button>
                {emailError && (
                  <p className="mt-1.5 text-[10px] text-destructive leading-relaxed">{emailError}</p>
                )}
              </>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
              Need to roll back? You can return to plain-HTTP IP / demo mode at any time —
              your domain and certificate stay configured for re-activation.
            </p>
            <button onClick={deactivate} disabled={deactivating}
              className="h-8 px-3 rounded-md border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px] font-medium hover:bg-amber-500/10 disabled:opacity-40 transition-colors flex items-center gap-1.5">
              {deactivating
                ? <><Loader2 size={11} className="animate-spin" />Switching back…</>
                : <><AlertTriangle size={11} />Switch back to IP / demo mode</>}
            </button>
          </div>
        </Step>
      </div>
    </div>
  );
}
