"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
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

// THE "HOW IT WORKS" MODAL (step 237, top of the hamburger menu) — content comes from a NEW _data
// component the AI itself writes (_data/how-it-works.json via lib/how-it-works.ts), not hand-authored.
// "Get answer from AI" sends the automation's own declared components (README/diagram/node instructions)
// to the model and asks for a short, plain-language description; the result is persisted so the next
// visit shows it immediately without asking the model again.
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
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !automation) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/projects/how-it-works?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { result?: Result } | null) => { if (alive) setResult(d?.result ?? null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, automation]);

  async function generate() {
    if (!automation) return;
    setGenerating(true);
    try {
      const r = await fetch("/api/projects/how-it-works/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
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
          <Button onClick={generate} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? L.generating : L.getAiAnswer}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
