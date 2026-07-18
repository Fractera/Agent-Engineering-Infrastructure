"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  const [results, setResults] = useState<FindResult[] | null>(null);
  const queryRef = useRef<HTMLTextAreaElement | null>(null);

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
        onClick={() => setOpen(true)}
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

      <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="size-4" /> {L.modalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
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
            <Button onClick={search} disabled={busy || !query.trim()} className="gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {busy ? L.searching : L.searchButton}
            </Button>

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
