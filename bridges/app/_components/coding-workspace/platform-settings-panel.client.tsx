"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ParallelRoutesSelector } from "./parallel-routes/parallel-routes-selector.client";

// Platform — structural settings for the deployed Shell. Header carries one dropdown ("Settings"):
//   • Use parallel routing — master runtime flag (instant)
//   • Footer settings  → submenu: 4 switches (Footer pages / Screen width / Theme / Multilingual)
//     + an "Apply settings" button (batch-persist the runtime footerPlugins flags, no rebuild)
//   • Parallel routes · setup → slot selector view (when parallel routing is on)
// (The language SET selector moved to App Settings → "Manage languages".)
// Everything but the language SET is a runtime flag in platform-config.json (applies on next load).
// The reference marketplace is replaced by these flags; every footer feature defaults ON.

type Cfg = Record<string, unknown>;
type View = null | "slots";
type Props = { onClose: () => void };

const FOOTER_KEYS = ["footerPages", "widthToggle", "themeToggle", "languageSwitcher"] as const;
const FOOTER_LABELS: Record<(typeof FOOTER_KEYS)[number], string> = {
  footerPages: "Footer pages",
  widthToggle: "Screen width",
  themeToggle: "Theme",
  languageSwitcher: "Multilingual",
};

export function PlatformSettingsPanel({ onClose }: Props) {
  const [config, setConfig] = useState<Cfg>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<View>(null);
  const [staged, setStaged] = useState<Record<string, boolean>>({});

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
  const flag = (key: string) => footerPlugins[key] !== false; // missing = on

  // Seed the staged footer switches from the live config (after load / save). `config` identity is
  // stable between renders — it only changes when setConfig runs — so this does not loop.
  useEffect(() => {
    const fp = (config.footerPlugins ?? {}) as Record<string, boolean>;
    setStaged(Object.fromEntries(FOOTER_KEYS.map((k) => [k, fp[k] !== false])));
  }, [config]);

  const footerDirty = FOOTER_KEYS.some((k) => staged[k] !== flag(k));

  // Persist the WHOLE config (the platform route overwrites the file with exactly what we send;
  // the Shell deep-merges over code defaults on read). Optimistic.
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
  const applyFooter = () => {
    saveConfig({ ...config, footerPlugins: { ...footerPlugins, ...staged } });
    setMenuOpen(false);
  };
  const openView = (v: View) => { setMenuOpen(false); setView(v); };
  const goBack = () => { setView(null); load(); };

  return (
    <div style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }} className="bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">
          Platform <span className="font-normal text-muted-foreground">routing</span>
        </span>
        <span className="text-muted-foreground text-[11px]">·</span>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors">
              Settings <ChevronDown size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {/* master mode flag — instant */}
            <div className="flex items-center gap-2 px-2 py-1.5 text-[12px]">
              <span className="flex-1">Use parallel routing</span>
              <Switch checked={parallelRouting} onCheckedChange={toggleParallel} disabled={saving} />
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-[12px]">Footer settings</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56 p-2">
                <DropdownMenuLabel className="px-1 pt-0 pb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Footer features</DropdownMenuLabel>
                {FOOTER_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-2 px-1 py-1.5 text-[12px]">
                    <span className="flex-1">{FOOTER_LABELS[key]}</span>
                    <Switch
                      checked={staged[key] ?? true}
                      onCheckedChange={(v) => setStaged((s) => ({ ...s, [key]: v }))}
                      disabled={saving}
                    />
                  </div>
                ))}
                <div className="pt-1.5 mt-1 border-t border-border">
                  <Button size="sm" className="w-full" disabled={saving || !footerDirty} onClick={applyFooter}>
                    {saving ? <Loader2 size={12} className="animate-spin" /> : "Apply settings"}
                  </Button>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {parallelRouting && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => openView("slots")} className="text-[12px] text-orange-500 focus:text-orange-600">
                  Parallel routes · setup
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
            Open <span className="font-semibold text-foreground">Settings</span> above to toggle parallel routing
            or configure footer features. Every footer feature is on by default. (Languages moved to App Settings.)
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
