"use client";

// THE NODE-ROLE BADGE (2026-07-15) — ONE component + ONE colour map, so the badge on the diagram node
// (diagram-canvas) and the one at the top of the node side panel (diagram-panel) are IDENTICAL, one to one.
// Each canonical role gets a fixed colour; a CUSTOM role falls back to a neutral slate pill. The role itself
// is authored in the node's meta.ts (NodeContract.role); this only draws it.
export const ROLE_BADGE_COLOR: Record<string, string> = {
  input: "border-sky-500/40 text-sky-700 dark:text-sky-300",
  intermediate: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  output: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
};

export function RoleBadge({ role, className = "" }: { role?: string; className?: string }) {
  if (!role) return null;
  return (
    <span
      className={`inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
        ROLE_BADGE_COLOR[role] ?? "border-border text-muted-foreground"
      } ${className}`}
      title={`Node role: ${role}`}
    >
      {role}
    </span>
  );
}

// THE SECOND BADGE (2026-07-15) — the node's concrete INPUT/OUTPUT type (control-panel, dashboard, …). Neutral,
// dashed pill so it reads as secondary to the coloured role badge; the two sit side by side.
export function IoTypeBadge({ type, className = "" }: { type?: string; className?: string }) {
  if (!type) return null;
  return (
    <span
      className={`inline-block rounded-full border border-dashed border-border px-1.5 py-0.5 text-[9px] font-medium lowercase tracking-wide text-muted-foreground ${className}`}
      title={`I/O type: ${type}`}
    >
      {type}
    </span>
  );
}
