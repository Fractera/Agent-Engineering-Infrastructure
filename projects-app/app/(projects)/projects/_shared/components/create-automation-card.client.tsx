"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AUTOMATION_TYPES, type AutomationType } from "../automation-type";

// FROZEN STANDARD (step 224 L6, PHASE 1 of an automation's birth) — the big "+" card that closes every
// category grid (and the projects index). It opens the CREATION MODAL, the manual entry point of an
// automation. Everything funnels into the ONE canonical entry POST /api/projects/create (step 214: one
// function, one entry, many callers — the terminal today, an AI agent tomorrow; never a second code path).
//
// The modal asks, in this order (owner's spec):
//   1. TYPE — Stream or Instanced. IMMUTABLE: to change it you delete the automation and create a new one.
//   2. NAME — optional (skippable; derived from the instruction when empty).
//   3. INSTRUCTION — MANDATORY: what this automation must do. It is the seed the activation Quiz (step 227)
//      turns into nodes.
//   4. CATEGORY — where it lives (the grid's own category here).
// Result: a bare automation page from the frozen template, born "In development" (its 3 default nodes are
// drafts) — phase 2 (the Quiz) then walks the owner from the instruction to real nodes.
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

export function CreateAutomationCard({ category }: { category: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AutomationType>("stream");
  const [name, setName] = useState("");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<{ code: string; name: string } | null>(null);

  // The Quiz speaks the project's DEFAULT language — show it before the owner commits (owner's rule).
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const r = await fetch("/api/projects/language", { cache: "no-store" });
      if (r.ok) setLang((await r.json()) as { code: string; name: string });
    })();
  }, [open]);

  async function create() {
    if (!instruction.trim()) {
      toast.error("Tell the automation what it must do — the instruction is required.");
      return;
    }
    const project = slugify(name) || `automation-${Date.now().toString(36).slice(-5)}`;
    setBusy(true);
    try {
      const r = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, project, title: name.trim() || undefined, type, instruction }),
      });
      const d = (await r.json()) as { ok?: boolean; url?: string; error?: string };
      if (!r.ok || !d.ok) {
        toast.error(d.error ?? "Could not create the automation.");
        return;
      }
      toast.success("Automation created — building the page (1-2 min).", {
        description: "It opens in development: its nodes are drafts until you build them.",
        duration: 12000,
      });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card/50 p-5 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="size-8" />
          <span className="text-sm font-medium">Add automation</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New automation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type — chosen once, cannot be changed later</Label>
            <div className="grid gap-2">
              {AUTOMATION_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setType(t.type)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    type === t.type ? `${t.badge} bg-accent/40` : "hover:bg-accent/30"
                  }`}
                >
                  <span className="font-medium">{t.title}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-name">Name (optional)</Label>
            <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier price watch" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-instr">What must this automation do? (required)</Label>
            <Textarea
              id="a-instr"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={5}
              placeholder="Every morning fetch the supplier prices, compare them with yesterday's, and send me the changes in Telegram."
            />
            <p className="text-xs text-muted-foreground">
              This is the seed: the automation opens in development and walks you from here to its nodes.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={category} readOnly className="bg-muted/50" />
          </div>

          {/* The Quiz's language, stated EXPLICITLY (owner's requirement) — the design session must never
              surprise the owner with its language. It is the project's default language; English only when
              none is set. */}
          <p className="rounded-md border border-dashed p-2.5 text-xs text-muted-foreground">
            The Quiz will run in <span className="font-medium text-foreground">{lang?.name ?? "…"}</span>. To
            change the default language, use the workspace settings.
          </p>

          <Button onClick={create} disabled={busy} className="w-full">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create automation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
