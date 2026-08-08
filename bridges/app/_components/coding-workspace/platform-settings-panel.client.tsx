"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X, ChevronDown } from "lucide-react";
import { PlatformHelp } from "./help-note.client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

// Platform — structural settings for the deployed Shell. Header carries one dropdown ("Settings"):
//   • Footer settings  → submenu: 4 switches (Footer pages / Screen width / Theme / Multilingual)
//     + an "Apply settings" button (batch-persist the runtime footerPlugins flags, no rebuild)
// The language SET and parallel routing are their OWN pages in the first section of the menu
// (owner, 2026-08-08) — the master switch and the slot selector left this dropdown with them,
// so a subject is configured in one place instead of two.
// Everything but the language SET is a runtime flag in platform-config.json (applies on next load).
// The reference marketplace is replaced by these flags; every footer feature defaults ON.

type Cfg = Record<string, unknown>;
type Props = { onClose: () => void };

// Theme, screen width and the language switcher moved to App features (owner, 2026-08-08) — a
// feature is configured where it is explained, and two switches for one flag is how a setting starts
// disagreeing with itself. Footer pages stayed: it is about the footer, not about the page.
const FOOTER_KEYS = ["footerPages"] as const;
const FOOTER_LABELS: Record<(typeof FOOTER_KEYS)[number], string> = {
  footerPages: "Footer pages",
};

export function PlatformSettingsPanel({ onClose }: Props) {
  const [config, setConfig] = useState<Cfg>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const applyFooter = () => {
    saveConfig({ ...config, footerPlugins: { ...footerPlugins, ...staged } });
    setMenuOpen(false);
  };

  return (
    <div className="bg-background flex flex-col h-full w-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          Platform <span className="font-normal text-muted-foreground">routing</span>
          <PlatformHelp />
        </span>
        <span className="text-muted-foreground text-[11px]">·</span>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors">
              Settings <ChevronDown size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
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
            Open <span className="font-semibold text-foreground">Settings</span> above to configure footer
            features. Every footer feature is on by default. Languages and parallel routing are their own
            pages at the top of the menu.
          </p>
          <div className="max-w-md rounded-md border border-border px-3 py-2.5 text-[11px] text-foreground">
            Parallel routing is <span className={`font-semibold ${parallelRouting ? "text-green-600" : "text-muted-foreground"}`}>{parallelRouting ? "ON" : "OFF"}</span> —
            set on the Parallel routing page.
          </div>
        </div>
      )}
    </div>
  );
}
