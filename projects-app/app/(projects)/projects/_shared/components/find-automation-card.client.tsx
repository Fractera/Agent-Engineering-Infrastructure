"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, HelpCircle, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VoiceInput } from "./voice-input.client";
import { useUiLang } from "../use-ui-lang";
import { findStrings } from "../find-automation-i18n";

// INTELLIGENT AUTOMATION SEARCH (step 258 phase 3, owner's placement) — the FIRST card in the projects grid,
// ahead of the "Group automations" card. The product will ship with tens→a thousand ready automations; a new
// owner describes what he needs in words and is shown the closest ones (found by meaning in the catalog, whose
// embedding is each automation's "How it works" text). Reuses the ONE VoiceInput primitive (step 232).

type FindResult = { automation: string; title: string; url: string; snippet: string };

export function FindAutomationCard() {
  const router = useRouter();
  const L = findStrings(useUiLang());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [results, setResults] = useState<FindResult[] | null>(null);
  const queryRef = useRef<HTMLTextAreaElement | null>(null);
  // ONE SEARCH PER OPENING (owner 2026-07-19): a successful search dismisses the whole search tool so the
  // result cards get the modal to themselves; a new search = close and reopen (openFresh resets the state,
  // so a reopened modal never shows a previous run's results).
  const found = results !== null && results.length > 0;

  function openFresh() {
    setQuery("");
    setResults(null);
    setOpen(true);
  }

  // CATALOG BACKFILL BUTTON (owner 2026-07-19) — a fresh server ships its starter automations with "How it
  // works" texts on disk but an EMPTY search catalog (nothing has ingested them yet), so the first search
  // finds nothing and reads as broken. This calls the step-258 backfill (cheap, idempotent, no model) and
  // reports how many entered the catalog.
  async function refresh() {
    if (refreshBusy) return;
    setRefreshBusy(true);
    try {
      const r = await fetch(`/api/projects/catalog/reindex-all`, { method: "POST" });
      if (!r.ok) { toast.error(L.refreshFailed); return; }
      const d = (await r.json()) as { indexed?: number; skipped?: number };
      toast.success(
        L.refreshDone.replace("{n}", String(d.indexed ?? 0)).replace("{m}", String(d.skipped ?? 0)),
      );
    } catch {
      toast.error(L.refreshFailed);
    } finally {
      setRefreshBusy(false);
    }
  }

  async function search() {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setResults(null);
    try {
      const r = await fetch(`/api/projects/find`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!r.ok) { toast.error(L.searchFailed); return; }
      const d = (await r.json()) as { results?: FindResult[] };
      setResults(d.results ?? []);
    } catch {
      toast.error(L.searchFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* THE CARD — same soft accent as the "Group automations" card (bg-muted/30) so it reads as "not one of
          the four categories", leading the grid. */}
      <button
        type="button"
        onClick={openFresh}
        className="group flex min-h-40 flex-col items-start rounded-xl border bg-muted/30 p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex w-full items-start justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold leading-tight">
            <Search className="size-4 shrink-0" /> {L.cardTitle}
          </h3>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{L.cardHint}</p>
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!busy && !refreshBusy) setOpen(v); }}>
        {/* max-h 600px + inner scroll (owner 2026-07-19): the result cards scroll INSIDE the modal, the
            page never grows behind it. */}
        <DialogContent className="max-h-[min(600px,85vh)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="size-4" /> {L.modalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* The search tool — gone after a SUCCESSFUL search (see `found` above): the results own the
                modal. An empty result keeps the form so the owner can reword and retry in place. */}
            {!found && (
              <>
                <p className="text-sm text-muted-foreground">{L.modalBody}</p>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">{L.queryLabel}</label>
                  <Textarea
                    ref={queryRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={L.queryPlaceholder}
                    className="min-h-20 bg-background text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) search(); }}
                  />
                  <VoiceInput targetRef={queryRef} value={query} onChange={setQuery} disabled={busy} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button onClick={search} disabled={busy || !query.trim()} className="gap-2">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    {busy ? L.searching : L.searchButton}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={refresh} disabled={refreshBusy || busy} className="gap-2">
                      {refreshBusy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                      {refreshBusy ? L.refreshing : L.refreshButton}
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex size-6 cursor-help items-center justify-center" aria-label={L.refreshHelp}>
                            <HelpCircle className="size-4 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-72">{L.refreshHelp}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </>
            )}

            {results !== null && (
              <div className="space-y-2 pt-1">
                {results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{L.noResults}</p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">
                      {L.resultsHeading.replace("{n}", String(results.length))}
                    </p>
                    <ul className="space-y-1.5">
                      {results.map((res) => (
                        <li key={res.automation}>
                          <button
                            type="button"
                            aria-label={L.openAutomation}
                            onClick={() => { setOpen(false); router.push(res.url); }}
                            className="group flex w-full items-start justify-between gap-2 rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{res.title}</p>
                              {res.snippet && (
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{res.snippet}</p>
                              )}
                            </div>
                            <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="pt-1 text-xs text-muted-foreground">{L.newSearchHint}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
