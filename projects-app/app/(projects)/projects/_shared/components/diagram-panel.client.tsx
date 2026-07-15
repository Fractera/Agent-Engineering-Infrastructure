"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { NodeContract, NodeFunction } from "../node-contract";
import { RoleBadge, IoTypeBadge } from "./role-badge.client";

// FROZEN STANDARD (step 223.C.1) — the Diagram panel: it renders a node's contract exactly as the
// spec describes (README §1). Each node shows its name + description directly, then PRE-CLOSED
// accordions: the "Instruction" (the system instruction that generated the functions) and one card
// per FUNCTION (its typed inputs → return + rules) — less for a human, more so the AI agent knows what
// is called. This is deliberately NOT the Telegram Notes react-flow panel (do not port that). The
// graph canvas + the active-node orange highlight come in later 223.C slices; this slice renders the
// node contracts (and an honest empty state) from data.
function typeLine(params: Record<string, string>): string {
  const entries = Object.entries(params);
  if (!entries.length) return "()";
  return `{ ${entries.map(([k, v]) => `${k}: ${v}`).join(", ")} }`;
}

function FunctionCard({ fn }: { fn: NodeFunction }) {
  return (
    <div className="space-y-1 rounded-md border p-2">
      <div className="flex items-center gap-2">
        <p className="font-mono text-xs font-medium">{fn.name}</p>
        {fn.externalAi && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 ring-1 ring-amber-500/25 dark:text-amber-400">
            external AI call
          </span>
        )}
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        in {typeLine(fn.paramsIn)} → {fn.returns}
      </p>
      {fn.rules && fn.rules.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
          {fn.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      {/* An external-AI function shows the FULL system instruction it passes (never truncated), plus
          how the AI's result binds back to the typed return (step 223.C). */}
      {fn.externalAi && (
        <div className="mt-1 space-y-1 rounded border border-amber-500/30 bg-amber-500/5 p-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
            System instruction (sent to the external AI)
          </p>
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">
            {fn.externalAi.systemInstruction}
          </pre>
          {fn.externalAi.resultMapping && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">Result → </span>
              {fn.externalAi.resultMapping}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function NodeCard({ node }: { node: NodeContract }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div>
        {/* The node badges (2026-07-15) — the SAME badges as on the diagram node, one to one: the coloured
            ROLE badge and, next to it, the neutral I/O-TYPE badge (control-panel, dashboard, …). */}
        {(node.role || node.ioType) && (
          <div className="mb-1 flex flex-wrap items-center gap-1">
            <RoleBadge role={node.role} />
            <IoTypeBadge type={node.ioType} />
          </div>
        )}
        <p className="text-sm font-semibold">{node.name}</p>
        <p className="text-xs text-muted-foreground">{node.description}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          in {typeLine(node.in)} → out {typeLine(node.out)} · {node.run}
        </p>
      </div>
      <Accordion type="single" collapsible className="rounded-md border px-3">
        {node.instruction && (
          <AccordionItem value="instruction">
            <AccordionTrigger className="text-sm">Instruction</AccordionTrigger>
            <AccordionContent>
              <p className="whitespace-pre-line text-xs text-muted-foreground">{node.instruction}</p>
            </AccordionContent>
          </AccordionItem>
        )}
        <AccordionItem value="functions">
          <AccordionTrigger className="text-sm">
            Functions ({node.functions.length})
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {node.functions.length ? (
                node.functions.map((fn) => <FunctionCard key={fn.name} fn={fn} />)
              ) : (
                <p className="text-xs text-muted-foreground">No functions declared for this node yet.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function DiagramPanel({ nodes }: { nodes: NodeContract[] }) {
  if (!nodes.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No diagram nodes declared yet. The Diagram is the SINGLE source of truth for how this automation
        works (Master &amp; Instance). Design nodes from the user cases — each node is a typed container
        of functions living only in <code>_nodes/&lt;nodeId&gt;/</code>. See app/(projects)/README.md,
        &ldquo;The diagram standard&rdquo; and &ldquo;The node → functions contract&rdquo;.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {nodes.map((node) => (
        <NodeCard key={node.id} node={node} />
      ))}
    </div>
  );
}
