"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALL_LANGUAGE_METADATA } from "@/config/translations/language-metadata";

// Multilingual sub-view. The language SET is the BUILD-TIME source of truth (env
// NEXT_PUBLIC_SUPPORTED_LANGUAGES / NEXT_PUBLIC_DEFAULT_LOCALE — it feeds generateStaticParams and
// bakes SINGLE_LANG_MODE), so this writes via the key-scoped /api/config/languages route, NOT the
// runtime platform-config. Changing the set therefore needs a rebuild — the footer language
// switcher only appears once >1 language is built (and its Platform flag is on). `en` stays locked
// on as the guaranteed fallback (resolve-lang / DEFAULT_LANGUAGE fall back to it).

const CATALOG = Object.values(ALL_LANGUAGE_METADATA);
const LOCKED = "en";

type Props = {
  onBack: () => void;
  // The "show language switcher in footer" flag (footerPlugins.languageSwitcher) is a RUNTIME
  // flag owned by the panel's platform-config; toggling it applies instantly (no rebuild). The
  // language SET below is build-time (env) and needs a rebuild. Both live on one screen because
  // they are both "multilingual".
  switcherActive: boolean;
  onToggleSwitcher: () => void;
  switcherSaving: boolean;
};

export function MultilingualView({ onBack, switcherActive, onToggleSwitcher, switcherSaving }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set([LOCKED]));
  const [serverSelected, setServerSelected] = useState<Set<string>>(new Set([LOCKED]));
  const [defaultLang, setDefaultLang] = useState(LOCKED);
  const [serverDefault, setServerDefault] = useState(LOCKED);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/languages", { credentials: "include" });
      const data = await res.json();
      const langs = new Set<string>([LOCKED, ...((data.languages ?? []) as string[])]);
      const def = (data.defaultLanguage as string) || LOCKED;
      setSelected(new Set(langs));
      setServerSelected(new Set(langs));
      setDefaultLang(def);
      setServerDefault(def);
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!filter) return CATALOG;
    const f = filter.toLowerCase();
    return CATALOG.filter((l) => l.nativeName.toLowerCase().includes(f) || l.englishName.toLowerCase().includes(f) || l.code.includes(f));
  }, [filter]);

  const dirty =
    defaultLang !== serverDefault ||
    selected.size !== serverSelected.size ||
    [...selected].some((c) => !serverSelected.has(c));

  const toggle = (code: string) => {
    if (code === LOCKED) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        if (defaultLang === code) setDefaultLang(LOCKED);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const languages = [...selected];
      const res = await fetch("/api/config/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languages, defaultLanguage: defaultLang }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setServerSelected(new Set(selected));
      setServerDefault(defaultLang);
      toast.success("Saved — rebuild the app to apply the new language set");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-background flex flex-col z-30">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <button type="button" onClick={onBack} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
        <span className="text-xs font-semibold text-foreground">Multilingual</span>
        <span className="text-[10px] text-muted-foreground">{selected.size} selected</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col px-4 py-3 gap-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Languages the app is built with. The set is build-time — saving needs an app rebuild to apply.
            The footer language switcher appears once more than one language is built (and the toggle below is on).
          </p>

          <button
            type="button"
            onClick={onToggleSwitcher}
            disabled={switcherSaving}
            className="flex items-start gap-3 text-left rounded-md border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors disabled:opacity-60"
          >
            <span
              aria-hidden
              className={`mt-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${switcherActive ? "bg-foreground" : "bg-muted-foreground/40"}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-background transition-transform ${switcherActive ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                Show language switcher in footer
                {switcherSaving && <Loader2 size={10} className="animate-spin text-muted-foreground" />}
              </span>
              <span className="text-[9px] text-muted-foreground leading-relaxed">Runtime flag — applies on the next app load (no rebuild).</span>
            </span>
          </button>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Default language</span>
            <select
              value={defaultLang}
              onChange={(e) => setDefaultLang(e.target.value)}
              className="h-8 rounded-md border border-input bg-background text-sm px-2"
            >
              {[...selected].map((code) => {
                const m = ALL_LANGUAGE_METADATA[code];
                return <option key={code} value={code}>{m ? `${m.flag} ${m.nativeName}` : code}</option>;
              })}
            </select>
          </div>

          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Available languages</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-8 pl-8 text-sm" placeholder="Search language…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5">
            {filtered.map((l) => {
              const locked = l.code === LOCKED;
              return (
                <label
                  key={l.code}
                  className={`flex items-center gap-2 text-sm rounded-md px-2 py-1.5 transition-colors ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted"}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(l.code)}
                    disabled={locked || saving}
                    onChange={() => toggle(l.code)}
                    className="accent-primary"
                  />
                  <span className="text-base leading-none">{l.flag}</span>
                  <span className="flex-1 text-foreground">{l.nativeName}</span>
                  <span className="text-[10px] text-muted-foreground">{l.englishName}{locked ? " · required" : ""}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-border flex items-center gap-3 shrink-0">
        <Button onClick={save} disabled={saving || loading || !dirty}>
          {saving ? <><Loader2 size={11} className="animate-spin" />Saving…</> : <><Save size={11} />Save settings</>}
        </Button>
        <span className="text-[10px] text-muted-foreground">Build-time · rebuild required</span>
      </div>
    </div>
  );
}
