"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUiLang } from "../../../use-ui-lang";
import { activationStrings } from "../../../activation-i18n";
import { ActivationQuiz } from "../../../components/activation-quiz.client";
import type { ActivationSchema } from "../../../activation";
import { resolveLocalized, resolveErrorText } from "../../../localized-text";
import { notifyRunCompleted } from "../../../use-run-refresh";
import { ParamField, RunReportChips, type RunReport } from "../view/console";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// ADMIN file — may import view/ (the allowed direction), must NEVER be imported by view/ and never
// reach into another entity. Enforced by `npm run check:entity-imports`.
//
// THE CONTROL PANEL — ADMIN CHROME (step 254.3): the MANAGEMENT plane of the step-196 gateway — fork
// creation/listing/launch (an instanced automation's runs) and the design surface (the fork-activation
// Quiz shown when the activation is not designed yet). A visitor never sees any of this.

type Fork = { id: string; title: string; specialization: string; overrides: string; status: string };

/** The "not designed yet" empty state + the design Quiz — an honest state, never a dead end (step 239). */
export function DesignEmptyState({ automation }: { automation: string }) {
  const lang = useUiLang();
  const L = activationStrings(lang);
  const [designOpen, setDesignOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4" data-controlpanel-admin="design">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Rocket className="size-4" /> {L.emptyTitle}
      </p>
      <p className="max-w-3xl text-sm text-muted-foreground">{L.emptyBody}</p>
      <div>
        <Button size="sm" variant="secondary" onClick={() => setDesignOpen(true)}>
          <Sparkles className="size-3.5" /> {L.emptyCta}
        </Button>
      </div>
      <ActivationQuiz
        automation={automation}
        entity="fork-activation"
        entityName={L.layerTitle}
        open={designOpen}
        onClose={() => setDesignOpen(false)}
        onApplied={() => toast.success(L.emptyCta, { description: L.emptyBody, duration: 12000 })}
      />
    </div>
  );
}

function safeParams(overrides: string): Record<string, unknown> {
  try {
    const o = JSON.parse(overrides || "{}") as { params?: Record<string, unknown> };
    return o.params ?? {};
  } catch {
    return {};
  }
}

/** The INSTANCED fork manager: the create form (declared params + a run title), the runs list, launch. */
export function InstancedForkManager({ automation, schema }: { automation: string; schema: ActivationSchema }) {
  const lang = useUiLang();
  const L = activationStrings(lang);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const p of schema.params) if (p.default !== undefined) init[p.key] = p.default;
    return init;
  });
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [forks, setForks] = useState<Fork[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [report, setReport] = useState<Record<string, RunReport[]>>({});

  const loadForks = useCallback(async () => {
    const r = await fetch(`/api/projects/instances/list?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
    if (r.ok) setForks(((await r.json()) as { instances?: Fork[] }).instances ?? []);
  }, [automation]);

  useEffect(() => { void loadForks(); }, [loadForks]);

  const create = useCallback(async () => {
    setCreating(true);
    try {
      const r = await fetch(`/api/projects/instances/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automation,
          title: title.trim() || resolveLocalized(schema.title, lang) || "Run",
          params: values,
        }),
      });
      if (!r.ok) { toast.error(L.createFailed); return; }
      setTitle("");
      toast.success(L.created);
      await loadForks();
    } finally { setCreating(false); }
  }, [automation, title, values, schema, lang, L, loadForks]);

  const run = useCallback(async (instanceId: string) => {
    setRunningId(instanceId);
    try {
      const r = await fetch(`/api/projects/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, instanceId }),
      });
      const d = (await r.json()) as {
        ok?: boolean; nodes?: RunReport[]; error?: string; reason?: string; params?: string[];
      };
      if (!r.ok) {
        // The executor's REFUSAL — precise, never a silent no-op (step 241 E1/E3).
        const detail = d.reason === "missing-params" && d.params?.length
          ? L.missingParams.replace("{k}", d.params.join(", "))
          : d.error ?? d.reason ?? "";
        toast.error(L.refused.replace("{k}", detail), { duration: 15000 });
        return;
      }
      setReport((m) => ({ ...m, [instanceId]: d.nodes ?? [] }));
      (d.ok ? toast.success : toast.error)(d.ok ? L.runOk : L.runFailed, {
        description: d.ok ? undefined : resolveErrorText(d.nodes?.find((n) => n.status === "fail")?.error, lang),
        duration: 15000,
      });
      if (d.ok) notifyRunCompleted(automation);
      await loadForks();
    } finally { setRunningId(null); }
  }, [automation, L, loadForks]);

  return (
    <div className="space-y-4" data-controlpanel-admin="forks">
      {/* THE FORM — one field per DECLARED parameter. Nothing here is hardcoded per automation. */}
      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">{L.runTitleLabel}</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L.runTitlePlaceholder} />
        </div>

        {schema.params.map((p) => (
          <ParamField
            key={p.key}
            param={p}
            value={values[p.key]}
            onChange={(v) => setValues((s) => ({ ...s, [p.key]: v }))}
            requiredHint={L.requiredHint}
            optionalHint={L.optional}
          />
        ))}

        <div className="md:col-span-2">
          <Button onClick={create} disabled={creating} className="gap-2">
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            {creating ? L.creating : L.create}
          </Button>
        </div>
      </div>

      {/* THE RUNS — each one a fork carrying its own settings, each launchable on its own. */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{L.runsTitle}</h3>
        {!forks.length && <p className="text-sm text-muted-foreground">{L.noRuns}</p>}
        {forks.map((f) => {
          const params = safeParams(f.overrides);
          const rep = report[f.id];
          return (
            <div key={f.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">{f.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {Object.entries(params).map(([k, v]) => `${k}: ${String(v)}`).join(" · ") || "—"}
                  </p>
                </div>
                <Button size="sm" onClick={() => run(f.id)} disabled={runningId === f.id} className="gap-2">
                  {runningId === f.id ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  {runningId === f.id ? L.running : L.run}
                </Button>
              </div>
              {rep?.length ? <RunReportChips nodes={rep} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
