"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Globe, CheckCircle, AlertCircle, Loader2, ExternalLink, ArrowLeft } from "lucide-react";

interface DomainConfig {
  custom_domain: string | null;
  domain_status: "idle" | "pending" | "active" | "error";
  domain_error: string | null;
  server_ip: string;
  fractera_host: string;
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
    setConfig((prev) => prev ? { ...prev, custom_domain: normalized, domain_status: "pending", domain_error: null } : prev);
    startPolling();
  }

  const status = config?.domain_status ?? "idle";
  const fracteraHost = config?.fractera_host || null;

  return (
    <div style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }}
      className="flex flex-col bg-background border-t border-border">

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
                    Add <strong>one</strong> of the following records at your DNS provider, then click Apply.
                  </p>

                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3 text-[10px] font-mono">
                    {/* Option A */}
                    <div>
                      <p className="text-[10px] font-sans text-muted-foreground mb-2">Option A — root domain</p>
                      <div className="grid gap-x-3 text-foreground" style={{ gridTemplateColumns: "3rem 2rem 1fr" }}>
                        <span className="text-muted-foreground">Type</span>
                        <span className="text-muted-foreground">Name</span>
                        <span className="text-muted-foreground">Value</span>
                        <span>A</span>
                        <span>@</span>
                        <span className="break-all">{config?.server_ip ?? "…"}</span>
                      </div>
                    </div>

                    {/* Option B */}
                    <div className="border-t border-border pt-3">
                      <p className="text-[10px] font-sans text-muted-foreground mb-2">Option B — www redirect</p>
                      <div className="grid gap-x-3 text-foreground" style={{ gridTemplateColumns: "3rem 2rem 1fr" }}>
                        <span className="text-muted-foreground">Type</span>
                        <span className="text-muted-foreground">Name</span>
                        <span className="text-muted-foreground">Value</span>
                        <span>CNAME</span>
                        <span>www</span>
                        <span className="break-all">{normalized || input || "myapp.com"}</span>
                      </div>
                    </div>
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
                    DNS propagation may take up to 24h.
                    {fracteraHost && (
                      <> Admin, Auth, and Data services remain on{" "}
                        <span className="font-mono">{fracteraHost}</span>.
                      </>
                    )}
                  </p>
                </div>
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
