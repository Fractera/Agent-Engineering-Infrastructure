"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Save } from "lucide-react";
import { AppSettingsHelp } from "./help-note.client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SECTIONS, DOMAIN_DERIVED, getAt, setAt } from "./site-settings/fields";
import { FieldRow } from "./site-settings/field-row.client";
import { useRuntimeUrls } from "@/lib/runtime-urls";

// Site Settings — branding / SEO / PWA / images for the deployed Shell app. Reads and writes
// the Shell's app-config.json (server route /api/config/site, same cross-process pattern as the
// Env panel). Changes apply at runtime: the Shell renders the config per request, so a save
// shows up on the app's next page load — no rebuild. Text fields here, images via object
// storage + the crop tool, PWA icons via the one-square-logo generator.

type Cfg = Record<string, unknown>;
type Props = { onClose: () => void };

export function SiteSettingsPanel({ onClose }: Props) {
  const [config, setConfig] = useState<Cfg>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The address this admin panel is being read on IS the deployment's address — the apex is
  // recovered from the hostname. Nothing is typed, so nothing can drift.
  const { appUrl } = useRuntimeUrls();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config/site", { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        // Overwrite the derived addresses on load: what the file carries may be the starter's
        // inherited default (www.fractera.ai on every server), and showing that as if it were
        // this site's address is exactly the confusion this replaces. Save writes them back.
        let next = (data.config ?? {}) as Cfg;
        for (const [path, derive] of Object.entries(DOMAIN_DERIVED)) next = setAt(next, path, derive(appUrl));
        setConfig(next);
      } catch (e) {
        setError(`Could not load site settings: ${String(e)}`);
      } finally {
        setLoading(false);
      }
    })();
    // appUrl is a string, so a re-computed but identical address does not refetch.
  }, [appUrl]);

  function update(path: string, value: unknown) {
    setConfig((prev) => setAt(prev, path, value));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/config/site", {
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
    <div className="bg-background flex flex-col h-full w-full">
      <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground flex-1 flex items-center gap-1.5">
          App Settings
          <AppSettingsHelp />
          <span className="ml-2 text-[10px] font-normal text-muted-foreground font-mono">branding · SEO · PWA</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

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
            These settings brand the app your visitors and PWA installs see. Changes apply at runtime — reload the app to see them.
          </p>
          <div className="flex flex-col gap-5 max-w-md">
            {SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-0.5 border-b border-border pb-1">
                  <span className="text-[11px] font-semibold text-foreground">{section.title}</span>
                  {section.description && (
                    <span className="text-[9px] text-muted-foreground">{section.description}</span>
                  )}
                </div>
                {section.fields.map((field) => (
                  <FieldRow
                    key={field.path}
                    field={field}
                    value={getAt(config, field.path)}
                    onChange={(v) => update(field.path, v)}
                  />
                ))}
              </div>
            ))}
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
