"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Platform — structural settings for the deployed Shell app (routing / languages / theme).
// Distinct from Site Settings (branding/SEO/PWA). Reads and writes the Shell's
// platform-config.json via the server route /api/config/platform (same cross-process pattern
// as Site Settings / Env). The parallel-routing flag applies at runtime — the Shell reads it
// per request, so a save shows up on the app's next page load, no rebuild.
//
// 116.1 ships a single switch: "Use parallel routing". OFF (default) renders the flat page
// tree (today's behaviour); ON makes the [lang] layout arrange the named parallel-route slots.

type Cfg = Record<string, unknown>;
type Props = { onClose: () => void };

export function PlatformSettingsPanel({ onClose }: Props) {
  const [config, setConfig] = useState<Cfg>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When parallel routing is on, an orange "Parallel routes · setup" affordance appears in the
  // header. It opens the slot-selection UI (the animated route picker ported from the reference
  // app — full copy lands in the next step; a placeholder describes it for now).
  const [showRoutesSetup, setShowRoutesSetup] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config/platform", { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        setConfig((data.config ?? {}) as Cfg);
      } catch (e) {
        setError(`Could not load platform settings: ${String(e)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const parallelRouting = config.parallelRouting === true;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Saved — your app reflects this on the next load");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }} className="bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">
          Platform
          <span className="ml-2 text-[10px] font-normal text-muted-foreground font-mono">routing · languages · theme</span>
        </span>
        {parallelRouting && (
          <button
            type="button"
            onClick={() => setShowRoutesSetup(true)}
            title="Configure which parallel routes are active"
            className="text-[10px] font-semibold uppercase tracking-wide text-orange-500 hover:text-orange-600 transition-colors"
          >
            Parallel routes · setup
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {showRoutesSetup && (
        <div className="absolute inset-0 bg-background flex flex-col z-30">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
            <button
              type="button"
              onClick={() => setShowRoutesSetup(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <span className="text-xs font-semibold text-orange-500">Parallel routes · setup</span>
          </div>
          <div className="flex-1 overflow-auto px-6 py-6">
            <p className="text-[11px] text-foreground/80 leading-relaxed max-w-md">
              The animated parallel-routes selector — choose which named slots (Header, Left, Right,
              Center / Center&nbsp;Header / Center&nbsp;Footer, Footer, …) are active, with a live layout
              preview that resizes as you toggle — is ported from the reference app in the next step.
              It will read and write the per-slot active flags through this Platform config (the
              reference stored them as a per-slot <code className="font-mono">isDefaultPageNull</code> flag).
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs gap-2">
          <Loader2 size={13} className="animate-spin" />Loading…
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-[11px] text-destructive text-center">{error}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-4 py-3">
          <p className="text-[10px] text-muted-foreground mb-3">
            Structural settings for how your app is laid out and routed. Changes apply at runtime — reload the app to see them.
          </p>
          <div className="flex flex-col gap-5 max-w-md">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-0.5 border-b border-border pb-1">
                <span className="text-[11px] font-semibold text-foreground">Routing</span>
                <span className="text-[9px] text-muted-foreground">How the app shell is composed.</span>
              </div>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, parallelRouting: !parallelRouting }))}
                className="flex items-start gap-3 text-left rounded-md border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors"
              >
                <span
                  aria-hidden
                  className={`mt-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${parallelRouting ? "bg-foreground" : "bg-muted-foreground/40"}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-background transition-transform ${parallelRouting ? "translate-x-3.5" : "translate-x-0.5"}`} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-foreground">Use parallel routing</span>
                  <span className="text-[9px] text-muted-foreground leading-relaxed">
                    Off: the app renders the flat page tree (default). On: the layout arranges the named parallel-route slots instead of the page children.
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-border flex items-center gap-3 shrink-0">
        <Button onClick={save} disabled={saving || loading}>
          {saving ? <><Loader2 size={11} className="animate-spin" />Saving…</> : <><Save size={11} />Save settings</>}
        </Button>
        <span className="text-[10px] text-muted-foreground">Stored on the server · no rebuild required</span>
      </div>
    </div>
  );
}
