"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown, ChevronRight, FileText, Folder, FolderPlus, Globe, Loader2, Plus, Sparkles, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { appPagesStrings } from "../app-pages-i18n";
import { VoiceInput } from "./voice-input.client";

// APPLICATION PAGES (step 242) — the owner's window onto the application layer (slot app/), to declare PUBLIC
// pages EXTERNAL users of this automation will use. Mirrors the PRINCIPLES of the architect's Architecture
// page (folder tree → pick a folder → declare a page → per-page to-do list a coding agent picks up), but this
// is a COPY living in projects-app (fault-isolated: the tree/declare/tasks all hit the slot fs directly via
// the app-pages API, never :3002), and it adds three things the service page lacks: 10-language chrome, a Quiz
// that writes to-dos, and voice on every to-do. Tagged to this automation.

type AppNode = {
  rel: string; name: string; url: string; built: boolean; declared: boolean; taskCount: number; children: AppNode[];
};
type ClientTask = { id: string; body: string };

export function AppPagesPanel({ automation }: { automation: string }) {
  const S = appPagesStrings(useUiLang());
  const [tree, setTree] = useState<AppNode[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<AppNode | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [declareOpen, setDeclareOpen] = useState(false);

  const loadTree = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/app-pages/tree`, { cache: "no-store" });
      const d = (await r.json().catch(() => null)) as { children?: AppNode[] } | null;
      setTree(d?.children ?? []);
    } catch { setTree([]); }
  }, []);
  useEffect(() => { loadTree(); }, [loadTree]);

  // Re-select the same rel after a reload so the detail panel keeps its page after a declare/task change.
  const reselect = useCallback((rel: string, nodes: AppNode[]): AppNode | null => {
    for (const n of nodes) {
      if (n.rel === rel) return n;
      const hit = reselect(rel, n.children);
      if (hit) return hit;
    }
    return null;
  }, []);
  useEffect(() => {
    if (selected && tree) setSelected(reselect(selected.rel, tree));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  function renderNode(n: AppNode, depth: number): ReactNode {
    const isSel = selected?.rel === n.rel;
    const open = expanded[n.rel];
    return (
      <div key={n.rel}>
        <div
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-sm ${isSel ? "bg-accent" : "hover:bg-accent/50"}`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {n.children.length > 0 ? (
            <button onClick={() => setExpanded((p) => ({ ...p, [n.rel]: !p[n.rel] }))} className="text-muted-foreground">
              {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : (
            <span className="inline-block w-3.5" />
          )}
          <button onClick={() => setSelected(n)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
            {n.built ? <FileText className="size-3.5 shrink-0 text-primary" /> : <Folder className="size-3.5 shrink-0 text-muted-foreground" />}
            <span className="truncate">{n.name}</span>
            {n.built && <span className="shrink-0 rounded bg-primary/10 px-1 text-[10px] text-primary">{S.badgeLive}</span>}
            {n.declared && <span className="shrink-0 rounded bg-amber-500/15 px-1 text-[10px] text-amber-600 dark:text-amber-400">{S.badgeDeclared}</span>}
            {n.taskCount > 0 && <span className="shrink-0 text-[10px] text-muted-foreground">{S.tasksN.replace("{n}", String(n.taskCount))}</span>}
          </button>
        </div>
        {open && n.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

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
        <p className="text-xs text-muted-foreground">
          {selected ? `${S.folderLabel}: app/${selected.rel}` : S.pickHint}
        </p>
        <Button size="sm" onClick={() => setDeclareOpen(true)} className="gap-1.5">
          <FolderPlus className="size-3.5" /> {S.addPage}
        </Button>
      </div>

      {/* THE TREE — the application layer as folders; pick any to declare a page in it. */}
      <div className="max-h-80 overflow-auto rounded-lg border p-1">
        {tree === null ? (
          <p className="p-2 text-sm text-muted-foreground"><Loader2 className="mr-1 inline size-3.5 animate-spin" />{S.treeLoading}</p>
        ) : tree.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">{S.treeEmpty}</p>
        ) : (
          tree.map((n) => renderNode(n, 0))
        )}
      </div>

      {/* DETAIL — a declared page's to-do list (voice + Add with AI). Only for a declared (not-yet-built) page. */}
      {selected?.declared && (
        <PageDetail automation={automation} node={selected} onChanged={loadTree} S={S} />
      )}

      <DeclareModal
        automation={automation}
        baseRel={selected?.rel ?? ""}
        baseLabel={selected ? `app/${selected.rel}` : S.rootFolder}
        open={declareOpen}
        onOpenChange={setDeclareOpen}
        onDone={async (rel) => { await loadTree(); setSelected((s) => s); void rel; }}
        S={S}
      />
    </div>
  );
}

// ─── the declare modal ─────────────────────────────────────────────────────────────────────────────────
function DeclareModal({
  automation, baseRel, baseLabel, open, onOpenChange, onDone, S,
}: {
  automation: string; baseRel: string; baseLabel: string; open: boolean;
  onOpenChange: (v: boolean) => void; onDone: (rel: string) => void; S: ReturnType<typeof appPagesStrings>;
}) {
  const [title, setTitle] = useState("");
  const [dynamic, setDynamic] = useState(false);
  const [multilingual, setMultilingual] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setTitle(""); setDynamic(false); setMultilingual(true); } }, [open]);

  async function declare() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/app-pages/declare`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, base: baseRel, title: title.trim(), dynamic, multilingual }),
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
          <DialogTitle className="flex items-center gap-2"><FolderPlus className="size-4" /> {S.modalTitle.replace("{folder}", baseLabel)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">{S.titleField}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={S.titlePlaceholder} autoComplete="off"
              onKeyDown={(e) => { if (e.key === "Enter" && title.trim() && !busy) declare(); }} />
          </div>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2"><Globe className="size-4 text-muted-foreground" /> {S.multilingualField}</span>
            <Switch checked={multilingual} onCheckedChange={setMultilingual} />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>{S.dynamicField}</span>
            <Switch checked={dynamic} onCheckedChange={setDynamic} />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>{S.cancel}</Button>
          <Button onClick={declare} disabled={!title.trim() || busy} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
            {busy ? S.declaring : S.declare}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── a declared page's to-do list + the AI dialog ────────────────────────────────────────────────────────
function PageDetail({
  automation, node, onChanged, S,
}: {
  automation: string; node: AppNode; onChanged: () => void; S: ReturnType<typeof appPagesStrings>;
}) {
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [draft, setDraft] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const draftRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/app-pages/tasks?rel=${encodeURIComponent(node.rel)}`, { cache: "no-store" });
    const d = (await r.json().catch(() => ({}))) as { tasks?: ClientTask[] };
    setTasks(d.tasks ?? []);
  }, [node.rel]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const r = await fetch(`/api/projects/app-pages/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rel: node.rel, body }),
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
        <p className="text-sm font-medium">{node.name}</p>
        <p className="text-xs text-muted-foreground">{S.urlLabel}: <code>{node.url}</code> · {S.folderLabel}: <code>app/{node.rel}</code></p>
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

      <PageQuizDialog automation={automation} rel={node.rel} open={aiOpen} onOpenChange={setAiOpen}
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
