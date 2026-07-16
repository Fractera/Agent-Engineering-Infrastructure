"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, ClipboardCopy, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";
import { builderStrings } from "../builder-i18n";
import { ARCHITECTURE_OBJECT_TYPES } from "../architecture-object-types";
import { VoiceInput } from "./voice-input.client";

// THE "HOW IT WORKS" MODAL (step 237, top of the hamburger menu; two-button split in 238) — TWO separate
// actions, on purpose (owner's request): "Собрать данные" gathers the automation's current architecture
// (GET fetch-current-automation-architecture-snapshot — the JSON2 format, step 238) and shows it raw with a
// Copy button, so the owner can judge for himself how complete/coherent the data package is, or paste it
// into any external AI tool. "Получить ответ от ИИ" stays DISABLED until data has been collected in this
// modal session; it then sends THAT SAME collected object (never a fresh re-gather) to the model for a
// plain-language description, persisted so the next visit shows it immediately.
type Result = { text: string; updatedAt: string } | null;

export function HowItWorksModal({
  automation,
  open,
  onOpenChange,
}: {
  automation?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const lang = useUiLang();
  const L = automationMenuStrings(lang);
  const B = builderStrings(lang);
  const [showTypes, setShowTypes] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [loading, setLoading] = useState(false);
  // The AI-interaction block collapses when an answer already exists (owner 2026-07-16): a divider + the
  // "Get answer from AI" button re-opens it. With no answer yet the block is open from the start.
  const [aiOpen, setAiOpen] = useState(false);
  // The collected JSON + its typing hide behind a "Details" toggle (owner 2026-07-16) — the raw dump is for
  // verification, not the default reading flow.
  const [showDetails, setShowDetails] = useState(false);
  const [collected, setCollected] = useState<unknown | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [generating, setGenerating] = useState(false);
  // The owner's OWN request that shapes the AI's answer (step 241) — spoken or typed, free-form. Empty is
  // fine: the model then writes the default short prose.
  const [prompt, setPrompt] = useState("");
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open || !automation) return;
    let alive = true;
    setLoading(true);
    setCollected(null);
    fetch(`/api/projects/how-it-works?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { result?: Result } | null) => {
        if (!alive) return;
        setResult(d?.result ?? null);
        setAiOpen(!d?.result);
        setShowDetails(false);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, automation]);

  async function collectData() {
    if (!automation) return;
    setCollecting(true);
    try {
      const r = await fetch(`/api/projects/fetch-current-automation-architecture-snapshot?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setCollected(d);
    } catch {
      toast.error(L.collectFail);
    } finally {
      setCollecting(false);
    }
  }

  async function copyCollected() {
    if (!collected) return;
    await navigator.clipboard.writeText(JSON.stringify(collected, null, 2));
    toast.success(L.copied);
  }

  async function generate() {
    if (!automation || !collected) return;
    setGenerating(true);
    try {
      const r = await fetch("/api/projects/how-it-works/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, collected, prompt: prompt.trim() || undefined }),
      });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; result?: Result; error?: string } | null;
      if (r.ok && d?.result) {
        setResult(d.result);
      } else {
        toast.error(d?.error ?? L.generateFail);
      }
    } catch {
      toast.error(L.generateFail);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[600px] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{L.howItWorksTitle}</DialogTitle>
          <DialogDescription>{L.howItWorksDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : result ? (
            <div className="space-y-2">
              <p className="whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm">{result.text}</p>
              <p className="text-xs text-muted-foreground">
                {L.updatedAt.replace("{date}", new Date(result.updatedAt).toLocaleString())}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{L.howItWorksEmpty}</p>
          )}

          {!aiOpen ? (
            /* An answer already exists → the AI interface rests collapsed behind a divider (owner
               2026-07-16); this button only re-opens it, generation still requires collecting data. */
            <div className="space-y-2 border-t pt-3">
              <Button variant="outline" onClick={() => setAiOpen(true)} className="gap-2">
                <Sparkles className="size-4" />
                {L.getAiAnswer}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 border-t pt-3">
              {/* The owner's own request (step 241) — the field the modal was missing: it decides HOW the answer is
                  written (length, structure, emphasis), not just that one is produced. Optional; blank = default
                  short prose. Voice via the shared VoiceInput primitive (232) — never a second mic. */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{L.howItWorksAskLabel}</label>
                <Textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={L.howItWorksAskPlaceholder}
                  className="min-h-16 text-sm"
                />
                <VoiceInput targetRef={promptRef} value={prompt} onChange={setPrompt} />
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={collectData} disabled={collecting} className="gap-2">
                  {collecting ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
                  {collecting ? L.collecting : L.collectData}
                </Button>
                <Button onClick={generate} disabled={!collected || generating} className="gap-2">
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {generating ? L.generating : L.getAiAnswer}
                </Button>
              </div>

              {collected != null && (
                <div className="space-y-2 rounded-lg border p-3">
                  {/* Buttons FIRST, LEFT-ALIGNED (owner 2026-07-16): the copy button used to sit far right and
                      fell out of view when the JSON forced horizontal scroll — the scroll is fine, the buttons
                      must always stay visible in the left corner. The raw JSON + its typing hide behind the
                      "Details" toggle (owner 2026-07-16). */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={copyCollected} className="shrink-0 gap-1">
                      <ClipboardCopy className="size-3.5" />
                      {L.copyJson}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowDetails((v) => !v)} className="shrink-0 gap-1">
                      {showDetails ? L.howItWorksHideDetails : L.howItWorksDetails}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{L.collectedHint}</p>
                  {showDetails && (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* The object's TYPING (owner 2026-07-16): view + copy the TypeScript typing of this JSON, so
                            the owner verifies the structure and a coding agent receiving the object alongside the
                            types cannot break its shape when writing an updated one. */}
                        <Button variant="ghost" size="sm" onClick={() => setShowTypes((v) => !v)} className="shrink-0 gap-1">
                          {showTypes ? B.hideTypes : B.showTypes}
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="shrink-0 gap-1"
                          onClick={async () => { await navigator.clipboard.writeText(ARCHITECTURE_OBJECT_TYPES); toast.success(L.copied); }}
                        >
                          <ClipboardCopy className="size-3.5" />
                          {B.copyTypes}
                        </Button>
                      </div>
                      {showTypes && (
                        <pre className="max-h-64 overflow-auto rounded bg-muted/40 p-2 text-xs">
                          {ARCHITECTURE_OBJECT_TYPES}
                        </pre>
                      )}
                      <pre className="max-h-64 overflow-auto rounded bg-muted/40 p-2 text-xs">
                        {JSON.stringify(collected, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
