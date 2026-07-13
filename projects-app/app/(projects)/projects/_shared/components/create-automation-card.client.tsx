"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FolderPlus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { AUTOMATION_TYPES, type AutomationType } from "../automation-type";
import { PROJECT_CATEGORIES } from "../categories";
import { useUiLang } from "../use-ui-lang";
import { createAutomationStrings, type CreateAutomationStrings } from "../create-automation-i18n";
import { fill } from "../quiz-i18n";
import { countWords, MAX_CATEGORY_DESCRIPTION_WORDS } from "../word-count";

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

/** Poll the OpenAI-key forwarder until it reports `configured:true`, or a cap elapses. Fetch errors are
 *  EXPECTED here: saving the key restarts `fractera-projects` server-side (bridges/app propagateOpenAiKey),
 *  so the process is briefly unreachable — swallow those, keep polling, exactly like missing-keys-modal's
 *  `waitForKeyThenReload` (which this mirrors, minus the page reload — this panel's own local state is all
 *  that depended on the key, so a silent retry is enough). */
async function pollUntilConfigured(): Promise<boolean> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_000));
    try {
      const r = await fetch("/api/project-config/openai-key", { cache: "no-store" });
      if (r.ok) {
        const d = (await r.json()) as { configured?: boolean };
        if (d.configured) return true;
      }
    } catch { /* restarting — keep polling */ }
  }
  return false;
}

/** Inline "add/fix the OpenAI key" widget — scoped to the "new category" panel only (owner's confirmed
 *  placement, not the top of the whole dialog: the key is only needed for THIS sub-flow). Reuses the exact
 *  network sequence missing-keys-modal already established (POST the forwarder → poll → proceed), as a small
 *  embedded widget instead of a second stacked Dialog. NEVER writes the key anywhere except this one POST to
 *  /api/project-config/openai-key — that forwarder is the only correct path (step 208: one key, one store). */
function InlineOpenAiKeyPanel({ L, onSaved }: { L: CreateAutomationStrings; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const apiKey = value.trim();
    if (!apiKey) return;
    setBusy(true);
    try {
      const r = await fetch("/api/project-config/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (!r.ok) {
        const info = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(info?.error ?? L.errKeyMissing);
        return;
      }
      const ok = await pollUntilConfigured();
      if (!ok) { toast.error(L.errTranslateFailed); return; }
      setValue("");
      onSaved(); // parent clears needsKey and auto-retries createCategory() with what the owner already typed
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/5 p-3">
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs text-muted-foreground">{L.keyMissingBanner}</p>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="cat-openai-key" className="sr-only">{L.keyInputLabel}</Label>
        <Input
          id="cat-openai-key"
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-…"
          className="flex-1"
        />
        <Button type="button" size="sm" onClick={save} disabled={busy || !value.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : L.keySaveBtn}
        </Button>
      </div>
    </div>
  );
}

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
  const [newCategory, setNewCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  // TEN-LANGUAGE CATEGORY TRANSLATION GATE (step 234.1) — the category's title+description are translated
  // into all ten admin-layer languages at creation time (route.ts calls the global OpenAI key). `needsKey`
  // gates the inline key panel BELOW, scoped to this "new category" sub-flow only (confirmed with owner:
  // not a banner at the top of the whole dialog — automations created without touching categories never
  // need this key at all).
  const [needsKey, setNeedsKey] = useState(false);
  // VoiceInput refs (step 236.4 — the owner flagged its absence here, unlike Quiz/chain-brief/edge-spec):
  // only the two long free-text fields get a mic, matching the pattern everywhere else in this app — never
  // the short one-line Name/category-name fields.
  const instrRef = useRef<HTMLTextAreaElement | null>(null);
  const categoryDescRef = useRef<HTMLTextAreaElement | null>(null);

  const loadCategories = async () => {
    const r = await fetch("/api/projects/categories", { cache: "no-store" });
    if (r.ok) setCategories(((await r.json()) as { categories: { slug: string; title: string }[] }).categories);
  };

  // Proactive check (owner's spec): the moment the "new category" panel opens, ask whether the OpenAI key is
  // already configured — same shape/guard as missing-keys-modal (`!configured && !inconclusive`, so an
  // unreachable Admin never false-nags). If missing, the inline panel shows immediately, before the owner
  // even starts typing.
  useEffect(() => {
    if (!newCategory) return;
    let alive = true;
    void (async () => {
      try {
        const r = await fetch("/api/project-config/openai-key", { cache: "no-store" });
        const d = r.ok ? ((await r.json()) as { configured?: boolean; inconclusive?: boolean }) : null;
        if (alive) setNeedsKey(Boolean(d) && !d!.configured && !d!.inconclusive);
      } catch {
        /* forwarder unreachable — leave needsKey as-is, the create attempt will surface it anyway */
      }
    })();
    return () => { alive = false; };
  }, [newCategory]);

  async function createCategory() {
    const slug = slugify(categoryName);
    if (!slug) { toast.error(L.errCategoryName); return; }
    if (!newCategoryDescription.trim()) { toast.error(L.errDescriptionRequired); return; }
    if (countWords(newCategoryDescription) > MAX_CATEGORY_DESCRIPTION_WORDS) {
      toast.error(fill(L.descriptionTooLong, { max: MAX_CATEGORY_DESCRIPTION_WORDS }));
      return;
    }
    setBusy(true);
    // Ten-language translation runs server-side before anything is written (route.ts) — this can take a
    // few seconds, so a dedicated loading toast (swapped in place, not stacked) tells the owner why.
    toast.loading(L.creatingCategoryLoading, { id: "cat-create" });
    try {
      const r = await fetch("/api/projects/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title: categoryName.trim(), description: newCategoryDescription.trim() }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) {
        // key_missing / translate_failed both re-open the inline key panel (owner's spec: uniform flow
        // whether the key was absent from the start or turned out to be bad) — never write the key
        // anywhere except through InlineOpenAiKeyPanel's forwarder call below.
        if (d.error === "key_missing") {
          setNeedsKey(true);
          toast.error(L.errKeyMissing, { id: "cat-create" });
        } else if (d.error === "translate_failed") {
          setNeedsKey(true);
          toast.error(L.errTranslateFailed, { id: "cat-create" });
        } else if (d.error === "description_too_long") {
          toast.error(fill(L.descriptionTooLong, { max: MAX_CATEGORY_DESCRIPTION_WORDS }), { id: "cat-create" });
        } else {
          toast.error(d.error ?? L.errCreateCategory, { id: "cat-create" });
        }
        return;
      }
      toast.success(fill(L.categoryCreated, { name: categoryName.trim() }), {
        id: "cat-create",
        description: L.categoryCreatedDesc,
        duration: 12000,
      });
      setCategories((c) => [...c.filter((x) => x.slug !== slug), { slug, title: categoryName.trim() }]);
      setPickedCategory(slug);
      setNewCategory(false);
      setCategoryName("");
      setNewCategoryDescription("");
      setNeedsKey(false);
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
            <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={L.namePlaceholder} />
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
              // From the ROOT / the GLOBAL CANVAS there is no ambient category — the owner picks one, or
              // CREATES a new one right here (step 225 G6): a category is code (a slug in the union + an
              // entry in PROJECT_CATEGORIES + its own hub route), so the "+" materializes all of it.
              <div className="flex w-full items-center gap-2">
                <Select value={pickedCategory} onValueChange={setPickedCategory}>
                  <SelectTrigger className="w-full flex-1">
                    <SelectValue placeholder={L.categoryPlaceholder} />
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
                  title={L.newCategoryTooltip}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            )}

            {newCategory && !category && (
              <div className="mt-2 space-y-2 rounded-md border border-dashed p-3">
                {/* Key gate scoped to THIS panel only (owner-confirmed placement) — shown proactively on
                    open (the effect above) and re-shown reactively if createCategory() hits key_missing /
                    translate_failed. onSaved clears needsKey and auto-retries with whatever is already typed. */}
                {needsKey && (
                  <InlineOpenAiKeyPanel L={L} onSaved={() => { setNeedsKey(false); void createCategory(); }} />
                )}

                <Label htmlFor="c-name" className="text-xs">{L.newCategoryLabel}</Label>
                <Input
                  id="c-name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder={L.newCategoryPlaceholder}
                />

                <Label htmlFor="c-desc" className="text-xs">{L.descriptionLabel}</Label>
                <Textarea
                  ref={categoryDescRef}
                  id="c-desc"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  rows={3}
                  placeholder={L.descriptionPlaceholder}
                />
                <VoiceInput targetRef={categoryDescRef} value={newCategoryDescription} onChange={setNewCategoryDescription} />
                <p
                  className={`text-xs ${
                    countWords(newCategoryDescription) > MAX_CATEGORY_DESCRIPTION_WORDS
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {fill(L.descriptionWordCount, { n: countWords(newCategoryDescription), max: MAX_CATEGORY_DESCRIPTION_WORDS })}
                </p>

                <Button
                  size="sm"
                  onClick={createCategory}
                  disabled={
                    busy || !categoryName.trim() || !newCategoryDescription.trim() ||
                    countWords(newCategoryDescription) > MAX_CATEGORY_DESCRIPTION_WORDS
                  }
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : L.createCategoryBtn}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {L.newCategoryHint}
                </p>
              </div>
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
