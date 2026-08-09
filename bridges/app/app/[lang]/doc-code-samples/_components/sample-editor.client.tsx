"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ALLOWED_EXT, isValidName } from "@/lib/code-samples.shared";
import { CodeView } from "@/_tools/code-view/client/code-view.client";

// Образцы кода: создание, правка, удаление (шаг 501, 2026-08-09).
//
// Островок нужен только для записи — список и содержимое рисует сервер, поэтому
// страница читается и без JS.
//
// Создание сразу ведёт на созданный образец: человек нажал «Создать», и разумно
// оказаться внутри того, что он создал, а не искать его в списке.

export type SampleLabels = {
  newTitle: string; namePlaceholder: string; create: string; creating: string;
  created: string; badName: string; failed: string;
  save: string; saving: string; saved: string; nothingToSave: string;
  remove: string; removeConfirm: string; removed: string;
  editMode: string; viewMode: string;
};

export function NewSample({ base, labels }: { base: string; labels: SampleLabels }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ext, setExt] = useState<string>("html");
  const [busy, setBusy] = useState(false);

  async function create() {
    const clean = name.trim();
    if (!isValidName(clean)) { toast.error(labels.badName); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/code-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Пустой образец — законное начало: человек создаёт место, потом
        // вставляет в него код.
        body: JSON.stringify({ name: clean, ext, text: "" }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.created);
      setName("");
      router.push(`${base}?file=${encodeURIComponent(data.file)}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={labels.namePlaceholder}
        className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-primary"
      />
      <select
        value={ext}
        onChange={(e) => setExt(e.target.value)}
        className="rounded border border-border bg-background px-1.5 py-1 font-mono text-[11px] text-foreground"
      >
        {ALLOWED_EXT.map((x) => <option key={x} value={x}>.{x}</option>)}
      </select>
      <Button size="sm" className="text-[11px]" onClick={create} disabled={busy || !name.trim()}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
        {busy ? labels.creating : labels.create}
      </Button>
    </div>
  );
}

export function SampleBody(
  { base, file, name, ext, initialText, labels }: {
    base: string; file: string; name: string; ext: string;
    initialText: string; labels: SampleLabels;
  },
) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);

  const dirty = text !== initialText;

  async function save() {
    if (!dirty) { toast.error(labels.nothingToSave); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/code-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ext, text }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.saved);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/code-samples?file=${encodeURIComponent(file)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.removed);
      router.push(base);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="truncate font-mono text-[11px] text-foreground">{file}</span>
        <span className="ml-auto flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-[10px] text-muted-foreground">{labels.removeConfirm}</span>
              <Button size="sm" variant="destructive" className="text-[11px]" onClick={remove} disabled={busy}>
                {labels.remove}
              </Button>
              <Button size="sm" variant="ghost" className="text-[11px]" onClick={() => setConfirming(false)} disabled={busy}>
                ✕
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="text-[11px] text-muted-foreground" onClick={() => setConfirming(true)} disabled={busy}>
              <Trash2 size={11} />
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setEditing((v) => !v)} disabled={busy}>
            {editing ? labels.viewMode : labels.editMode}
          </Button>
          <Button size="sm" className="text-[11px]" onClick={save} disabled={busy || !dirty}>
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            {busy ? labels.saving : labels.save}
          </Button>
        </span>
      </div>

      {/* ЧИТАЮТ с подсветкой, ПРАВЯТ в обычном поле.
          Образец открывают, чтобы разобраться и скопировать, — поэтому по
          умолчанию он показан инструментом просмотра кода. Правка — отдельное
          намерение и отдельная кнопка: подсвеченная разметка не редактируется,
          а держать в поле ввода раскрашенный текст значит писать свой редактор
          там, где хватает `<textarea>`. */}
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="h-[60vh] w-full resize-y bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground outline-none"
        />
      ) : (
        <CodeView code={text} filename={file} className="max-h-[60vh] rounded-none border-0" />
      )}
    </div>
  );
}
