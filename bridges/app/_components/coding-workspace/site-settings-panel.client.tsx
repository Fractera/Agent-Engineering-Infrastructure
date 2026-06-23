"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SECTIONS, getAt, setAt } from "./site-settings/fields";
import { FieldRow } from "./site-settings/field-row.client";
import { LanguagesView } from "./platform/languages-view.client";

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
  // Languages selector now lives here (moved from the Platform tab). It opens as an
  // overlay sub-view; the build-time language SET + default are managed inside it.
  const [view, setView] = useState<null | "languages">(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config/site", { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        setConfig((data.config ?? {}) as Cfg);
      } catch (e) {
        setError(`Could not load site settings: ${String(e)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    <div style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }} className="bg-background flex flex-col">
      <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground flex-1">
          App Settings
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

            {/* Languages — moved here from the Platform tab. Opens the language SET selector. */}
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-0.5 border-b border-border pb-1">
                <span className="text-[11px] font-semibold text-foreground">Languages</span>
                <span className="text-[9px] text-muted-foreground">The languages the app is built with (build-time set + default).</span>
              </div>
              <Button variant="outline" size="sm" className="w-fit" onClick={() => setView("languages")}>
                Manage languages →
              </Button>
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

      {view === "languages" && <LanguagesView onBack={() => setView(null)} />}
    </div>
  );
}
