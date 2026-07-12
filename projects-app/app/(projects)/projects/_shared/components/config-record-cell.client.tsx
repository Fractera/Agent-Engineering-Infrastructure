"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TableColumn, TableRow } from "../table-config";

// The CLOSED renderer registry of the universal dashboard table (step 228) — one renderer per column type.
// A new column is DATA in the config (table-config.ts), never new JSX; a genuinely new visual = a new type
// here + a note in the canon (column-kinds.ts). This is the telegram-notes record-cell generalized: no
// dependency on that automation's actions/ontology — a badge's color comes from options.colorFrom or the
// value itself.

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
  onDetail: (row: TableRow) => void;
  onDelete: (row: TableRow) => void;
};

export function ConfigRecordCell({ col, row, ctx }: { col: TableColumn; row: TableRow; ctx: CellCtx }) {
  const v = row.values[col.source];
  switch (col.type) {
    case "badge": {
      // colorFrom may name a value field (per-row color) or be a fixed color token.
      const token = col.options?.colorFrom ? String(row.values[col.options.colorFrom] ?? col.options.colorFrom) : "neutral";
      return <Badge className={COLOR_STYLE[token] ?? COLOR_STYLE.neutral}>{String(v ?? "") || "—"}</Badge>;
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
    case "number": {
      const n = typeof v === "number" ? v : Number(v);
      const shown = Number.isFinite(n) ? n.toLocaleString() : String(v ?? "—");
      return <span className="block whitespace-nowrap text-right tabular-nums">{shown}{col.options?.suffix ? ` ${col.options.suffix}` : ""}</span>;
    }
    case "date": {
      const emph = col.options?.emphasizeIfFuture && isFuture(v);
      return <span className={"whitespace-nowrap " + (emph ? "text-foreground" : "text-muted-foreground")}>{fmtDate(v)}</span>;
    }
    case "link":
      return v ? (
        <a href={String(v)} className="underline underline-offset-4" target="_blank" rel="noreferrer">Open</a>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case "image":
      return v ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={String(v)} alt="" className="size-10 rounded object-cover" />
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case "actions":
      if (col.options?.action === "delete") {
        return (
          <Button variant="ghost" size="icon" aria-label="Delete row" className="text-muted-foreground hover:text-destructive" onClick={() => ctx.onDelete(row)}>
            <Trash2 className="size-4" />
          </Button>
        );
      }
      return (
        <Button variant="ghost" size="sm" onClick={() => ctx.onDetail(row)}>Details</Button>
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
