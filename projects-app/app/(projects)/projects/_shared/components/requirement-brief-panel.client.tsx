"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";
import type { EntityType } from "@/lib/entity-store";

// THE REQUIREMENT BRIEF PANEL (step 238 P5-P9) — the authoring surface for the five entities that had NONE
// until now (Dashboard/Analytics/Calendar/Map/Processes): a free-text field for "the next thing I need
// here", same shape as the chain brief. Saving POSTs to that entity's own
// <entity>-architecture/add-new-transport-task-entry route (entity-architecture-routes.ts) — which ARCHIVES
// the outgoing brief into entity_history before overwriting (same rule as the chain brief, step 238 P4), so
// nothing the owner wrote is ever silently lost. One component, reused for all five — they are structurally
// identical (a single free-text transport field, automation-scoped, ref='').
export function RequirementBriefPanel({
  entityType,
  automation,
}: {
  entityType: EntityType;
  automation?: string;
}) {
  const L = automationMenuStrings(useUiLang());
  const [brief, setBrief] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!automation) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/projects/${entityType}-architecture/extract-current-state-for-architecture?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { current?: { requirementBrief?: string }; pending?: boolean } | null) => {
        if (!alive) return;
        setBrief(d?.current?.requirementBrief ?? "");
        setPending(Boolean(d?.pending));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [automation, entityType]);

  async function save() {
    if (!automation) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/projects/${entityType}-architecture/add-new-transport-task-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, ref: "", payload: { brief } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setPending(brief.trim().length > 0);
      toast.success(L.requirementSaved);
    } catch {
      toast.error(L.requirementSaveFail);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{L.requirementLabel}</span>
        {pending && <span className="text-xs text-amber-600 dark:text-amber-400">{L.requirementPendingHint}</span>}
      </div>
      <Textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder={L.requirementPlaceholder}
        className="min-h-24 text-sm"
      />
      <Button size="sm" onClick={save} disabled={saving} className="gap-2">
        {saving && <Loader2 className="size-3.5 animate-spin" />}
        {L.requirementSave}
      </Button>
    </div>
  );
}
