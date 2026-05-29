"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Globe, CheckCircle, AlertCircle, Loader2, ExternalLink, ArrowLeft, ChevronDown, ChevronRight, Shield, Upload } from "lucide-react";

interface DomainConfig {
  custom_domain: string | null;
  domain_status: "idle" | "pending" | "active" | "error";
  domain_error: string | null;
  server_ip: string;
  fractera_host: string;
  cert_source?: "auto" | "upload";
  cert_expires_at?: string | null;
}

function normalizeDomain(raw: string): string {
  return raw.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase();
}

const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9\-.]+\.[a-zA-Z]{2,}$/;

export function DomainPanel({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<"input" | "dns">("input");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [sslInfoOpen, setSslInfoOpen]   = useState(false);
  const [uploadOpen, setUploadOpen]     = useState(false);
  const [fullchainPem, setFullchainPem] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");
  const [uploading, setUploading]       = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalized = normalizeDomain(input);
  const isValid = DOMAIN_RE.test(normalized);
  const isDirty = normalized !== (config?.custom_domain ?? "");

  useEffect(() => {
    fetch("/api/config/domain")
      .then((r) => r.json())
      .then((data: DomainConfig) => {
        setConfig(data);
        if (data.custom_domain) {
          setInput(data.custom_domain);
          setStep("dns");
        }
        if (data.domain_status === "pending") startPolling();
      })
      .finally(() => setLoading(false));
    return () => stopPolling();
  }, []);

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const r = await fetch("/api/config/domain/status").then((x) => x.json());
      if (r.domain_status !== "pending") {
        stopPolling();
        setConfig((prev) => prev ? { ...prev, domain_status: r.domain_status, domain_error: r.domain_error } : prev);
        if (r.domain_status === "active") toast.success("Custom domain is now active!");
        if (r.domain_status === "error")  toast.error("Domain setup failed");
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function handleNext() {
    setInput(normalized);
    setStep("dns");
  }

  async function handleApply() {
    if (!isValid || !isDirty) return;
    setApplying(true);
    const res = await fetch("/api/config/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: normalized }),
    }).then((r) => r.json()).catch(() => ({ error: "Network error" }));
    setApplying(false);
    if (res.error) { toast.error(res.error); return; }
    setConfig((prev) => prev ? { ...prev, custom_domain: normalized, domain_status: "pending", domain_error: null, cert_source: "auto" } : prev);
    startPolling();
  }

  async function handleUpload() {
    if (!isValid) { toast.error("Enter the domain name first"); return; }
    if (!fullchainPem.trim() || !privateKeyPem.trim()) { toast.error("Both certificate and private key are required"); return; }
    setUploading(true);
    const res = await fetch("/api/config/domain", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: normalized, fullchainPem: fullchainPem.trim(), privateKeyPem: privateKeyPem.trim() }),
    }).then((r) => r.json()).catch(() => ({ error: "Network error" }));
    setUploading(false);
    if (res.error) { toast.error(res.error); return; }
    setConfig((prev) => prev ? { ...prev, custom_domain: normalized, domain_status: "pending", domain_error: null, cert_source: "upload" } : prev);
    setFullchainPem(""); setPrivateKeyPem("");
    setUploadOpen(false);
    startPolling();
  }

  const status = config?.domain_status ?? "idle";

  return (
    <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <Globe size={13} />
          Personal Domain
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : (
          <>
            {/* Active status */}
            {status === "active" && config?.custom_domain && (
              <div className="flex items-center gap-2 text-[11px] text-green-500">
                <CheckCircle size={13} />
                <span>Active —</span>
                <a href={`https://${config.custom_domain}`} target="_blank" rel="noopener noreferrer"
                  className="underline flex items-center gap-1 hover:opacity-80">
                  {config.custom_domain} <ExternalLink size={10} />
                </a>
              </div>
            )}

            {/* Pending status */}
            {status === "pending" && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                Configuring SSL certificate... this may take up to 2 minutes.
              </div>
            )}

            {/* Error status */}
            {status === "error" && config?.domain_error && (
              <div className="flex items-start gap-2 text-[11px] text-destructive">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span className="break-all">{config.domain_error}</span>
              </div>
            )}

            {/* Step 1 — domain input */}
            {step === "input" && status !== "pending" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">Your domain</label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && isValid && handleNext()}
                  placeholder="myapp.com"
                  className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {input.trim() && !isValid && (
                  <p className="text-[10px] text-destructive">Enter a valid domain (e.g. myapp.com)</p>
                )}
              </div>
            )}

            {/* Step 2 — DNS instructions */}
            {step === "dns" && status !== "pending" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-foreground">Your domain</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-foreground">{normalized || input}</span>
                    <button
                      onClick={() => setStep("input")}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      change
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-foreground">DNS setup instructions</p>
                  <p className="text-[10px] text-muted-foreground">
                    Add <strong>all seven</strong> A-records below at your DNS provider, then click Apply.
                    Each points to the same IP — your domain routes the services (apex + www → site,
                    plus auth, admin, data, Brain, Memory subdomains) so each gets its own SSL certificate.
                  </p>

                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-[10px] font-mono">
                    <div className="grid gap-x-3 text-muted-foreground pb-1 border-b border-border" style={{ gridTemplateColumns: "3rem 5rem 1fr" }}>
                      <span>Type</span>
                      <span>Name</span>
                      <span>Value</span>
                    </div>
                    {[
                      { name: "@",        note: "site (apex)" },
                      { name: "www",      note: "site (www alias)" },
                      { name: "auth",     note: "sign-in" },
                      { name: "admin",    note: "this panel" },
                      { name: "data",     note: "media + db" },
                      { name: "hermes",   note: "Brain" },
                      { name: "lightrag", note: "Memory" },
                    ].map(({ name, note }) => (
                      <div key={name} className="grid gap-x-3 text-foreground" style={{ gridTemplateColumns: "3rem 5rem 1fr" }}>
                        <span>A</span>
                        <span>{name}</span>
                        <span className="break-all">{config?.server_ip ?? "…"} <span className="text-muted-foreground font-sans">— {note}</span></span>
                      </div>
                    ))}
                  </div>

                  {/* Cloudflare warning */}
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    <strong>We recommend NOT using Cloudflare DNS</strong> for these records.
                    Cloudflare proxies your traffic through their network — that adds a third-party
                    dependency, occasional connectivity issues, and an extra layer between your users
                    and your server. Use your registrar's own DNS panel directly (Namecheap, Porkbun,
                    GoDaddy, etc.) wherever possible.
                  </div>

                  {/* Registrar note */}
                  <p className="text-[10px] text-muted-foreground">
                    Some registrars use different labels:{" "}
                    <span className="font-mono">Name</span> may be called{" "}
                    <span className="font-mono">Host</span> or{" "}
                    <span className="font-mono">Record</span>;{" "}
                    <span className="font-mono">Value</span> may be called{" "}
                    <span className="font-mono">Answer</span> or{" "}
                    <span className="font-mono">Points to</span>.
                  </p>

                  {/* Propagation note */}
                  <p className="text-[10px] text-muted-foreground">
                    DNS propagation may take up to 24h. Once all seven records resolve to your server,
                    click <strong>Apply</strong> and Fractera will request a free SSL certificate from
                    Let&rsquo;s Encrypt for all seven hostnames in one go.
                  </p>
                </div>

                {/* Accordion 1 — what about SSL certificates? */}
                <button
                  type="button"
                  onClick={() => setSslInfoOpen((v) => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-foreground rounded-md border border-border hover:bg-muted transition-colors"
                >
                  {sslInfoOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <Shield size={11} />
                  <span className="flex-1 text-left">About SSL certificates</span>
                </button>
                {sslInfoOpen && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                    <p>
                      <strong>Don&rsquo;t buy an SSL certificate from your domain registrar.</strong> Registrars
                      typically up-sell SSL at $30&ndash;$80/year &mdash; you don&rsquo;t need it. Fractera
                      issues a free Let&rsquo;s Encrypt certificate for you the moment you click Apply,
                      and renews it automatically every ~60 days through the system certbot cron.
                    </p>
                    <p>
                      For restricted regions (e.g. Russia, Iran) where Let&rsquo;s Encrypt&rsquo;s
                      ACME server isn&rsquo;t reachable, or for compliance scenarios that require an
                      EV/OV cert from a specific CA, use the &ldquo;Upload your own certificate&rdquo;
                      panel below to install your own certificate instead.
                    </p>
                  </div>
                )}

                {/* Accordion 2 — upload custom certificate */}
                <button
                  type="button"
                  onClick={() => setUploadOpen((v) => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-foreground rounded-md border border-border hover:bg-muted transition-colors"
                >
                  {uploadOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <Upload size={11} />
                  <span className="flex-1 text-left">Upload your own certificate</span>
                </button>
                {uploadOpen && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Paste the full certificate chain (PEM) and the matching private key. The chain
                      must cover all seven hostnames listed above &mdash; either as Subject Alternative
                      Names on one cert, or as a single wildcard cert (<span className="font-mono">*.{normalized || "yourdomain.com"}</span>) plus the apex.
                      Fractera writes them to <span className="font-mono">/etc/fractera/certs/&lt;domain&gt;/</span> and reloads nginx.
                    </p>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-foreground">Full chain (fullchain.pem)</label>
                      <textarea
                        value={fullchainPem}
                        onChange={(e) => setFullchainPem(e.target.value)}
                        placeholder="-----BEGIN CERTIFICATE-----&#10;…&#10;-----END CERTIFICATE-----"
                        className="w-full h-24 px-2 py-1.5 text-[10px] font-mono rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-foreground">Private key (privkey.pem)</label>
                      <textarea
                        value={privateKeyPem}
                        onChange={(e) => setPrivateKeyPem(e.target.value)}
                        placeholder="-----BEGIN PRIVATE KEY-----&#10;…&#10;-----END PRIVATE KEY-----"
                        className="w-full h-24 px-2 py-1.5 text-[10px] font-mono rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={!isValid || !fullchainPem.trim() || !privateKeyPem.trim() || uploading}
                      className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                    >
                      {uploading ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Uploading…</span> : "Install uploaded certificate"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
        {step === "dns" && status !== "pending" ? (
          <>
            <button
              onClick={() => setStep("input")}
              className="flex items-center gap-1 h-8 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={11} /> Back
            </button>
            <button
              onClick={handleApply}
              disabled={!isValid || !isDirty || applying}
              className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {applying ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Applying…</span> : "Apply"}
            </button>
          </>
        ) : (
          <div className="flex items-center justify-end w-full">
            <button
              onClick={handleNext}
              disabled={!isValid || status === "pending"}
              className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Next step →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
