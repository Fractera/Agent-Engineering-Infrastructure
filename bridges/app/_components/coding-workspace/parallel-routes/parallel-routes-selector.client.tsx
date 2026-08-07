"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ParallelRoutingHelp } from "../help-note.client";
import { SlotLayoutPreview, type SlotName } from "./slot-layout-preview.client";

// Parallel routing — its own page in the first section of the menu (owner, 2026-08-08), directly
// under Languages. It is shown OPEN: the choice a user makes here is which named layout slots the
// app renders, and a choice is easier to make when its options are visible rather than folded into
// a dropdown. The master switch lives here too — one page owns one subject.
//
// Storage is OUR on-disk platform-config.json: loads/saves the whole config via /api/config/platform,
// updating `parallelRouting` and the `slots` map. header/footer are locked on; toggling `center`
// cascades to centerHeader/centerFooter.

const SLOT_LABELS: Record<SlotName, string> = {
  header: "Header",
  footer: "Footer",
  promoScreen: "Promo Screen",
  left: "Left",
  right: "Right",
  centerHeader: "Center Header",
  center: "Center",
  centerFooter: "Center Footer",
};

const LOCKED: SlotName[] = ["header", "footer"];
const LIST_ORDER: SlotName[] = ["header", "promoScreen", "left", "right", "centerHeader", "center", "centerFooter", "footer"];

// A new project starts with the CENTER slot only (owner, 2026-08-08). The old default was the
// opposite — a missing key counted as ON, so every fresh server started with all eight slots
// active, which is the busiest possible layout offered to someone who has not chosen anything yet.
// A project begins as one column and grows sideways when its owner asks for it.
const DEFAULT_SLOTS: SlotName[] = ["header", "center", "footer"];

type Cfg = Record<string, unknown>;

export function ParallelRoutesSelector({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<Cfg>({});
  const [active, setActive] = useState<Set<SlotName>>(new Set(DEFAULT_SLOTS));
  const [serverActive, setServerActive] = useState<Set<SlotName>>(new Set(DEFAULT_SLOTS));
  const [routing, setRouting] = useState(false);
  const [serverRouting, setServerRouting] = useState(false);
  const [hovered, setHovered] = useState<SlotName | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/platform", { credentials: "include" });
      const data = await res.json();
      const cfg = (data.config ?? {}) as Cfg;
      setConfig(cfg);
      const slots = (cfg.slots ?? {}) as Record<string, boolean>;
      // An unanswered slot falls back to the starting mode, not to "on": a config that has never
      // been saved must read as the centre column, exactly what a new project gets.
      const set = new Set<SlotName>(
        LIST_ORDER.filter((s) => (typeof slots[s] === "boolean" ? slots[s] : DEFAULT_SLOTS.includes(s)))
      );
      setActive(new Set(set));
      setServerActive(new Set(set));
      const on = cfg.parallelRouting === true;
      setRouting(on);
      setServerRouting(on);
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isDirty = routing !== serverRouting || LIST_ORDER.some((s) => active.has(s) !== serverActive.has(s));

  const toggle = (slot: SlotName) => {
    if (LOCKED.includes(slot)) return;
    setActive((prev) => {
      const next = new Set(prev);
      if (slot === "center") {
        if (next.has("center")) {
          next.delete("center");
          next.delete("centerHeader");
          next.delete("centerFooter");
        } else {
          next.add("center");
          next.add("centerHeader");
          next.add("centerFooter");
        }
      } else {
        next.has(slot) ? next.delete(slot) : next.add(slot);
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const slots: Record<string, boolean> = {};
      for (const s of LIST_ORDER) slots[s] = active.has(s);
      const nextConfig = { ...config, parallelRouting: routing, slots };
      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: nextConfig }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setConfig(nextConfig);
      setServerActive(new Set(active));
      setServerRouting(routing);
      toast.success("Saved — reload the app to see the layout");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-background flex flex-col z-30">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          Parallel routing
          <ParallelRoutingHelp />
        </span>
        {/* The master switch stands on the page, not in a menu: it decides whether anything below
            it applies at all, so hiding it one level deeper than what it governs is backwards. */}
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Switch checked={routing} onCheckedChange={setRouting} disabled={saving || loading} />
          Use parallel routing
        </label>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          <SlotLayoutPreview active={active} hovered={hovered} />

          <div className="flex-1 px-4 py-4 flex flex-col min-h-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground mb-2">Active slots</p>
            <div className="border-b border-border mb-3" />
            <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
              {LIST_ORDER.map((slot) => {
                const locked = LOCKED.includes(slot);
                const disabledByCenter = (slot === "centerHeader" || slot === "centerFooter") && !active.has("center");
                return (
                  <label
                    key={slot}
                    className={`flex items-center gap-2 text-sm rounded-md px-2 py-1.5 transition-colors ${locked || disabledByCenter ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-muted"}`}
                    onMouseEnter={() => setHovered(slot)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <input
                      type="checkbox"
                      checked={active.has(slot)}
                      disabled={locked || disabledByCenter || saving}
                      onChange={() => toggle(slot)}
                      className="accent-primary"
                    />
                    <span className="flex flex-col leading-tight flex-1">
                      <span className="text-foreground">{SLOT_LABELS[slot]}</span>
                      {locked && <span className="text-[10px] text-muted-foreground">required</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="pt-3 mt-auto shrink-0">
              <Button className="w-full" disabled={!isDirty || saving || loading} onClick={save}>
                {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
