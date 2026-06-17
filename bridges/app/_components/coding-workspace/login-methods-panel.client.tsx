"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, KeyRound, Loader2, CheckCircle, AlertCircle, Copy, Trash2 } from "lucide-react";

type Props = {
  onClose: () => void;
};

type AuthMethodsStatus = {
  secure: boolean;
  google: { configured: boolean; clientIdMasked: string | null };
  resend: { configured: boolean; keyMasked: string | null; from: string };
  googleCallbackUrl: string | null;
};

// Login methods — lets the owner enable Google sign-in and email magic-link
// (Resend) on the public /login page. Both are configurable ONLY in secure mode
// (a custom domain + HTTPS must be active): OAuth needs an HTTPS callback and
// magic-link needs a real sending domain. While a credential is empty its button
// stays hidden on /login.
export function LoginMethodsPanel({ onClose }: Props) {
  const [status, setStatus]   = useState<AuthMethodsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const [googleId, setGoogleId]         = useState("");
  const [googleSecret, setGoogleSecret] = useState("");
  const [resendKey, setResendKey]       = useState("");
  const [resendFrom, setResendFrom]     = useState("");

  function load() {
    setLoading(true);
    fetch("/api/config/auth-methods")
      .then((r) => r.json())
      .then((data: AuthMethodsStatus) => {
        setStatus(data);
        setResendFrom(data.resend?.from ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function save(payload: Record<string, unknown>, okMsg: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/config/auth-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      setGoogleId(""); setGoogleSecret(""); setResendKey("");
      toast.success(okMsg);
      try {
        const fresh = await fetch("/api/config/auth-methods").then((r) => r.json());
        setStatus(fresh);
      } catch { /* admin reloading */ }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  const secure = !!status?.secure;

  return (
    <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <KeyRound size={13} />
          Login methods
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading || !status ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : !secure ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            <p className="flex items-start gap-1.5">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>
                Google sign-in and email magic-link can be set up only after you connect a
                <strong> custom domain with HTTPS</strong> (secure mode). Open <strong>Personal Domain</strong>
                in the Settings menu to activate it, then come back here.
              </span>
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
              <p>
                Add <strong>Continue with Google</strong> and an <strong>email magic-link</strong> to your
                public sign-in page. Each button appears on <code className="px-1 py-0.5 rounded bg-muted">/login</code>
                only while its credentials are set here — leave a field empty to hide that button.
              </p>
            </div>

            {/* ── Google OAuth ── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground">Google OAuth</p>
                {status.google.configured ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <CheckCircle size={10} />
                    <span className="font-mono">{status.google.clientIdMasked}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">not set</span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Create an OAuth client in the{" "}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud console</a>{" "}
                and add the redirect URI below.
              </p>
              {status.googleCallbackUrl && (
                <button
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(status.googleCallbackUrl!); toast.success("Redirect URI copied"); }}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-border bg-muted/40 text-[10px] font-mono text-foreground hover:bg-muted transition-colors"
                >
                  <Copy size={10} className="shrink-0" />
                  <span className="truncate">{status.googleCallbackUrl}</span>
                </button>
              )}
              <input
                type="text"
                value={googleId}
                onChange={(e) => setGoogleId(e.target.value)}
                placeholder={status.google.configured ? "Paste new Client ID to replace" : "Client ID"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              <input
                type="password"
                value={googleSecret}
                onChange={(e) => setGoogleSecret(e.target.value)}
                placeholder={status.google.configured ? "Paste new Client Secret to replace" : "Client Secret"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => save({ googleClientId: googleId, googleClientSecret: googleSecret }, "Google sign-in saved")}
                  disabled={saving || (!googleId.trim() && !googleSecret.trim())}
                  className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  Save Google
                </button>
                {status.google.configured && (
                  <button
                    onClick={() => save({ clearGoogle: true }, "Google sign-in removed")}
                    disabled={saving}
                    className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-destructive/40 text-[10px] text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={10} /> Remove
                  </button>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* ── Email magic-link (Resend) ── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground">Email magic-link (Resend)</p>
                {status.resend.configured ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <CheckCircle size={10} />
                    <span className="font-mono">{status.resend.keyMasked}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">not set</span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Get an API key from{" "}
                <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a>{" "}
                and use a From address on a domain you verified there.
              </p>
              <input
                type="password"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                placeholder={status.resend.configured ? "Paste new API key to replace (re_…)" : "re_…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              <input
                type="text"
                value={resendFrom}
                onChange={(e) => setResendFrom(e.target.value)}
                placeholder="noreply@yourdomain.com"
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => save({ resendApiKey: resendKey, resendFrom }, "Magic-link saved")}
                  disabled={saving || (!resendKey.trim() && resendFrom.trim() === (status.resend.from ?? ""))}
                  className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  Save magic-link
                </button>
                {status.resend.configured && (
                  <button
                    onClick={() => save({ clearResend: true }, "Magic-link removed")}
                    disabled={saving}
                    className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-destructive/40 text-[10px] text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={10} /> Remove
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-1.5">
                <AlertCircle size={11} className="shrink-0 mt-0.5" />
                <span>Saving restarts the auth service; the sign-in page reflects changes within a few seconds.</span>
              </p>
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end">
        {saving && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 size={11} className="animate-spin" /> Saving…
          </span>
        )}
      </div>
    </div>
  );
}
