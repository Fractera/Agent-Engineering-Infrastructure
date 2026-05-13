"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Globe, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";

interface DomainConfig {
  custom_domain: string | null;
  domain_status: "idle" | "pending" | "active" | "error";
  domain_error: string | null;
  server_ip: string;
  fractera_host: string;
}

export function DomainPanel({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9\-.]+\.[a-zA-Z]{2,}$/;
  const isValid = DOMAIN_RE.test(input.trim());
  const isDirty = input.trim() !== (config?.custom_domain ?? "");

  useEffect(() => {
    fetch("/api/config/domain")
      .then((r) => r.json())
      .then((data: DomainConfig) => {
        setConfig(data);
        setInput(data.custom_domain ?? "");
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

  async function handleApply() {
    if (!isValid || !isDirty) return;
    setApplying(true);
    const res = await fetch("/api/config/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: input.trim() }),
    }).then((r) => r.json()).catch(() => ({ error: "Network error" }));
    setApplying(false);
    if (res.error) { toast.error(res.error); return; }
    setConfig((prev) => prev ? { ...prev, custom_domain: input.trim(), domain_status: "pending", domain_error: null } : prev);
    startPolling();
  }

  const status = config?.domain_status ?? "idle";

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
            {/* Status */}
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
            {status === "pending" && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                Configuring SSL certificate... this may take up to 2 minutes.
              </div>
            )}
            {status === "error" && config?.domain_error && (
              <div className="flex items-start gap-2 text-[11px] text-destructive">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span className="break-all">{config.domain_error}</span>
              </div>
            )}

            {/* Domain input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-foreground">Your domain</label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="myapp.com"
                disabled={status === "pending"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              {input.trim() && !isValid && (
                <p className="text-[10px] text-destructive">Enter a valid domain (e.g. myapp.com)</p>
              )}
            </div>

            {/* DNS instructions */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-foreground">DNS setup instructions</p>
              <p className="text-[10px] text-muted-foreground">
                Add one of the following records at your DNS provider, then click Apply.
              </p>

              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3 text-[10px] font-mono">
                <div>
                  <p className="text-[10px] font-sans text-muted-foreground mb-1">Option A — root domain</p>
                  <div className="grid grid-cols-3 gap-x-3 text-foreground">
                    <span className="text-muted-foreground">Type</span>
                    <span className="text-muted-foreground">Name</span>
                    <span className="text-muted-foreground">Value</span>
                    <span>A</span>
                    <span>@</span>
                    <span className="break-all">{config?.server_ip ?? "…"}</span>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] font-sans text-muted-foreground mb-1">Option B — www subdomain</p>
                  <div className="grid grid-cols-3 gap-x-3 text-foreground">
                    <span className="text-muted-foreground">Type</span>
                    <span className="text-muted-foreground">Name</span>
                    <span className="text-muted-foreground">Value</span>
                    <span>CNAME</span>
                    <span>www</span>
                    <span className="break-all">{config?.fractera_host ?? "…"}</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">
                DNS propagation may take up to 24h. Auth, Admin, and Data services remain on <span className="font-mono">{config?.fractera_host ?? "…"}</span>.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end">
        <button
          onClick={handleApply}
          disabled={!isValid || !isDirty || applying || status === "pending"}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {applying ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Applying…</span> : "Apply"}
        </button>
      </div>
    </div>
  );
}
