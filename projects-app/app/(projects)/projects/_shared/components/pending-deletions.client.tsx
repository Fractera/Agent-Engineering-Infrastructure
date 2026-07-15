"use client";

// PENDING DELETION (owner's fix) — the mirror image of pending-automations.client.tsx's optimistic
// creation card, for the OTHER end of an automation's lifecycle. The category hub grid is STATICALLY
// prerendered (same constraint as creation — see that file's own header comment), so a just-deleted
// automation's card stays visible, looking exactly clickable, until the background rebuild regenerates the
// static page. Before this fix the owner deleted an automation, was sent back to the hub, and saw the
// exact same card sitting there as if nothing had happened.
//
// Unlike creation (the dialog and the listener are both mounted on the SAME hub page, so a live
// window-event is enough), deletion happens on the AUTOMATION'S OWN page and then hard-navigates to the
// hub (`window.location.href`) — a live event dispatched just before that navigation would never reach a
// listener that isn't mounted yet. So `announcePendingDeletion` writes DIRECTLY to localStorage instead of
// (only) dispatching an event; the hub's own per-card tile (`AutomationCardTile`) reads it on its own
// mount, shows a muted spinner in place of the normal link, and polls the automation's own URL every few
// seconds — 404 (or any 4xx/5xx) means the rebuild has actually removed the route, at which point the
// entry is cleared and the card is simply dropped from view. No reload, no manual refresh.

const lsKey = (category: string) => `pending-deletions:${category}`;

type StoredEntry = { slug: string; ts: number };

function loadStored(category: string): StoredEntry[] {
  try {
    const raw = localStorage.getItem(lsKey(category));
    const arr = raw ? (JSON.parse(raw) as StoredEntry[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

/** Called by the delete modal right after a successful delete, BEFORE the hard navigation to the hub. */
export function announcePendingDeletion(category: string, slug: string): void {
  try {
    const entries = loadStored(category).filter((e) => e.slug !== slug);
    entries.push({ slug, ts: Date.now() });
    localStorage.setItem(lsKey(category), JSON.stringify(entries));
  } catch { /* quota/private mode — the card just won't show the optimistic spinner, never a crash */ }
}

/** Read once per card-tile mount: is this slug marked as pending deletion in this category? */
export function isPendingDeletion(category: string, slug: string): boolean {
  return loadStored(category).some((e) => e.slug === slug);
}

/** Called once a card tile's own poll confirms (404/4xx/5xx) that the automation is genuinely gone. */
export function clearPendingDeletion(category: string, slug: string): void {
  try {
    const entries = loadStored(category).filter((e) => e.slug !== slug);
    localStorage.setItem(lsKey(category), JSON.stringify(entries));
  } catch { /* ignore — the entry surviving one extra reload is harmless */ }
}
