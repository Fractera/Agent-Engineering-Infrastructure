"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// ДЕЙСТВИЯ DANGER ZONE (шаг 301) — переименовать / клонировать / удалить автоматизацию. Раньше все три были
// заглушками; теперь подключены к настоящим дверям. Тексты английские (стартер одноязычный, правило владельца).
//
// Адрес автоматизации папка знает только по URL (закон 0): `<категория>/<слаг>`. Свои двери — от пути
// страницы (`api/patch`); платформенные (`/api/projects/clone|delete`) — абсолютным путём зоны.
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
function automationFromPath(): string {
  const p = location.pathname.split("?")[0].split("/").filter(Boolean);
  return p.length >= 3 && p[0] === "projects" ? `${p[1]}/${p[2]}` : "";
}
const slugFromPath = () => automationFromPath().split("/")[1] ?? "";

// ── RENAME — правит `passport.title` через собственную дверь `api/patch`. Слаг/папка НЕ меняются (это
//    идентичность, решение владельца). Пересборка не нужна: страница читает имя из ядра на каждый запрос. ──
export function RenameDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    void fetch(`${apiBase()}/core?select=passport`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { title?: string } | null) => { if (d?.title) setTitle(String(d.title)); })
      .catch(() => {});
  }, [open]);

  async function save() {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase()}/patch`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "passport" }, set: { title: title.trim() } }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) { toast.error(d.error ?? "Could not rename the automation."); return; }
      toast.success("Automation renamed.");
      onClose();
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="size-4" /> Rename this automation</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Only the display name changes — the automation's address (its folder) stays the same.</p>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Automation name" onKeyDown={(e) => { if (e.key === "Enter") void save(); }} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy || !title.trim()} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />} Rename
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── CLONE — копия этой автоматизации со ВСЕМ содержимым, но новой идентичностью (дверь `/api/projects/clone`
//    ветвится на v2: свежая uuid + подстановка слага). Клон появляется в той же категории после пересборки. ──
export function CloneDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setName(""); }, [open]);

  async function clone() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/clone`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ automation: automationFromPath(), title: name.trim() }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; url?: string };
      if (!r.ok || !d.ok) { toast.error(d.error ?? "Could not clone the automation."); return; }
      toast.success("Clone created — building its page (~1-2 min).", { description: "It appears in the same category once the build finishes." });
      onClose();
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Copy className="size-4" /> Clone this automation</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">A clean copy — same nodes, components and use cases, its own fresh identity, no run data. Give it a name.</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Clone name" onKeyDown={(e) => { if (e.key === "Enter") void clone(); }} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={clone} disabled={busy || !name.trim()} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />} Clone
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── DELETE — необратимо. Danger-zone-подтверждение: владелец ВПЕЧАТЫВАЕТ слаг автоматизации (дверь того же
//    и требует). Успех → папка снесена, уходим в зону (страницы больше нет). ──
export function DeleteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const slug = typeof window !== "undefined" ? slugFromPath() : "";

  useEffect(() => { if (open) setConfirm(""); }, [open]);

  async function del() {
    if (confirm.trim() !== slug || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/delete`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ automation: automationFromPath(), confirm: confirm.trim() }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok) { toast.error(d.error ?? "Could not delete the automation."); return; }
      toast.success("Automation deleted.");
      // Снять «оптимистичную» карточку этой автоматизации из localStorage зоны СРАЗУ — иначе после
      // перезагрузки на хабе повиснет карточка-призрак (маршрут ещё отвечает 2xx во время пересборки, и
      // разовая проверка сочла бы её живой). Ключ — контракт с `_shared/components/pending-automations`.
      try {
        const [cat, s] = automationFromPath().split("/");
        const key = `pending-automations:${cat}`;
        const arr = JSON.parse(localStorage.getItem(key) || "[]") as Array<{ slug?: string }>;
        localStorage.setItem(key, JSON.stringify(arr.filter((e) => e.slug !== s)));
      } catch { /* localStorage недоступен — призрак снимет самолечащийся опрос зоны */ }
      // Страницы автоматизации больше нет — уходим на список её категории.
      window.location.href = `/projects/${automationFromPath().split("/")[0] || ""}`;
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400"><Trash2 className="size-4" /> Delete this automation</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          This is permanent. The whole automation — its nodes, components, data and run history — is removed and cannot be recovered.
        </p>
        <p className="text-sm">
          Type its name <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{slug}</span> to confirm:
        </p>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={slug} autoComplete="off" onKeyDown={(e) => { if (e.key === "Enter") void del(); }} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={del} disabled={busy || confirm.trim() !== slug} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete permanently
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
