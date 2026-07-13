"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { InlineOpenAiKeyPanel } from "./inline-openai-key-panel.client";
import { useUiLang } from "../use-ui-lang";
import { createAutomationStrings } from "../create-automation-i18n";
import { fill } from "../quiz-i18n";
import { countWords, MAX_CATEGORY_DESCRIPTION_WORDS } from "../word-count";

// STANDALONE "ADD CATEGORY" ENTRY POINT (owner's fix, 2026-07-14) — category creation used to live inline
// inside CreateAutomationDialog's "+ new category" panel, which let an owner create a category and then
// immediately try to build an automation inside it in the SAME dialog session — but the new category isn't
// live on the running server until its background rebuild (scheduleRebuild(), ~1-2 min) finishes, so that
// immediate attempt failed with "category must be one of X | Y | Z". Physically separating the two flows
// (this button lives on the Projects root page, opposite the title) removes the false immediacy: by the
// time an owner opens CreateAutomationDialog again, either the category is live and shows in the picker, or
// it isn't yet and simply isn't there — a self-explanatory "not ready yet" instead of a misleading error.
//
// The form/logic below is MOVED, not rewritten, from the old inline panel — same validation, same POST
// /api/projects/categories, same toasts, same InlineOpenAiKeyPanel (now its own shared file).
export function AddCategoryButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const uiLang = useUiLang();
  const L = createAutomationStrings(uiLang);

  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [needsKey, setNeedsKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);

  // Proactive check (owner's spec, carried over unchanged): the moment the dialog opens, ask whether the
  // OpenAI key is already configured — same shape/guard as missing-keys-modal (`!configured &&
  // !inconclusive`, so an unreachable Admin never false-nags).
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  async function createCategory() {
    // The slug is derived SERVER-SIDE from the English translation of the title (route.ts) — never from the
    // raw owner input, which may not be Latin script at all (e.g. "Медицина").
    if (!categoryName.trim()) { toast.error(L.errCategoryName); return; }
    if (!description.trim()) { toast.error(L.errDescriptionRequired); return; }
    if (countWords(description) > MAX_CATEGORY_DESCRIPTION_WORDS) {
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
        body: JSON.stringify({ title: categoryName.trim(), description: description.trim() }),
      });
      const d = (await r.json()) as { ok?: boolean; slug?: string; error?: string };
      if (!r.ok || !d.ok || !d.slug) {
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
      setOpen(false);
      setCategoryName("");
      setDescription("");
      setNeedsKey(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} title={L.newCategoryTooltip}>
        <Plus className="size-4" /> {L.addCategoryBtn}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] w-[95vw] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{L.newCategoryDialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {needsKey && (
              <InlineOpenAiKeyPanel L={L} onSaved={() => { setNeedsKey(false); void createCategory(); }} />
            )}

            <Label htmlFor="c-name" className="text-xs">{L.newCategoryLabel}</Label>
            <Input
              ref={nameRef}
              id="c-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder={L.newCategoryPlaceholder}
            />
            <VoiceInput targetRef={nameRef} value={categoryName} onChange={setCategoryName} />

            <Label htmlFor="c-desc" className="text-xs">{L.descriptionLabel}</Label>
            <Textarea
              ref={descRef}
              id="c-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={L.descriptionPlaceholder}
            />
            <VoiceInput targetRef={descRef} value={description} onChange={setDescription} />
            <p
              className={`text-xs ${
                countWords(description) > MAX_CATEGORY_DESCRIPTION_WORDS
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {fill(L.descriptionWordCount, { n: countWords(description), max: MAX_CATEGORY_DESCRIPTION_WORDS })}
            </p>

            <Button
              onClick={createCategory}
              disabled={
                busy || !categoryName.trim() || !description.trim() ||
                countWords(description) > MAX_CATEGORY_DESCRIPTION_WORDS
              }
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : L.createCategoryBtn}
            </Button>
            <p className="text-xs text-muted-foreground">
              {L.newCategoryHint}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
