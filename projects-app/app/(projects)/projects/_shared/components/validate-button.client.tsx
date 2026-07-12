"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// FROZEN STANDARD (step 223.C.5) — a button that runs the diagram-invariant validator for this
// automation and shows the result: green when the diagram is the only source of truth (no behaviour or
// functions outside it), red with the list of violations otherwise.
type Result = { ok: boolean; violations: string[] };

export function ValidateButton({ automation }: { automation: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/validate?automation=${encodeURIComponent(automation)}`, {
        cache: "no-store",
      });
      if (r.ok) setResult((await r.json()) as Result);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={run} disabled={busy}>
        <ShieldCheck className="size-3.5" />
        {busy ? "Validating…" : "Validate diagram"}
      </Button>
      {result &&
        (result.ok ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-4" /> The diagram is the single source of truth — no violations.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-rose-600 dark:text-rose-400">
            {result.violations.map((v, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                {v}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
