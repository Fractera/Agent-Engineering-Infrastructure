"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ParallelRoutesSelector } from "./parallel-routes/parallel-routes-selector.client";
import { FooterFeatureView } from "./platform/footer-feature-view.client";
import { MultilingualView } from "./platform/multilingual-view.client";

// Platform — structural settings for the deployed Shell app. The header carries a dropdown bar-menu:
//   • Use parallel routing (master runtime flag)
//   • Settings for: Footer pages / Screen width / Theme / Multilingual
//   • Parallel routes · setup (slot selector, when parallel routing is on)
// Every runtime flag lives in platform-config.json (footerPlugins + parallelRouting) and applies on
// the app's next load — no rebuild. The language SET (inside Multilingual) is build-time env and is
// the one thing that needs a rebuild. Reads/writes via /api/config/platform (cross-process, same as
// Site Settings / Env). The marketplace the reference used is replaced by these Platform flags;
// every footer feature defaults ON ("all components allowed").

type Cfg = Record<string, unknown>;
type View = null | "footerPages" | "width" | "theme" | "multilingual" | "slots";
type Props = { onClose: () => void };

const FOOTER_FEATURES: Record<string, { title: string; description: string }> = {
  footerPages: { title: "Footer pages", description: "The footer navigation menu, the pages manager and the page content drawer." },
  widthToggle: { title: "Screen width", description: "The center-width toggle button in the footer toolbar." },
  themeToggle: { title: "Theme", description: "The day/night theme switcher button in the footer toolbar." },
};

export function PlatformSettingsPanel({ onClose }: Props) {
  const [config, setConfig] = useState<Cfg>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<View>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/platform", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setConfig((data.config ?? {}) as Cfg);
      setError(null);
    } catch (e) {
      setError(`Could not load platform settings: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const parallelRouting = config.parallelRouting === true;
  const footerPlugins = (config.footerPlugins ?? {}) as Record<string, boolean>;
  const flag = (key: string) => footerPlugins[key] !== false; // missing = default on

  // Persist the WHOLE config (the platform route overwrites the file with exactly what we send;
  // the Shell deep-merges over code defaults on read). Optimistic: we already set state.
  async function saveConfig(next: Cfg) {
    setConfig(next);
    setSaving(true);
    try {
      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: next }),
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

  const toggleParallel = () => saveConfig({ ...config, parallelRouting: !parallelRouting });
  const toggleFlag = (key: string) =>
    saveConfig({ ...config, footerPlugins: { ...footerPlugins, [key]: !flag(key) } });

  const goBack = () => { setView(null); load(); };

  const openView = (v: View) => { setMenuOpen(false); setView(v); };

  const menuItem = "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-[12px] text-foreground hover:bg-muted transition-colors";

  return (
    <div style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }} className="bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">
          Platform
          <span className="ml-2 text-[10px] font-normal text-muted-foreground font-mono">routing · languages · theme</span>
        </span>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
            >
              Settings <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-60 p-1.5">
            <button type="button" onClick={() => { toggleParallel(); }} className={menuItem}>
              <span
                aria-hidden
                className={`inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${parallelRouting ? "bg-foreground" : "bg-muted-foreground/40"}`}
              >
                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-background transition-transform ${parallelRouting ? "translate-x-3" : "translate-x-0.5"}`} />
              </span>
              <span className="flex-1">Use parallel routing</span>
            </button>

            <div className="px-2 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Settings for</div>
            <button type="button" onClick={() => openView("footerPages")} className={menuItem}><span className="flex-1">Footer pages</span><ChevronRight size={12} className="text-muted-foreground" /></button>
            <button type="button" onClick={() => openView("width")} className={menuItem}><span className="flex-1">Screen width</span><ChevronRight size={12} className="text-muted-foreground" /></button>
            <button type="button" onClick={() => openView("theme")} className={menuItem}><span className="flex-1">Theme</span><ChevronRight size={12} className="text-muted-foreground" /></button>
            <button type="button" onClick={() => openView("multilingual")} className={menuItem}><span className="flex-1">Multilingual</span><ChevronRight size={12} className="text-muted-foreground" /></button>

            {parallelRouting && (
              <>
                <div className="my-1 border-t border-border" />
                <button type="button" onClick={() => openView("slots")} className={`${menuItem} text-orange-500`}><span className="flex-1">Parallel routes · setup</span><ChevronRight size={12} /></button>
              </>
            )}
          </PopoverContent>
        </Popover>

        <span className="flex-1" />
        {saving && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {view === "slots" && <ParallelRoutesSelector onBack={goBack} />}
      {view === "multilingual" && (
        <MultilingualView
          onBack={goBack}
          switcherActive={flag("languageSwitcher")}
          onToggleSwitcher={() => toggleFlag("languageSwitcher")}
          switcherSaving={saving}
        />
      )}
      {(view === "footerPages" || view === "width" || view === "theme") && (() => {
        const key = view === "footerPages" ? "footerPages" : view === "width" ? "widthToggle" : "themeToggle";
        const meta = FOOTER_FEATURES[key];
        return (
          <FooterFeatureView
            title={meta.title}
            description={meta.description}
            active={flag(key)}
            onToggle={() => toggleFlag(key)}
            saving={saving}
            onBack={goBack}
          />
        );
      })()}

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
          <p className="text-[11px] text-muted-foreground mb-3 max-w-md">
            Structural settings for how your app is laid out and routed. Open <span className="font-semibold text-foreground">Settings</span> above
            to toggle parallel routing or configure footer features and languages. Every footer feature is on by default.
          </p>
          <div className="max-w-md rounded-md border border-border px-3 py-2.5 text-[11px] text-foreground">
            Parallel routing is <span className={`font-semibold ${parallelRouting ? "text-green-600" : "text-muted-foreground"}`}>{parallelRouting ? "ON" : "OFF"}</span>.
            {parallelRouting
              ? " The layout arranges the named parallel-route slots."
              : " The app renders the flat page tree (today's behaviour)."}
          </div>
        </div>
      )}
    </div>
  );
}
