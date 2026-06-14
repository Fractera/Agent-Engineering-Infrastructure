"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SlotLayoutPreview, type SlotName } from "./slot-layout-preview.client";

// Parallel-routes selector — ported from the reference HeaderLayoutDashboardDialog. Lets the owner
// choose which named layout slots are active, with the animated preview. Storage is OUR on-disk
// platform-config.json (no Supabase): loads/saves the whole config via /api/config/platform,
// updating only the `slots` map. header/footer are locked on; toggling `center` cascades to
// centerHeader/centerFooter.

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

type Cfg = Record<string, unknown>;

export function ParallelRoutesSelector({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<Cfg>({});
  const [active, setActive] = useState<Set<SlotName>>(new Set(LIST_ORDER));
  const [serverActive, setServerActive] = useState<Set<SlotName>>(new Set(LIST_ORDER));
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
      // A slot is active unless explicitly false (missing key = default on).
      const set = new Set<SlotName>(LIST_ORDER.filter((s) => slots[s] !== false));
      setActive(new Set(set));
      setServerActive(new Set(set));
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isDirty = LIST_ORDER.some((s) => active.has(s) !== serverActive.has(s));

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
      const nextConfig = { ...config, slots };
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
        <button type="button" onClick={onBack} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
        <span className="text-xs font-semibold text-orange-500">Parallel routes · setup</span>
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
