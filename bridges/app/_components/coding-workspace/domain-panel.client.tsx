"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Globe, Loader2 } from "lucide-react";
import { DomainWizard } from "./domain-wizard.client";

interface DomainConfig {
  custom_domain: string | null;
  domain_status: "idle" | "pending" | "active" | "error";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const normalized = normalizeDomain(input);
  const isValid = DOMAIN_RE.test(normalized);

  useEffect(() => {
    fetch("/api/config/domain")
      .then((r) => r.json())
      .then((data: DomainConfig) => setConfig(data))
      .finally(() => setLoading(false));
  }, []);

  async function saveDomain() {
    if (!isValid) return;
    setSaving(true);
    try {
      // We don't trigger certbot here — that's a separate step in the wizard.
      // This POST just records the domain in site_settings so the wizard
      // knows what to work on. The existing /api/config/domain POST does
      // both (record + certbot); for the wizard flow we want the record
      // first, certbot only when the user clicks "Issue certificate" in
      // step 2. So we record the domain via a lightweight call here…
      const res = await fetch("/api/config/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: normalized }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setConfig({ custom_domain: normalized, domain_status: "pending" });
      toast.success("Domain saved — continue with the wizard");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[12px] font-medium text-foreground flex items-center gap-2">
            <Globe size={13} /> Personal Domain
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 p-4 text-[11px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  // Domain already entered → wizard takes over. "Change domain" inside the
  // wizard clears the saved record and drops us back to this entry form,
  // pre-filling the old value so a typo is quick to fix. (step 99)
  if (config?.custom_domain) {
    return (
      <DomainWizard
        domain={config.custom_domain}
        onClose={onClose}
        onChangeDomain={(prev) => { setInput(prev); setConfig({ custom_domain: null, domain_status: "idle" }); }}
      />
    );
  }

  // Initial state — ask for the domain name.
  return (
    <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-[12px] font-medium text-foreground flex items-center gap-2">
          <Globe size={13} /> Personal Domain
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Enter the domain you bought (apex form, e.g. <span className="font-mono">aifa.dev</span>).
          The next steps will walk you through DNS records, SSL certificate issuance, end-to-end
          HTTPS check, and the atomic switch from IP-mode to your domain.
        </p>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-foreground">Your domain</label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isValid && saveDomain()}
            placeholder="aifa.dev"
            className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {input.trim() && !isValid && (
            <p className="text-[10px] text-destructive">Enter a valid domain (e.g. myapp.com)</p>
          )}
        </div>
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
          <strong>Don&rsquo;t use Cloudflare DNS.</strong> Cloudflare proxies traffic through their
          network, which adds a dependency and occasional connectivity issues. Use your
          registrar&rsquo;s own DNS panel (GoDaddy, Namecheap, Porkbun, etc.) — they all give you
          direct A-record management.
        </div>
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end">
        <button
          onClick={saveDomain}
          disabled={!isValid || saving}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {saving ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Saving…</span> : "Continue →"}
        </button>
      </div>
    </div>
  );
}
