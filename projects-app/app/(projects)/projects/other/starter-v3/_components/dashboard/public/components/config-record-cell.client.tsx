"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TableColumn, TableRow } from "../../table-config";
import { dashboardAdminStrings } from "../../i18n";

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

// IMAGE SOURCE RESOLVER (step 310). An `image` column may point at a ready URL OR at a stored file id /
// array of ids (e.g. finance.storageIds = ["abc"]). Resolve: array → first; absolute URL / leading-slash →
// as-is; a bare id → the folder's own files door `./api/files?key=<id>` (same pattern the old finance table
// used). Empty → null (renders "—"). Backward-compatible: columns already carrying URLs are untouched.
function imageSrc(v: unknown): string | null {
  const first = Array.isArray(v) ? v[0] : v;
  const s = first == null ? "" : String(first).trim();
  if (!s) return null;
  if (/^(https?:)?\/\//i.test(s) || s.startsWith("/")) return s;
  const base = typeof location !== "undefined" ? location.pathname.replace(/\/+$/, "") + "/api" : "/api";
  return `${base}/files?key=${encodeURIComponent(s)}`;
}

export type CellCtx = {
  expanded: boolean;
  onToggleExpand: () => void;
  onDetail: (row: TableRow) => void;
  onDelete: (row: TableRow) => void;
  /** For `action:"live"` (step 243) — the column carries its own `options.liveUrl`. */
  onLive: (row: TableRow, col: TableColumn) => void;
};

export function ConfigRecordCell({ col, row, ctx, lang }: { col: TableColumn; row: TableRow; ctx: CellCtx; lang: string }) {
  const L = dashboardAdminStrings(lang);
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
          onClick={(e) => { e.stopPropagation(); ctx.onToggleExpand(); }}
          className={"block max-w-md text-left " + (ctx.expanded ? "" : "line-clamp-1")}
          title={L.clickToExpand}
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
        <a href={String(v)} className="underline underline-offset-4" target="_blank" rel="noreferrer">{L.open}</a>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case "image": {
      const src = imageSrc(v);
      return src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-10 rounded object-cover" />
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    }
    case "actions":
      if (col.options?.action === "delete") {
        return (
          <Button variant="ghost" size="icon" aria-label={L.deleteRow} className="text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); ctx.onDelete(row); }}>
            <Trash2 className="size-4" />
          </Button>
        );
      }
      if (col.options?.action === "live") {
        return (
          <Button variant="ghost" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); ctx.onLive(row, col); }}>
            <RefreshCw className="size-3.5" /> {L.live}
          </Button>
        );
      }
      return (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); ctx.onDetail(row); }}>{L.details}</Button>
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
