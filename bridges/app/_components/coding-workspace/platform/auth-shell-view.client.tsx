"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// App-shell auth view (step 161). Toggles the PUBLIC auth control of the deployed Shell — the
// Sign in / account button + account drawer in the header. This is the BUILD-TIME source of truth
// (env NEXT_PUBLIC_APP_SHELL_AUTH = left|right|off, written via the key-scoped /api/config/auth-shell
// route), so applying a change = a REBUILD, exactly like the language set. The admin login always
// exists separately — this governs only the public shell.

type AuthValue = "off" | "left" | "right";

const OPTIONS: { value: AuthValue; title: string; hint: string }[] = [
  { value: "off", title: "Off (no public login)", hint: "Default. No account button — best for a landing page or portfolio. Smaller bundle, faster deploy." },
  { value: "left", title: "On — account drawer on the left", hint: "Adds a Sign in / account button to the header; the account panel slides in from the left." },
  { value: "right", title: "On — account drawer on the right", hint: "Same, but the account panel slides in from the right." },
];

export function AuthShellView({ onBack }: { onBack: () => void }) {
  const [value, setValue] = useState<AuthValue>("off");
  const [serverValue, setServerValue] = useState<AuthValue>("off");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "rebuilding">("idle");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/auth-shell", { credentials: "include" });
      const data = await res.json();
      const v = (data.value as AuthValue) ?? "off";
      setValue(v);
      setServerValue(v);
    } catch {
      /* keep default */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = value !== serverValue;

  // Poll the deploy WAL until the rebuild reaches a terminal state (or we give up waiting).
  const pollDeploy = async (jobId: string): Promise<void> => {
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const r = await fetch(`/api/deploy/status?jobId=${jobId}`, { credentials: "include" });
        const d = await r.json();
        if (d.status === "COMPLETED") { toast.success("Applied — the site was rebuilt"); return; }
        if (d.status === "FAILED" || d.status === "HEALTH_FAILED") { toast.error(`Rebuild ${d.status}`); return; }
      } catch { /* keep polling */ }
    }
    toast.message("Rebuild is taking longer than expected — check the deploy status");
  };

  const save = async () => {
    setSaving(true);
    setPhase("saving");
    try {
      const res = await fetch("/api/config/auth-shell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setServerValue(value);

      // Build-time → apply by rebuilding. Trigger the existing deploy loop and follow it.
      setPhase("rebuilding");
      toast.message("Saved — rebuilding to apply (2–4 min)…");
      const dep = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: `app-shell auth: ${value}` }),
        credentials: "include",
      });
      if (dep.status === 409) { toast.error("A build is already in progress — try again shortly"); return; }
      const depData = await dep.json();
      if (!dep.ok || !depData.jobId) throw new Error(depData.error ?? "Could not start the rebuild");
      await pollDeploy(depData.jobId);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
      setPhase("idle");
    }
  };

  return (
    <div className="absolute inset-0 bg-background flex flex-col z-30">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <button type="button" onClick={onBack} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
        <span className="text-xs font-semibold text-foreground">App authorization</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            This adds a <strong>public login</strong> to your app shell — a Sign in / account button in the header and
            an account panel for the signed-in visitor. Turn it ON only when your app actually needs visitor accounts
            (a store, a social app, a SaaS dashboard, anything where people log in). For a landing page or portfolio,
            leave it <strong>off</strong>: every extra control adds weight to the page and time to each deploy, so this
            stays out of the way until you need it. The admin login you use to manage the app always exists separately —
            this only controls what your visitors see. It is <strong>build-time</strong>: <strong>saving applies it by
            rebuilding the app (2–4 min)</strong>, the same way changing the language set does.
          </p>

          <div className="flex flex-col gap-1.5">
            {OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex gap-2.5 rounded-md border px-3 py-2.5 transition-colors cursor-pointer ${value === o.value ? "border-primary bg-muted" : "border-border hover:bg-muted/50"}`}
              >
                <input
                  type="radio"
                  name="app-shell-auth"
                  checked={value === o.value}
                  disabled={saving}
                  onChange={() => setValue(o.value)}
                  className="mt-0.5 accent-primary"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{o.title}</span>
                  <span className="text-[10px] text-muted-foreground leading-snug">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-border flex items-center gap-3 shrink-0">
        <Button onClick={save} disabled={saving || loading || !dirty}>
          {phase === "rebuilding" ? (
            <><Loader2 size={11} className="animate-spin" />Rebuilding…</>
          ) : phase === "saving" ? (
            <><Loader2 size={11} className="animate-spin" />Saving…</>
          ) : (
            <><Save size={11} />Save &amp; rebuild</>
          )}
        </Button>
        <span className="text-[10px] text-muted-foreground">
          {phase === "rebuilding" ? "Rebuilding the app — this takes 2–4 minutes" : "Build-time · saving triggers a rebuild"}
        </span>
      </div>
    </div>
  );
}
