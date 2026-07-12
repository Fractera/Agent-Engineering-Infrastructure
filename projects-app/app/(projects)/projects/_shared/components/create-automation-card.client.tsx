"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AUTOMATION_TYPES, type AutomationType } from "../automation-type";
import { PROJECT_CATEGORIES } from "../categories";

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
//   4. CATEGORY — where it lives: FIXED when the modal is opened from a category grid, CHOSEN from a
//      dropdown when it is opened from the GLOBAL CANVAS (step 225 G4 — the canvas spans every category, so
//      it must ask which one the new automation belongs to).
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
  const [type, setType] = useState<AutomationType>("stream");
  const [name, setName] = useState("");
  const [instruction, setInstruction] = useState("");
  const [pickedCategory, setPickedCategory] = useState<string>(PROJECT_CATEGORIES[0].slug);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<{ code: string; name: string } | null>(null);
  // The categories are read LIVE (not from the compiled constant): a category created here must appear in
  // the dropdown at once, before the rebuild that serves its hub route has finished.
  const [categories, setCategories] = useState<{ slug: string; title: string }[]>(PROJECT_CATEGORIES);
  const [newCategory, setNewCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const loadCategories = async () => {
    const r = await fetch("/api/projects/categories", { cache: "no-store" });
    if (r.ok) setCategories(((await r.json()) as { categories: { slug: string; title: string }[] }).categories);
  };

  async function createCategory() {
    const slug = slugify(categoryName);
    if (!slug) { toast.error("Give the category a name."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/projects/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title: categoryName.trim() }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) { toast.error(d.error ?? "Could not create the category."); return; }
      toast.success(`Category "${categoryName.trim()}" created.`, {
        description: "Its hub page is being built (1-2 min); you can already put an automation in it.",
        duration: 12000,
      });
      setCategories((c) => [...c.filter((x) => x.slug !== slug), { slug, title: categoryName.trim() }]);
      setPickedCategory(slug);
      setNewCategory(false);
      setCategoryName("");
    } finally { setBusy(false); }
  }

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
      toast.error("Tell the automation what it must do — the instruction is required.");
      return;
    }
    const target = category ?? pickedCategory;
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
        toast.error(d.error ?? "Could not create the automation.");
        return;
      }
      toast.success("Automation created — building the page (1-2 min).", {
        description: "It opens in development: its nodes are drafts until you build them.",
        duration: 12000,
      });
      setName("");
      setInstruction("");
      onOpenChange(false);
      onCreated?.(`${d.category ?? target}/${d.project ?? project}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wide dialog (owner's request): the design decisions here — type, brief, category — need room. */}
      <DialogContent className="max-h-[88vh] w-[95vw] max-w-3xl overflow-y-auto">
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
            {category ? (
              <Input value={category} readOnly className="bg-muted/50" />
            ) : (
              // From the ROOT / the GLOBAL CANVAS there is no ambient category — the owner picks one, or
              // CREATES a new one right here (step 225 G6): a category is code (a slug in the union + an
              // entry in PROJECT_CATEGORIES + its own hub route), so the "+" materializes all of it.
              <div className="flex w-full items-center gap-2">
                <Select value={pickedCategory} onValueChange={setPickedCategory}>
                  <SelectTrigger className="w-full flex-1">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {categories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setNewCategory((v) => !v)}
                  title="Create a new category"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            )}

            {newCategory && !category && (
              <div className="mt-2 space-y-2 rounded-md border border-dashed p-3">
                <Label htmlFor="c-name" className="text-xs">New category name</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="c-name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Finance"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={createCategory} disabled={busy || !categoryName.trim()}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Create"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A category is permanent: its slug is a fixed English identifier and is never renamed.
                </p>
              </div>
            )}
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

/** The "+" card that closes a category grid — the category is FIXED to that grid's. */
export function CreateAutomationCard({ category }: { category: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card/50 p-5 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="size-8" />
        <span className="text-sm font-medium">Add automation</span>
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-h-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card/50 p-5 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground"
      >
        <FolderPlus className="size-8" />
        <span className="text-sm font-medium">Create project</span>
        <span className="text-xs">Choose its category in the dialog</span>
      </button>
      <CreateAutomationDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
