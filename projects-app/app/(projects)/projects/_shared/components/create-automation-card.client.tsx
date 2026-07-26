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
import { VoiceInput } from "./voice-input.client";
import { announcePendingAutomation } from "./pending-automations.client";
import { PROJECT_CATEGORIES } from "../categories";
import { useUiLang } from "../use-ui-lang";
import { createAutomationStrings } from "../create-automation-i18n";

// THE CREATION MODAL — the manual entry point of an automation. The big "+" card that closes every category
// grid (and the projects index) opens it. Everything funnels into the ONE canonical entry
// POST /api/projects/create (step 214: one function, one entry, many callers — the form today, an AI agent
// tomorrow; never a second code path).
//
// STEP 301 — BIRTH IS A v2 CLONE. Create now CLONES the frozen v2 stream starter (_lib/starters/stream/en)
// into a new category folder. The modal therefore asks only two things (owner's flow):
//   1. NAME  — the automation's title.
//   2. CATEGORY — where it lives: FIXED from a category grid, CHOSEN from a dropdown on the global canvas.
// There is NO upfront brief and NO type choice anymore: the DESCRIPTION is authored AFTER birth, in the
// use-cases Quiz (the newborn lands frozen, on an empty canvas, inviting the owner to describe its cases);
// and only the STREAM v2 starter exists today (per-type v2 starters are a later step). The newborn is a
// frozen v2 clone with a fresh uuid and empty use-cases.
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

// The server's contract is /^[a-z][a-z0-9-]*$/ (frozen-project-starter SLUG_RE). A non-Latin name slugifies
// to "" (fallback fires) — but a name like "Тест 2" slugifies to "2", which STARTS WITH A DIGIT and used to
// bounce off the server with a kebab-case 400 the owner could not get past (step 247 fix). The derived slug
// is an internal detail — repair it silently instead of failing: prefix digit-led remains, fall back to a
// generated id when nothing usable survives.
const deriveProjectSlug = (name: string): string => {
  const raw = slugify(name);
  if (/^[a-z]/.test(raw)) return raw;
  if (raw) return `automation-${raw}`.slice(0, 40).replace(/-$/, "");
  return `automation-${Date.now().toString(36).slice(-5)}`;
};

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
  const [name, setName] = useState("");
  const [pickedCategory, setPickedCategory] = useState<string>(PROJECT_CATEGORIES[0].slug);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<{ code: string; name: string } | null>(null);
  // The categories are read LIVE (not from the compiled constant): a category created here must appear in
  // the dropdown at once, before the rebuild that serves its hub route has finished.
  const [categories, setCategories] = useState<{ slug: string; title: string }[]>(PROJECT_CATEGORIES);
  // VoiceInput ref — the owner may dictate the automation's name.
  const nameRef = useRef<HTMLInputElement | null>(null);

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
    if (!name.trim()) {
      toast.error(L.errNameRequired);
      return;
    }
    const target = category ?? pickedCategory;
    const project = deriveProjectSlug(name);
    setBusy(true);
    try {
      const r = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: target, project, title: name.trim() }),
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
      // never seems to "vanish" while the static hub waits for its rebuild.
      const cat = d.category ?? target;
      const slug = d.project ?? project;
      announcePendingAutomation({
        automation: `${cat}/${slug}`, category: cat, slug,
        title: name.trim() || slug, url: d.url ?? `/projects/${cat}/${slug}`,
      });
      setName("");
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
          <div className="space-y-1.5">
            <Label htmlFor="a-name">{L.nameLabel}</Label>
            <Input ref={nameRef} id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={L.namePlaceholder} />
            <VoiceInput targetRef={nameRef} value={name} onChange={setName} />
          </div>

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

          {/* STEP 301 — the description is authored AFTER birth: the newborn lands frozen on an empty canvas
              and the owner describes its use-cases there, in the Quiz. This note states that next step and the
              Quiz's language (the project's default; English when none is set). */}
          <p className="rounded-md border border-dashed p-2.5 text-xs text-muted-foreground">
            {L.afterBirthNoticePrefix} <span className="font-medium text-foreground">{lang?.name ?? "…"}</span>{L.afterBirthNoticeSuffix}
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
