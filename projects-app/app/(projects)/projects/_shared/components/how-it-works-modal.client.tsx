"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, ClipboardCopy, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";

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
  const L = automationMenuStrings(useUiLang());
  const [result, setResult] = useState<Result>(null);
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState<unknown | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !automation) return;
    let alive = true;
    setLoading(true);
    setCollected(null);
    fetch(`/api/projects/how-it-works?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { result?: Result } | null) => { if (alive) setResult(d?.result ?? null); })
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
        body: JSON.stringify({ automation, collected }),
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
              <p className="whitespace-pre-line text-sm">{result.text}</p>
              <p className="text-xs text-muted-foreground">
                {L.updatedAt.replace("{date}", new Date(result.updatedAt).toLocaleString())}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{L.howItWorksEmpty}</p>
          )}

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
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{L.collectedHint}</p>
                <Button variant="ghost" size="sm" onClick={copyCollected} className="shrink-0 gap-1">
                  <ClipboardCopy className="size-3.5" />
                  {L.copyJson}
                </Button>
              </div>
              <pre className="max-h-64 overflow-auto rounded bg-muted/40 p-2 text-xs">
                {JSON.stringify(collected, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
