"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// App features — the section under Parallel routing (owner, 2026-08-08). Everything here answers one
// question: which pieces does every page of the app carry? Each feature is a runtime flag in
// platform-config.json, so turning one on is a save, not a rebuild.
//
// The switches are shown OPEN with their explanation next to them rather than behind a "?" — these
// are choices someone makes once, at the start, and the reason to make them is the text itself.

type Cfg = Record<string, unknown>;
type Props = { onClose: () => void };

type FeatureKey = "auth" | "breadcrumbs" | "faq" | "themeToggle" | "widthToggle" | "languageSwitcher";

type Feature = {
  key: FeatureKey;
  label: string;
  description: string;
  // Default state for a project that has never been configured.
  on: boolean;
  // Some features describe a layout the app owns itself once parallel routing arranges the page.
  offWhenParallel?: boolean;
};

const FEATURES: Feature[] = [
  {
    key: "auth",
    label: "Use authorization for the main app",
    description:
      "Puts a sign-in button in the top right corner of the app. Turn it on when the project has accounts, " +
      "personal data or anything that must be earned by logging in. If you are building an ordinary landing " +
      "page, leave this off.",
    on: false,
  },
  {
    key: "breadcrumbs",
    label: "Breadcrumbs",
    description:
      "Adds a slot that generates a navigation line on every page of your app. It is what tells a visitor " +
      "where in the project they currently are, and it is recommended for any project with deeply nested " +
      "pages. It also emits the structured markup search engines read for it, which is what makes the trail " +
      "show up in Google Search Console.",
    on: false,
  },
  {
    key: "faq",
    label: "Question & answer section",
    description:
      "Reserves an area for a question-and-answer section on every page of the project. It is the structured " +
      "way to answer what a complex page leaves unsaid, it is close to mandatory on pages built from text " +
      "content, and it is recommended for Google Search Console.",
    on: false,
  },
  {
    key: "themeToggle",
    label: "Day / night theme switch",
    description:
      "Lets the visitor choose light or dark instead of inheriting whatever their system decided.",
    on: true,
  },
  {
    key: "widthToggle",
    label: "Full screen width switch",
    description:
      "Lets the visitor widen the boundaries of the central content to the full width of the screen. " +
      "Unavailable while parallel routing is on: there the page layout is decided by its own structure.",
    on: true,
    offWhenParallel: true,
  },
  {
    key: "languageSwitcher",
    label: "Language switcher in the footer",
    description:
      "Stands at the bottom of the project and lets a visitor pick the language themselves instead of taking " +
      "the browser's recommendation — and lets them keep that language on every page that follows.",
    on: true,
  },
];

export function AppFeaturesPanel({ onClose }: Props) {
  const [config, setConfig] = useState<Cfg>({});
  const [state, setState] = useState<Record<string, boolean>>({});
  const [serverState, setServerState] = useState<Record<string, boolean>>({});
  const [parallel, setParallel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/platform", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const cfg = (data.config ?? {}) as Cfg;
      setConfig(cfg);
      setParallel(cfg.parallelRouting === true);
      // `footerPlugins` is where the three footer features were stored before this section existed —
      // read it as the older name of the same answer, so nobody's earlier choice is silently reset.
      const legacy = (cfg.footerPlugins ?? {}) as Record<string, boolean>;
      const saved = (cfg.features ?? {}) as Record<string, boolean>;
      const resolved: Record<string, boolean> = {};
      for (const f of FEATURES) {
        resolved[f.key] =
          typeof saved[f.key] === "boolean" ? saved[f.key]
          : typeof legacy[f.key] === "boolean" ? legacy[f.key]
          : f.on;
      }
      setState(resolved);
      setServerState(resolved);
      setError(null);
    } catch (e) {
      setError(`Could not load app features: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = FEATURES.some((f) => state[f.key] !== serverState[f.key]);

  async function save() {
    setSaving(true);
    try {
      const features: Record<string, boolean> = {};
      for (const f of FEATURES) features[f.key] = state[f.key] === true;
      // Keep footerPlugins in step with the three features it used to own, so a reader that still
      // consults the old name sees the same answer instead of a stale one.
      const legacy = (config.footerPlugins ?? {}) as Record<string, boolean>;
      const footerPlugins = {
        ...legacy,
        themeToggle: features.themeToggle,
        widthToggle: features.widthToggle,
        languageSwitcher: features.languageSwitcher,
      };
      const next = { ...config, features, footerPlugins };
      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: next }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setConfig(next);
      setServerState({ ...state });
      toast.success("Saved — your app reflects this on the next load");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-background flex flex-col h-full w-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">App features</span>
        <span className="text-[10px] text-muted-foreground">what every page carries</span>
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
          <div className="flex flex-col gap-4 max-w-xl">
            {FEATURES.map((f) => {
              const blocked = f.offWhenParallel === true && parallel;
              return (
                <div key={f.key} className={`flex flex-col gap-1 ${blocked ? "opacity-50" : ""}`}>
                  <label className="flex items-start gap-3">
                    <Switch
                      checked={blocked ? false : state[f.key] === true}
                      onCheckedChange={(v) => setState((s) => ({ ...s, [f.key]: v }))}
                      disabled={saving || blocked}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-medium text-foreground">{f.label}</span>
                      <span className="text-[10px] leading-relaxed text-muted-foreground">{f.description}</span>
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-border flex items-center gap-3 shrink-0">
        <Button onClick={save} disabled={saving || loading || !dirty}>
          {saving ? <><Loader2 size={11} className="animate-spin" />Saving…</> : "Save changes"}
        </Button>
        <span className="text-[10px] text-muted-foreground">Applies on the app&rsquo;s next load · no rebuild</span>
      </div>
    </div>
  );
}
