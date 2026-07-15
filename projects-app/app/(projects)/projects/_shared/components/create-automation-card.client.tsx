"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { announcePendingAutomation } from "./pending-automations.client";
import { AUTOMATION_TYPES, type AutomationType } from "../automation-type";
import { PROJECT_CATEGORIES } from "../categories";
import { useUiLang } from "../use-ui-lang";
import { createAutomationStrings } from "../create-automation-i18n";

// FROZEN STANDARD (step 224 L6, PHASE 1 of an automation's birth) — the big "+" card that closes every
// category grid (and the projects index). It opens the CREATION MODAL, the manual entry point of an
// automation. Everything funnels into the ONE canonical entry POST /api/projects/create (step 214: one
// function, one entry, many callers — the terminal today, an AI agent tomorrow; never a second code path).
//
// The modal asks, in this order (owner's spec):
//   1. TYPE — Stream, Instanced or Chained (step 234, made real in 234.3). IMMUTABLE: to change it you delete
//      the automation and create a new one. CHAINED IS CANVAS-ONLY (step 236.3, owner's rule): it renders
//      exclusively as a group container on the global canvas and never appears in a category hub grid — so
//      (a) a category grid's OWN "+" card (fixed `category` prop) never offers Chained at all, only the
//      root/global-canvas "+" does, and (b) picking Chained hides the category section entirely (below) —
//      the owner never has to think about where its files physically live.
//   2. NAME — optional (skippable; derived from the instruction when empty).
//   3. INSTRUCTION — MANDATORY: what this automation must do. It is the seed the activation Quiz (step 227)
//      turns into nodes.
//   4. CATEGORY — where it lives: FIXED when the modal is opened from a category grid, CHOSEN from a
//      dropdown when it is opened from the GLOBAL CANVAS (step 225 G4 — the canvas spans every category, so
//      it must ask which one the new automation belongs to). SKIPPED for Chained (see above) — the create()
//      call sends the silent default "other" regardless of `pickedCategory`.
// Result: a bare automation page from the frozen template, born "In development" (its 3 default nodes are
// drafts) — phase 2 (the Quiz) then walks the owner from the instruction to real nodes.
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

/** The creation form itself — ONE dialog, reused by the "+" card and by the global canvas. */
export function CreateAutomationDialog({
  open, onOpenChange, category, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Fixed category (a category grid). Omit to let the owner pick one (the global canvas). */
  category?: string;
  /** The created automation, "category/slug" — the canvas opens its Quiz with it. */
  onCreated?: (automation: string) => void;
}) {
  const uiLang = useUiLang();
  const L = createAutomationStrings(uiLang);
  const TYPE_TEXT: Record<AutomationType, { title: string; description: string }> = {
    stream: { title: L.typeStreamTitle, description: L.typeStreamDesc },
    instanced: { title: L.typeInstancedTitle, description: L.typeInstancedDesc },
    chained: { title: L.typeChainedTitle, description: L.typeChainedDesc },
  };
  // CHAINED IS CANVAS-ONLY (step 236.3) — a category grid's own "+" (fixed `category`) never offers it; only
  // the root/global-canvas "+" (no fixed category) does.
  const availableTypes = category ? AUTOMATION_TYPES.filter((t) => t.type !== "chained") : AUTOMATION_TYPES;
  const [type, setType] = useState<AutomationType>("stream");
  const [name, setName] = useState("");
  const [instruction, setInstruction] = useState("");
  const [pickedCategory, setPickedCategory] = useState<string>(PROJECT_CATEGORIES[0].slug);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<{ code: string; name: string } | null>(null);
  // The categories are read LIVE (not from the compiled constant): a category created here must appear in
  // the dropdown at once, before the rebuild that serves its hub route has finished.
  const [categories, setCategories] = useState<{ slug: string; title: string }[]>(PROJECT_CATEGORIES);
  // VoiceInput refs (step 236.4 added it to the two long free-text fields; owner reversed the "short fields
  // stay text-only" convention afterward — every field in this modal gets a mic now, VoiceInput already
  // supports HTMLInputElement, not just HTMLTextAreaElement).
  const nameRef = useRef<HTMLInputElement | null>(null);
  const instrRef = useRef<HTMLTextAreaElement | null>(null);

  const loadCategories = async () => {
    const r = await fetch("/api/projects/categories", { cache: "no-store" });
    if (r.ok) setCategories(((await r.json()) as { categories: { slug: string; title: string }[] }).categories);
  };

  // The Quiz speaks the project's DEFAULT language — show it before the owner commits (owner's rule).
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const r = await fetch("/api/projects/language", { cache: "no-store" });
      if (r.ok) setLang((await r.json()) as { code: string; name: string });
      if (!category) await loadCategories();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  async function create() {
    if (!instruction.trim()) {
      toast.error(L.errInstructionRequired);
      return;
    }
    // CHAINED IS CANVAS-ONLY (step 236.3): its files still need a physical home (/projects/other/<slug>/,
    // same convention as any other automation) but the owner never chooses it — "other" is the silent
    // default, since a Chained automation is never meant to be found via a category hub anyway.
    const target = type === "chained" ? "other" : (category ?? pickedCategory);
    const project = slugify(name) || `automation-${Date.now().toString(36).slice(-5)}`;
    setBusy(true);
    try {
      const r = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: target, project, title: name.trim() || undefined, type, instruction }),
      });
      const d = (await r.json()) as { ok?: boolean; url?: string; error?: string; category?: string; project?: string };
      if (!r.ok || !d.ok) {
        toast.error(d.error ?? L.errCreateAutomation);
        return;
      }
      toast.success(L.automationCreated, {
        description: L.automationCreatedDesc,
        duration: 12000,
      });
      // The optimistic pending card (step 242.3): show a muted spinner card in the grid AT ONCE, so the page
      // never seems to "vanish" while the static hub waits for its rebuild. A chained automation is
      // canvas-only (never in a category grid), so it has no pending card. The category the card lives in is
      // the resolved target (a chained one silently uses "other", but we skip it anyway).
      const cat = d.category ?? target;
      const slug = d.project ?? project;
      if (type !== "chained") {
        announcePendingAutomation({
          automation: `${cat}/${slug}`, category: cat, slug,
          title: name.trim() || slug, url: d.url ?? `/projects/${cat}/${slug}`,
        });
      }
      setName("");
      setInstruction("");
      onOpenChange(false);
      onCreated?.(`${cat}/${slug}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wide dialog (owner's request): the design decisions here — type, brief, category — need room. */}
      <DialogContent className="max-h-[88vh] w-[95vw] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{L.dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{L.typeLabel}</Label>
            <div className="grid gap-2">
              {availableTypes.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setType(t.type)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    type === t.type ? `${t.badge} bg-accent/40` : "hover:bg-accent/30"
                  }`}
                >
                  <span className="font-medium">{TYPE_TEXT[t.type]?.title ?? t.title}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{TYPE_TEXT[t.type]?.description ?? t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-name">{L.nameLabel}</Label>
            <Input ref={nameRef} id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={L.namePlaceholder} />
            <VoiceInput targetRef={nameRef} value={name} onChange={setName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-instr">{L.instrLabel}</Label>
            <Textarea
              ref={instrRef}
              id="a-instr"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={5}
              placeholder={L.instrPlaceholder}
            />
            <VoiceInput targetRef={instrRef} value={instruction} onChange={setInstruction} />
            <p className="text-xs text-muted-foreground">
              {L.instrHint}
            </p>
          </div>

          {/* CHAINED IS CANVAS-ONLY (step 236.3) — no category question at all; a short note explains why
              instead of asking the owner to pick a category that will never be used to find this automation. */}
          {type === "chained" ? (
            <p className="rounded-md border border-dashed p-2.5 text-xs text-muted-foreground">
              {L.chainedNoCategoryNote}
            </p>
          ) : (
          <div className="space-y-1.5">
            <Label>{L.categoryLabel}</Label>
            {category ? (
              <Input value={category} readOnly className="bg-muted/50" />
            ) : (
              // From the ROOT / the GLOBAL CANVAS there is no ambient category — the owner picks one. Category
              // CREATION moved out of this dialog entirely (owner's fix, 2026-07-14): it lives in its own
              // AddCategoryButton on the Projects root page, so creating a category and immediately trying to
              // use it here can no longer race the background rebuild that makes it live — see the hint below.
              <Select value={pickedCategory} onValueChange={setPickedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={L.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!category && (
              <p className="text-xs text-muted-foreground">{L.categoryHintUseAddButton}</p>
            )}
          </div>
          )}

          {/* The Quiz's language, stated EXPLICITLY (owner's requirement) — the design session must never
              surprise the owner with its language. It is the project's default language; English only when
              none is set. Prefix/suffix (not one templated string) so the language NAME stays bold in JSX. */}
          <p className="rounded-md border border-dashed p-2.5 text-xs text-muted-foreground">
            {L.langNoticePrefix} <span className="font-medium text-foreground">{lang?.name ?? "…"}</span>{L.langNoticeSuffix}
          </p>

          <Button onClick={create} disabled={busy} className="w-full">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {L.createBtn}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The "+" card that closes a category grid — the category is FIXED to that grid's. */
export function CreateAutomationCard({ category }: { category: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const uiLang = useUiLang();
  const L = createAutomationStrings(uiLang);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card/50 p-5 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="size-8" />
        <span className="text-sm font-medium">{L.addAutomationCard}</span>
      </button>
      <CreateAutomationDialog
        open={open}
        onOpenChange={setOpen}
        category={category}
        onCreated={() => router.refresh()}
      />
    </>
  );
}

/** The "+" card that closes the ROOT grid, beside the global canvas (step 225 G6). Same dialog, one
 *  difference the per-category card cannot have: the root spans EVERY category, so the owner CHOOSES where
 *  the new automation lives (the dropdown). A folder icon — it creates a project, not a node. */
export function CreateAutomationRootCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const uiLang = useUiLang();
  const L = createAutomationStrings(uiLang);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-h-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card/50 p-5 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground"
      >
        <FolderPlus className="size-8" />
        <span className="text-sm font-medium">{L.createProjectCard}</span>
        <span className="text-xs">{L.createProjectCardHint}</span>
      </button>
      <CreateAutomationDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
