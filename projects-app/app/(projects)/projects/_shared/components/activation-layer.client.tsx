"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Play, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUiLang } from "../use-ui-lang";
import { activationStrings } from "../activation-i18n";
import { VoiceInput } from "./voice-input.client";
import { ActivationQuiz } from "./activation-quiz.client";
import type { ActivationParam, ActivationSchema } from "../activation";

// THE ACTIVATION LAYER — the launch control panel (step 241 E3, owner's design).
//
// An INSTANCED automation runs as a FORK: every run carries its OWN settings. Which settings those are is
// CUSTOM to each automation — the coding agent decides them while designing that automation's architecture
// and writes them into its `_data/activation.ts`. This panel renders itself from that declaration, so a new
// automation gets a working control panel by writing DATA, never UI. The product presumes nothing about the
// parameters (no built-in schedules, no rate limits — if an automation wants a publish time, it declares one).
//
// IT IS A LAYER, NOT AN ACCORDION: it is mounted as a permanent full-width section beside the diagram, it is
// NOT part of the entity-visibility switches (EntityKey), and it therefore CANNOT be hidden — it exists only
// for `instanced` automations, and for them it is always there. This is the owner's rule: the launch console
// of an automation is not an optional view.
//
// NOT DESIGNED YET is an honest state, never a dead end: the panel says so and opens the fork-activation
// design surface (step 239) where the owner describes what a run should take.

type Fork = { id: string; title: string; specialization: string; overrides: string; status: string };
type RunReport = { node: string; status: string; ms: number; error?: string };

export function ActivationLayer({ automation }: { automation: string }) {
  const L = activationStrings(useUiLang());
  const [schema, setSchema] = useState<ActivationSchema | null>(null);
  const [designed, setDesigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [forks, setForks] = useState<Fork[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [report, setReport] = useState<Record<string, RunReport[]>>({});
  const [designOpen, setDesignOpen] = useState(false);

  const loadForks = useCallback(async () => {
    const r = await fetch(`/api/projects/instances/list?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
    if (r.ok) setForks(((await r.json()) as { instances?: Fork[] }).instances ?? []);
  }, [automation]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await fetch(`/api/projects/activation?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
      if (r.ok && alive) {
        const d = (await r.json()) as { designed: boolean; schema: ActivationSchema };
        setSchema(d.schema);
        setDesigned(d.designed);
        // Prefill the form with the declared defaults — the automation's own, not ours.
        const init: Record<string, unknown> = {};
        for (const p of d.schema.params) if (p.default !== undefined) init[p.key] = p.default;
        setValues(init);
      }
      if (alive) setLoading(false);
      await loadForks();
    })();
    return () => { alive = false; };
  }, [automation, loadForks]);

  const create = useCallback(async () => {
    setCreating(true);
    try {
      const r = await fetch(`/api/projects/instances/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automation,
          title: title.trim() || (schema?.title ?? "Run"),
          params: values,
        }),
      });
      if (!r.ok) { toast.error(L.createFailed); return; }
      setTitle("");
      toast.success(L.created);
      await loadForks();
    } finally { setCreating(false); }
  }, [automation, title, values, schema, L, loadForks]);

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
        description: d.ok ? undefined : d.nodes?.find((n) => n.status === "fail")?.error,
        duration: 15000,
      });
      await loadForks();
    } finally { setRunningId(null); }
  }, [automation, L, loadForks]);

  if (loading) return null;

  // NOT DESIGNED — say so, and open the surface where it gets designed (step 239): the SAME Quiz, on the
  // fork-activation entity. Its result is a requirement the coding agent turns into _data/activation.ts,
  // and then this panel builds itself. Never a dead end.
  if (!designed) {
    return (
      <section className="mx-auto w-[85vw] max-w-full px-4 py-6">
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Rocket className="size-4" /> {L.emptyTitle}
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">{L.emptyBody}</p>
          <div>
            <Button size="sm" variant="secondary" onClick={() => setDesignOpen(true)}>
              <Sparkles className="size-3.5" /> {L.emptyCta}
            </Button>
          </div>
        </div>

        <ActivationQuiz
          automation={automation}
          entity="fork-activation"
          entityName={L.layerTitle}
          open={designOpen}
          onClose={() => setDesignOpen(false)}
          onApplied={() => toast.success(L.emptyCta, { description: L.emptyBody, duration: 12000 })}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto w-[85vw] max-w-full space-y-4 px-4 py-6">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Rocket className="size-5" /> {schema?.title || L.layerTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{schema?.description || L.layerSubtitle}</p>
      </div>

      {/* THE FORM — one field per DECLARED parameter. Nothing here is hardcoded per automation. */}
      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">{L.runTitleLabel}</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L.runTitlePlaceholder} />
        </div>

        {(schema?.params ?? []).map((p) => (
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

              {rep?.length ? (
                <div className="flex flex-wrap gap-2">
                  {rep.map((n) => (
                    <span
                      key={n.node}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                        n.status === "ok"
                          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                          : "border-rose-500/40 text-rose-700 dark:text-rose-400"
                      }`}
                      title={n.error ?? ""}
                    >
                      {n.status === "ok" ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                      {n.node} · {n.ms}ms
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
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

/** One DECLARED parameter, rendered by its declared type. A `longtext` gets the shared voice primitive —
 *  the same one every input of the product uses (step 232), never a second microphone. */
function ParamField({
  param, value, onChange, requiredHint, optionalHint,
}: {
  param: ActivationParam;
  value: unknown;
  onChange: (v: unknown) => void;
  requiredHint: string;
  optionalHint: string;
}) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const str = value === undefined || value === null ? "" : String(value);

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {param.label}
        <span className="text-[10px] uppercase tracking-wide opacity-70">
          {param.required ? requiredHint : optionalHint}
        </span>
      </label>

      {param.type === "longtext" ? (
        <>
          <Textarea ref={areaRef} value={str} onChange={(e) => onChange(e.target.value)} className="min-h-20 text-sm" />
          <VoiceInput targetRef={areaRef} value={str} onChange={(v) => onChange(v)} />
        </>
      ) : param.type === "select" ? (
        <select
          value={str}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">—</option>
          {(param.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : param.type === "boolean" ? (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4"
        />
      ) : (
        <Input
          type={param.type === "number" ? "number" : param.type === "date" ? "date" : param.type === "datetime" ? "datetime-local" : "text"}
          value={str}
          onChange={(e) => onChange(param.type === "number" ? Number(e.target.value) : e.target.value)}
        />
      )}

      {param.help && <p className="text-xs text-muted-foreground">{param.help}</p>}
    </div>
  );
}
