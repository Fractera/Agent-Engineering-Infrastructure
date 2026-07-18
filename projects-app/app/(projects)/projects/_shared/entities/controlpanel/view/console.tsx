"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUiLang } from "../../../use-ui-lang";
import { activationStrings } from "../../../activation-i18n";
import { VoiceInput } from "../../../components/voice-input.client";
import type { ActivationParam, ActivationSchema } from "../../../activation";
import { resolveLocalized, resolveErrorText } from "../../../localized-text";
import { notifyRunCompleted } from "../../../use-run-refresh";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// VIEW file — never import admin/ or another entity. Enforced by `npm run check:entity-imports`.
//
// THE CONTROL PANEL — VIEW CORE (step 254.3, ROUTE-V3 law 3). The INTERACTION plane of the step-196
// gateway: the declared-params form + the one-shot ask ("how much is Apple stock") + the inline result.
// This is what a PUBLIC visitor uses — activation is usage, not management. Fork management, the design
// quiz and the demo notice are ADMIN chrome (../admin/chrome.tsx); this file never imports them.

export type RunReport = { node: string; status: string; ms: number; error?: string };
/** The console's own last-ask result — node chips + an optional short error line, shown INLINE.
 *  `notice` (step 254.8e) — a green informational line (a scheduled ask's confirmation). */
export type AskReport = { ok: boolean; nodes: RunReport[]; error?: string; notice?: string };

/** One DECLARED parameter, rendered by its declared type. A `longtext` gets the shared voice primitive —
 *  the same one every input of the product uses (step 232), never a second microphone. */
export function ParamField({
  param, value, onChange, requiredHint, optionalHint,
}: {
  param: ActivationParam;
  value: unknown;
  onChange: (v: unknown) => void;
  requiredHint: string;
  optionalHint: string;
}) {
  const lang = useUiLang();
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const str = value === undefined || value === null ? "" : String(value);
  // A longtext field spans the FULL width of the grid (step 243.2).
  const wrapperClass = param.type === "longtext" ? "space-y-1 md:col-span-2" : "space-y-1";

  return (
    <div className={wrapperClass}>
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {resolveLocalized(param.label, lang)}
        <span className="text-[10px] uppercase tracking-wide opacity-70">
          {param.required ? requiredHint : optionalHint}
        </span>
      </label>

      {param.type === "longtext" ? (
        <>
          <Textarea ref={areaRef} value={str} onChange={(e) => onChange(e.target.value)} className="min-h-20 w-full text-sm" />
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
            <option key={o.value} value={o.value}>{resolveLocalized(o.label, lang)}</option>
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

      {param.help && <p className="text-xs text-muted-foreground">{resolveLocalized(param.help, lang)}</p>}
    </div>
  );
}

/** The node-chips row an ask/run reports with — shared by the view console and the admin fork list. */
export function RunReportChips({ nodes }: { nodes: RunReport[] }) {
  const lang = useUiLang();
  if (!nodes.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {nodes.map((n) => (
        <span
          key={n.node}
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
            n.status === "ok"
              ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/40 text-rose-700 dark:text-rose-400"
          }`}
          title={resolveErrorText(n.error, lang)}
        >
          {n.status === "ok" ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
          {n.node} · {n.ms}ms
        </span>
      ))}
    </div>
  );
}

/** The STREAM one-shot ask console: declared fields → POST /api/projects/run → inline result. */
export function StreamAskConsole({ automation, schema }: { automation: string; schema: ActivationSchema }) {
  const lang = useUiLang();
  const L = activationStrings(lang);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const p of schema.params) if (p.default !== undefined) init[p.key] = p.default;
    return init;
  });
  const [asking, setAsking] = useState(false);
  const [askReport, setAskReport] = useState<AskReport | null>(null);

  const ask = useCallback(async () => {
    setAsking(true);
    setAskReport(null);
    try {
      const r = await fetch(`/api/projects/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, input: values }),
      });
      const d = (await r.json()) as {
        ok?: boolean; nodes?: RunReport[]; error?: string; reason?: string; params?: string[];
        scheduled?: boolean; dueAt?: string;
      };
      if (!r.ok) {
        // The executor's REFUSAL — precise, shown inline (never a dead end, never a toast: owner's rule).
        const detail = d.reason === "missing-params" && d.params?.length
          ? L.missingParams.replace("{k}", d.params.join(", "))
          : d.error ?? d.reason ?? "";
        setAskReport({ ok: false, nodes: [], error: L.refused.replace("{k}", detail) });
        return;
      }
      // SCHEDULED (step 254.8e): the ask carried a future "when" — confirm the due time inline; the
      // Processes timeline shows it as a grey planned bar until the ticker runs it.
      if (d.scheduled) {
        const t = d.dueAt ? new Date(d.dueAt).toLocaleString() : "";
        setAskReport({ ok: true, nodes: [], error: undefined, notice: L.scheduledFor.replace("{t}", t) });
        return;
      }
      setAskReport({
        ok: Boolean(d.ok),
        nodes: d.nodes ?? [],
        error: d.ok ? undefined : (d.nodes?.find((n) => n.status === "fail")?.error ?? d.error),
      });
      // Live refresh (step 243.2): a successful run may have written rows other sections show.
      if (d.ok) notifyRunCompleted(automation);
    } finally {
      setAsking(false);
    }
  }, [automation, values, L]);

  return (
    <div className="space-y-3 rounded-lg border p-4" data-controlpanel-console="ask">
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      <div>
        <Button onClick={ask} disabled={asking} className="gap-2">
          {asking ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
          {asking ? L.asking : L.askButton}
        </Button>
      </div>

      {askReport ? (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          {askReport.error ? (
            <p className="text-sm text-rose-700 dark:text-rose-400">{resolveErrorText(askReport.error, lang)}</p>
          ) : null}
          {askReport.notice ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400" data-controlpanel-scheduled="1">{askReport.notice}</p>
          ) : null}
          <RunReportChips nodes={askReport.nodes} />
        </div>
      ) : null}
    </div>
  );
}
