"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useUiLang } from "../use-ui-lang";
import { createAutomationStrings } from "../create-automation-i18n";
import { isPendingDeletion, clearPendingDeletion } from "./pending-deletions.client";

const POLL_MS = 8000;

/** The compact one-line status row (owner's fix): the SAME four signals the automation's own page shows in
 *  its top bar (AutomationStatePill's type badge + active state, AutomationModeIndicators' Hook/Cron pills)
 *  — condensed to fit atop a card. Computed server-side (category-hub.server.tsx already reads the
 *  filesystem for the card itself) and passed down as plain data, no extra client fetch. */
export type CardStatus = {
  typeLabel: string;
  /** The type badge's own established colour classes (automation-type.ts) — kept as-is, NOT part of the
   *  active/inactive blue-or-grey scheme below (type is fixed identity, not a toggle). */
  typeBadgeClass: string;
  active: boolean;
  activeLabel: string;
  hook: boolean;
  hookLabel: string;
  cron: boolean;
  cronLabel: string;
};

function StatusRow({ status }: { status: CardStatus }) {
  const dot = (on: boolean, label: string) => (
    <span className={on ? "font-bold text-blue-600 dark:text-blue-400" : "font-normal text-muted-foreground"}>
      •&nbsp;{label}
    </span>
  );
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <span className={`rounded border px-1.5 py-0.5 font-medium ${status.typeBadgeClass}`}>{status.typeLabel}</span>
      {dot(status.active, status.activeLabel)}
      {dot(status.hook, status.hookLabel)}
      {dot(status.cron, status.cronLabel)}
    </div>
  );
}

// ONE hub card, now a client component so it can check (owner's fix, mirrors the pending-CREATION card)
// whether it was JUST deleted by this same browser and, if so, show a muted spinner instead of a normal
// link — polling its own URL until the background rebuild actually removes the route (404/4xx/5xx), then
// dropping out of view entirely. A card that was NOT just deleted here renders exactly as before (same
// markup/classes as the previous inline `<Link>` in category-hub.server.tsx) — zero visible change for the
// overwhelming common case, PLUS the new status row on top.
export function AutomationCardTile({
  category, slug, href, title, description, badges, more, status,
}: {
  category: string;
  slug: string;
  href: string;
  title: string;
  description: string;
  badges: string[];
  more: number;
  status: CardStatus;
}) {
  const L = createAutomationStrings(useUiLang());
  const [deleting, setDeleting] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    setDeleting(isPendingDeletion(category, slug));
  }, [category, slug]);

  useEffect(() => {
    if (!deleting) return;
    let alive = true;
    const t = setInterval(async () => {
      try {
        const r = await fetch(href, { method: "GET", cache: "no-store", redirect: "manual" });
        if (!alive) return;
        if (r.status === 404 || r.status >= 400) {
          clearPendingDeletion(category, slug);
          setGone(true);
          clearInterval(t);
        }
      } catch { /* network hiccup during the pm2 reload window — keep polling */ }
    }, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [deleting, href, category, slug]);

  if (gone) return null;

  if (deleting) {
    return (
      <div className="flex flex-col rounded-xl border border-dashed bg-muted/30 p-5 opacity-70" aria-busy="true">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-muted-foreground">{title}</h3>
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{L.pendingDeleting}</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <StatusRow status={status} />
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{title}</h3>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      {description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>}
      {(badges.length > 0 || more > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {badges.map((b) => (
            <span key={b} className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
              {b}
            </span>
          ))}
          {more > 0 && (
            <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">+{more}</span>
          )}
        </div>
      )}
    </Link>
  );
}
