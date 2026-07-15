"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, FolderPlus, Loader2, Plus, Sparkles, User, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ALL_ROLES } from "@/lib/roles";
import { useUiLang } from "../use-ui-lang";
import { appPagesStrings } from "../app-pages-i18n";
import { VoiceInput } from "./voice-input.client";

// APPLICATION PAGES (step 242; simplified in 242.4) — the owner declares PUBLIC pages of the application layer
// for EXTERNAL users of this automation. The slot-app FILE TREE was removed (owner's call — it showed other,
// unrelated pages and only confused things). Now it is dead simple: one "Add page" button (the page always
// lands under [lang]), a flat list of the pages THIS automation declared, and selecting one goes straight to
// planning — its to-do list (+ voice) and the "Add with AI" Quiz. Fault-isolated: every call hits the slot fs
// directly via the app-pages API, never :3002.

type PageBrief = { rel: string; title: string; url: string; taskCount: number };
type ClientTask = { id: string; body: string };

export function AppPagesPanel({ automation }: { automation: string }) {
  const S = appPagesStrings(useUiLang());
  const [pages, setPages] = useState<PageBrief[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null); // rel
  const [showFull, setShowFull] = useState(false);
  const [declareOpen, setDeclareOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/app-pages/list?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
      const d = (await r.json().catch(() => null)) as { pages?: PageBrief[] } | null;
      setPages(d?.pages ?? []);
    } catch { setPages([]); }
  }, [automation]);
  useEffect(() => { load(); }, [load]);

  const selectedPage = pages?.find((p) => p.rel === selected) ?? null;

  return (
    <div className="space-y-4">
      {/* DESCRIPTION — a 3-line teaser + "Read more" that opens the full essay (the depth of the idea). */}
      <div className="rounded-lg border bg-muted/20 p-3 text-sm">
        <p className="text-muted-foreground">{S.descTeaser}</p>
        {showFull && <p className="mt-2 whitespace-pre-line text-muted-foreground">{S.descFull}</p>}
        <button onClick={() => setShowFull((v) => !v)} className="mt-1 text-xs font-medium text-primary hover:underline">
          {showFull ? S.showLess : S.readMore}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{pages && pages.length > 0 ? S.yourPages : S.noPages}</p>
        <Button size="sm" onClick={() => setDeclareOpen(true)} className="gap-1.5">
          <FolderPlus className="size-3.5" /> {S.addPage}
        </Button>
      </div>

      {/* THIS AUTOMATION'S PAGES — a flat list; select one to plan it. No file tree. */}
      {pages === null ? (
        <p className="text-sm text-muted-foreground"><Loader2 className="mr-1 inline size-3.5 animate-spin" /></p>
      ) : pages.length > 0 ? (
        <div className="divide-y rounded-lg border">
          {pages.map((p) => (
            <button
              key={p.rel}
              onClick={() => setSelected(p.rel)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${selected === p.rel ? "bg-accent" : "hover:bg-accent/50"}`}
            >
              <FileText className="size-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">{p.title}</span>
              <code className="shrink-0 text-xs text-muted-foreground">{p.url}</code>
              {p.taskCount > 0 && <span className="shrink-0 text-[10px] text-muted-foreground">{S.tasksN.replace("{n}", String(p.taskCount))}</span>}
            </button>
          ))}
        </div>
      ) : null}

      {/* PLANNING for the selected page — to-dos (voice) + the "Add with AI" Quiz. */}
      {selectedPage && <PageDetail automation={automation} page={selectedPage} onChanged={load} S={S} />}

      <DeclareModal
        automation={automation}
        open={declareOpen}
        onOpenChange={setDeclareOpen}
        onDone={async (rel) => { await load(); setSelected(rel); }}
        S={S}
      />
    </div>
  );
}

// ─── the declare WIZARD (step 242.2; page always lands under [lang] since 242.4) ─────────────────────────
// Three guided steps: 1) audience (only me / also others), 2) roles (others only, `user` pre-selected),
// 3) name (spoken or typed → a short ENGLISH slug; a cuid is appended on save so pages never clash). The page
// is always created at the [lang] root — there is no folder to pick any more.
const ASSIGNABLE_ROLES = ALL_ROLES.filter((r) => r !== "guest"); // guest = the unauthenticated tier, never assigned

function DeclareModal({
  automation, open, onOpenChange, onDone, S,
}: {
  automation: string; open: boolean;
  onOpenChange: (v: boolean) => void; onDone: (rel: string) => void; S: ReturnType<typeof appPagesStrings>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [audience, setAudience] = useState<"self" | "others">("others");
  const [roles, setRoles] = useState<string[]>(["user"]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugBusy, setSlugBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) { setStep(1); setAudience("others"); setRoles(["user"]); setTitle(""); setSlug(""); }
  }, [open]);

  // Preview the English folder name whenever the owner pauses on the title (any language → short english slug).
  async function refreshSlug() {
    const t = title.trim();
    if (!t) { setSlug(""); return; }
    setSlugBusy(true);
    try {
      const r = await fetch(`/api/projects/app-pages/suggest-slug`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t }),
      });
      const d = (await r.json().catch(() => ({}))) as { slug?: string };
      if (d.slug) setSlug(d.slug);
    } finally { setSlugBusy(false); }
  }

  function toggleRole(role: string) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function declare() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/app-pages/declare`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        // base is always the [lang] root now — the server nests it there. No folder picker.
        body: JSON.stringify({
          automation, base: "", title: title.trim(), slug: slug.trim(),
          audience, roles: audience === "others" ? roles : [],
        }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; page?: { rel?: string }; error?: string };
      if (!r.ok || !d.ok) { toast.error(d.error ?? S.declareFailed); return; }
      toast.success(S.declared);
      onOpenChange(false);
      onDone(d.page?.rel ?? "");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FolderPlus className="size-4" /> {S.addPage}</DialogTitle>
        </DialogHeader>

        {/* STEP 1 — audience */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{S.audienceQuestion}</p>
            <button
              onClick={() => { setAudience("self"); setStep(3); }}
              className="flex w-full items-start gap-3 rounded-lg border p-3 text-left hover:border-primary/50 hover:bg-accent/40"
            >
              <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span><span className="block text-sm font-medium">{S.audienceSelf}</span><span className="block text-xs text-muted-foreground">{S.audienceSelfDesc}</span></span>
            </button>
            <button
              onClick={() => { setAudience("others"); setStep(2); }}
              className="flex w-full items-start gap-3 rounded-lg border p-3 text-left hover:border-primary/50 hover:bg-accent/40"
            >
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span><span className="block text-sm font-medium">{S.audienceOthers}</span><span className="block text-xs text-muted-foreground">{S.audienceOthersDesc}</span></span>
            </button>
          </div>
        )}

        {/* STEP 2 — roles (others only) */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{S.rolesTitle}</p>
            <p className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">{S.rolesHint}</p>
            <div className="max-h-56 space-y-1 overflow-auto rounded-lg border p-1">
              {ASSIGNABLE_ROLES.map((role) => (
                <label key={role} className="flex items-center justify-between gap-4 rounded px-2 py-1.5 text-sm hover:bg-accent/40">
                  <span className="font-mono text-xs">{role}</span>
                  <Switch checked={roles.includes(role)} onCheckedChange={() => toggleRole(role)} aria-label={role} />
                </label>
              ))}
            </div>
            <div className="flex justify-between gap-2 pt-1">
              <Button variant="ghost" onClick={() => setStep(1)}>{S.back}</Button>
              <Button onClick={() => setStep(3)} disabled={roles.length === 0}>{S.next}</Button>
            </div>
          </div>
        )}

        {/* STEP 3 — name (voice → english slug) */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{S.nameStepTitle}</p>
            <div className="space-y-1">
              <label className="text-xs font-medium">{S.titleField}</label>
              <Input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={refreshSlug}
                placeholder={S.titlePlaceholder} autoComplete="off" />
              <p className="text-xs text-muted-foreground">{S.nameHint}</p>
              <VoiceInput targetRef={titleRef} value={title} onChange={setTitle} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{S.slugLabel}</label>
              <div className="flex items-center gap-2">
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="calorie-counter" autoComplete="off" className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={refreshSlug} disabled={!title.trim() || slugBusy} className="h-8 shrink-0 px-2">
                  {slugBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{S.cuidNote}</p>
            </div>
            <div className="flex justify-between gap-2 pt-1">
              <Button variant="ghost" onClick={() => setStep(audience === "self" ? 1 : 2)} disabled={busy}>{S.back}</Button>
              <Button onClick={declare} disabled={!title.trim() || busy} className="gap-2">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
                {busy ? S.declaring : S.declare}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── a declared page's to-do list + the AI dialog (the "planning" surface) ───────────────────────────────
function PageDetail({
  automation, page, onChanged, S,
}: {
  automation: string; page: PageBrief; onChanged: () => void; S: ReturnType<typeof appPagesStrings>;
}) {
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [draft, setDraft] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const draftRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/app-pages/tasks?rel=${encodeURIComponent(page.rel)}`, { cache: "no-store" });
    const d = (await r.json().catch(() => ({}))) as { tasks?: ClientTask[] };
    setTasks(d.tasks ?? []);
  }, [page.rel]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const r = await fetch(`/api/projects/app-pages/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rel: page.rel, body }),
    });
    if (!r.ok) { toast.error(S.saveFailed); return; }
    await load(); onChanged();
  }
  async function remove(id: string) {
    await fetch(`/api/projects/app-pages/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
    await load(); onChanged();
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{page.title}</p>
        <p className="text-xs text-muted-foreground">{S.urlLabel}: <code>{page.url}</code> · {S.folderLabel}: <code>app/{page.rel}</code></p>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{S.detailTitle}</p>
      <p className="text-xs text-muted-foreground">{S.detailHint}</p>

      <div className="space-y-1">
        {tasks.length === 0 && <p className="text-xs text-muted-foreground">{S.emptyTasks}</p>}
        {tasks.map((t) => (
          <div key={t.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 text-muted-foreground">•</span>
            <span className="flex-1">{t.body}</span>
            <button onClick={() => remove(t.id)} className="mt-0.5 text-muted-foreground hover:text-rose-600"><X className="size-3.5" /></button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input ref={draftRef} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={S.taskPlaceholder}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }} className="h-8 text-sm" />
        <Button size="sm" variant="outline" onClick={add} className="h-8 shrink-0 px-2"><Plus className="size-4" /></Button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <VoiceInput targetRef={draftRef} value={draft} onChange={setDraft} />
        <Button size="sm" variant="ghost" onClick={() => setAiOpen(true)} className="gap-1.5 text-primary">
          <Sparkles className="size-3.5" /> {S.withAi}
        </Button>
      </div>

      <PageQuizDialog automation={automation} rel={page.rel} open={aiOpen} onOpenChange={setAiOpen}
        onApplied={async () => { await load(); onChanged(); }} S={S} />
    </div>
  );
}

// ─── the dedicated page-brainstorm dialog (reuses the quiz BACKEND — start/answer/page-apply — never the
//     shared ActivationQuiz component, so it cannot destabilise the project/edge/case/entity flows) ─────────
function PageQuizDialog({
  automation, rel, open, onOpenChange, onApplied, S,
}: {
  automation: string; rel: string; open: boolean; onOpenChange: (v: boolean) => void;
  onApplied: () => void; S: ReturnType<typeof appPagesStrings>;
}) {
  const [turns, setTurns] = useState<{ role: string; content: string }[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement | null>(null);
  const started = useRef(false);

  const body = useCallback(() => ({ automation, page: rel }), [automation, rel]);

  useEffect(() => {
    if (!open) { started.current = false; setTurns([]); setAnswer(""); return; }
    if (started.current) return;
    started.current = true;
    setBusy(true);
    fetch(`/api/projects/quiz`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body()) })
      .then((r) => r.json())
      .then((d: { question?: string; turns?: { role: string; content: string }[]; error?: string }) => {
        if (d.error) { toast.error(S.aiStartFailed); return; }
        if (d.turns?.length) setTurns(d.turns);
        else if (d.question) setTurns([{ role: "assistant", content: d.question }]);
      })
      .catch(() => toast.error(S.aiStartFailed))
      .finally(() => setBusy(false));
  }, [open, body, S]);

  async function send() {
    const a = answer.trim();
    if (!a || busy) return;
    setAnswer("");
    setTurns((p) => [...p, { role: "user", content: a }]);
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body(), answer: a }),
      });
      const d = (await r.json()) as { question?: string; error?: string };
      if (d.error) { toast.error(d.error); return; }
      if (d.question) setTurns((p) => [...p, { role: "assistant", content: d.question! }]);
    } finally { setBusy(false); }
  }

  async function apply() {
    setApplying(true);
    try {
      const r = await fetch(`/api/projects/quiz/page-apply`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body()),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; todos?: string[]; error?: string };
      if (!r.ok || !d.ok) { toast.error(d.error ?? S.aiStartFailed); return; }
      toast.success(S.aiApplied.replace("{n}", String(d.todos?.length ?? 0)));
      onOpenChange(false);
      onApplied();
    } finally { setApplying(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!applying) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="size-4" /> {S.aiTitle}</DialogTitle></DialogHeader>
        <div className="max-h-72 space-y-2 overflow-auto">
          {turns.map((t, i) => (
            <p key={i} className={`text-sm ${t.role === "user" ? "text-foreground" : "text-muted-foreground"}`}>
              {t.role === "user" ? "" : "🤖 "}{t.content}
            </p>
          ))}
          {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <Textarea ref={answerRef} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={S.aiPlaceholder}
          className="min-h-16 text-sm" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
        <VoiceInput targetRef={answerRef} value={answer} onChange={setAnswer} />
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={send} disabled={!answer.trim() || busy}>{S.aiSend}</Button>
          <Button size="sm" onClick={apply} disabled={applying} className="gap-2">
            {applying ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {applying ? S.aiApplying : S.aiApply}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
