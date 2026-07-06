"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Info, X } from "lucide-react";
import { type CSSProperties, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FLOW_EDGES, FLOW_NODES, type FlowNode } from "../_data/flow";
import { projectAction } from "../_data/actions";
import { ontologyAttr } from "../_data/ontology-attrs";

// Action color → the left-accent hex the node border uses (matches the ontology palette,
// step 188-R). A single-action node carries that action's color; a trunk ("all") or
// multi-action node stays neutral (its actions are shown as badges in the info panel).
const ACTION_ACCENT: Record<string, string> = {
  blue: "#3b82f6", amber: "#f59e0b", green: "#22c55e", violet: "#8b5cf6",
  rose: "#f43f5e", cyan: "#06b6d4", orange: "#f97316", teal: "#14b8a6",
};
function nodeAccent(actions: FlowNode["data"]["info"]["actions"]): string | undefined {
  if (!Array.isArray(actions) || actions.length !== 1) return undefined;
  return ACTION_ACCENT[projectAction(actions[0]).color];
}

// Interactive process diagram (react-flow). Its shape is DATA in _data/flow.ts —
// the project's EXECUTION SCHEMA (contract R6): reshape the diagram there, never
// in this component. Nodes are movable and edges follow them, but the canvas
// cannot create or delete anything: the data file stays the single source of
// truth of the diagram. Clicking a node opens the info panel with EVERYTHING the
// node is (kind, actions, condition, task, processes, tools, env keys, io,
// connections) — R8. Each node is tinted by its Action color (ontology, 188-R).
// One typed-facet badge on a node card — labelled by its ontology entity, its meaning on hover
// (shared ONTOLOGY_ATTRS vocabulary). Truncates + never wraps so the facet strip stays one line.
function FacetBadge({
  label,
  tooltip,
  variant,
  style,
}: {
  label: string;
  tooltip: string;
  variant?: "secondary" | "outline";
  style?: CSSProperties;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Badge
          variant={variant}
          style={style}
          className="max-w-24 shrink-0 truncate px-1.5 py-0 text-[10px] font-normal"
        >
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-56 text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// A node card in two vertical zones (188-R "ontology as UI"): the TOP strip shows the node's
// typed facets (kind + up to two actions + a condition marker) in ONE line — each a badge
// labelled by its ontology entity with a hover tooltip; the BOTTOM zone is the description.
// Clicking the node opens the full info panel (R8). Everything here is DATA from _data/flow.ts.
function ProcessNode({ data, selected }: NodeProps<FlowNode>) {
  const info = data.info;
  const accent = nodeAccent(info.actions);
  const actionIds = Array.isArray(info.actions) ? info.actions : [];
  const shown = actionIds.slice(0, 2);
  const extra = actionIds.length - shown.length;
  return (
    <div
      className={
        "w-56 overflow-hidden rounded-md border bg-background text-sm shadow-sm " +
        (selected ? "border-primary" : "border-border")
      }
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1">
        <FacetBadge
          label={ontologyAttr(info.kind).label}
          tooltip={ontologyAttr(info.kind).tooltip}
          variant="secondary"
        />
        {info.actions === "all" ? (
          <FacetBadge label="all" tooltip={ontologyAttr("action").tooltip} variant="outline" />
        ) : (
          shown.map((id) => {
            const a = projectAction(id);
            const c = ACTION_ACCENT[a.color];
            return (
              <FacetBadge
                key={id}
                label={a.title}
                tooltip={ontologyAttr("action").tooltip}
                variant="outline"
                style={c ? { borderColor: c, color: c } : undefined}
              />
            );
          })
        )}
        {extra > 0 && (
          <span className="shrink-0 text-[10px] text-muted-foreground">+{extra}</span>
        )}
        {info.condition && (
          <FacetBadge
            label={ontologyAttr("condition").label}
            tooltip={info.condition}
            variant="outline"
          />
        )}
      </div>
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="line-clamp-2">{data.label}</span>
        <Info className="ml-auto mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { process: ProcessNode };

function PanelList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="space-y-1">
      <h4 className="font-medium">{title}</h4>
      <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProcessFlow() {
  const [nodes, , onNodesChange] = useNodesState<FlowNode>(FLOW_NODES);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = activeId
    ? nodes.find((node) => node.id === activeId)
    : undefined;

  // The node's connections, derived from the edges — shown in the info panel.
  const links = useMemo(() => {
    if (!activeId) {
      return { incoming: [], outgoing: [] };
    }
    const labelOf = (id: string) =>
      nodes.find((node) => node.id === id)?.data.label ?? id;
    return {
      incoming: FLOW_EDGES.filter((edge) => edge.target === activeId).map(
        (edge) => labelOf(edge.source)
      ),
      outgoing: FLOW_EDGES.filter((edge) => edge.source === activeId).map(
        (edge) => labelOf(edge.target)
      ),
    };
  }, [activeId, nodes]);

  const info = active?.data.info;

  return (
    <TooltipProvider>
    <div className="relative h-[420px] overflow-hidden rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={FLOW_EDGES}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => setActiveId(node.id)}
        onPaneClick={() => setActiveId(null)}
        nodesConnectable={false}
        deleteKeyCode={null}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      {active && info && (
        <aside className="absolute inset-y-0 right-0 w-72 space-y-4 overflow-y-auto border-l bg-background/95 p-4 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium">{active.data.label}</h3>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {info.kind}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close node info"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setActiveId(null)}
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-muted-foreground">{info.summary}</p>
          {/* Which Action branches flow through this node (ontology, 188-R). */}
          {info.actions && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Actions:</span>
              {info.actions === "all" ? (
                <Badge variant="outline">all</Badge>
              ) : (
                info.actions.map((id) => {
                  const a = projectAction(id);
                  const accent = ACTION_ACCENT[a.color];
                  return (
                    <Badge key={id} variant="outline" style={accent ? { borderColor: accent, color: accent } : undefined}>
                      {a.title}
                    </Badge>
                  );
                })
              )}
            </div>
          )}
          {info.condition && (
            <div className="space-y-1">
              <h4 className="font-medium">Condition</h4>
              <p className="text-muted-foreground">{info.condition}</p>
            </div>
          )}
          {info.task && (
            <div className="space-y-1">
              <h4 className="font-medium">Task</h4>
              <p className="whitespace-pre-line text-muted-foreground">
                {info.task}
              </p>
            </div>
          )}
          <PanelList title="Processes" items={info.processes} />
          <PanelList title="Tools" items={info.tools} />
          <PanelList title="Environment keys" items={info.envKeys} />
          {info.io && (
            <div className="space-y-1">
              <h4 className="font-medium">Inputs → outputs</h4>
              <p className="text-muted-foreground">
                {JSON.stringify(info.io.in)} → {JSON.stringify(info.io.out)}
              </p>
            </div>
          )}
          {(links.incoming.length > 0 || links.outgoing.length > 0) && (
            <div className="space-y-1">
              <h4 className="font-medium">Connections</h4>
              <ul className="space-y-1 text-muted-foreground">
                {links.incoming.map((label) => (
                  <li key={`in-${label}`}>← {label}</li>
                ))}
                {links.outgoing.map((label) => (
                  <li key={`out-${label}`}>→ {label}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}
    </div>
    </TooltipProvider>
  );
}
