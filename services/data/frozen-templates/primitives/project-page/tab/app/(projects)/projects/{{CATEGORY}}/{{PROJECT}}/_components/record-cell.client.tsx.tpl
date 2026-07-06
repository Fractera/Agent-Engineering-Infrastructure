"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projectAction } from "../_data/actions";
import type { ProjectColumn } from "../_data/columns";
import type { RecordRow } from "../_lib/types";

// The CLOSED renderer registry of the universal records table (ontology entity 12 Record).
// One renderer per column type — a new column is DATA in _data/columns.ts (generated from the
// graph), never new JSX. Adding a real new visual = a new type here + a gate in the canon.

// Theme-aware badge classes per Action color token (the palette the engine assigns in the
// actions registry). Unknown colors fall back to neutral.
const COLOR_STYLE: Record<string, string> = {
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent",
  green: "bg-green-500/15 text-green-600 dark:text-green-400 border-transparent",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-transparent",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-transparent",
  cyan: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-transparent",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-transparent",
  teal: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-transparent",
  neutral: "bg-muted text-muted-foreground border-transparent",
};

function fmtDate(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const d = typeof v === "number" ? new Date(v * 1000) : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function isFuture(v: unknown): boolean {
  const d = typeof v === "number" ? new Date(v * 1000) : new Date(String(v));
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

export type CellCtx = {
  expanded: boolean;
  onToggleExpand: () => void;
  onDetail: (id: string) => void;
  onDelete: (row: RecordRow) => void;
};

export function RecordCell({
  col,
  row,
  ctx,
}: {
  col: ProjectColumn;
  row: RecordRow;
  ctx: CellCtx;
}) {
  const v = row.values[col.id];
  switch (col.type) {
    case "badge": {
      const a = projectAction(String(v ?? ""));
      return (
        <Badge className={COLOR_STYLE[a.color] ?? COLOR_STYLE.neutral}>
          {a.title || "—"}
        </Badge>
      );
    }
    case "longtext":
      return (
        <button
          type="button"
          onClick={ctx.onToggleExpand}
          className={"block max-w-md text-left " + (ctx.expanded ? "" : "line-clamp-1")}
          title="Click to expand"
        >
          {String(v ?? "") || "—"}
        </button>
      );
    case "date": {
      const emph = col.options?.emphasizeIfFuture && isFuture(v);
      return (
        <span className={"whitespace-nowrap " + (emph ? "text-foreground" : "text-muted-foreground")}>
          {fmtDate(v)}
        </span>
      );
    }
    case "link":
      return v ? (
        <a href={String(v)} className="underline underline-offset-4">
          Open
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case "actions":
      if (col.options?.action === "delete") {
        return (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete record"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => ctx.onDelete(row)}
          >
            <Trash2 className="size-4" />
          </Button>
        );
      }
      return (
        <Button variant="ghost" size="sm" onClick={() => ctx.onDetail(row.id)}>
          Full text
        </Button>
      );
    case "text":
    default:
      return (
        <span className="line-clamp-1 block max-w-40 text-muted-foreground" title={String(v ?? "")}>
          {String(v ?? "") || "—"}
        </span>
      );
  }
}
