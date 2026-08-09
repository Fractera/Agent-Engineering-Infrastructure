"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Редактор документа разработки (шаг 501, слой «Документы»).
//
// Один островок на ВСЕ документы: они отличаются только файлом и словами вокруг,
// а поведение у них одно. Девять копий этого кода разошлись бы через месяц.
//
// Текст приезжает ПРОПСОМ — файл читает сервер. Поэтому документ виден сразу и
// читается даже с выключенным JavaScript; островок нужен только чтобы править.
//
// Правка здесь меняет файл в рабочем дереве слота — ровно как правка в редакторе
// на машине владельца. Это файл ЕГО репозитория, он уедет с отправкой в GitHub,
// поэтому копии в базе панели нет и быть не должно.

export type DocEditorLabels = {
  edit: string; cancel: string;
  save: string; saving: string; saved: string; failed: string; nothingToSave: string;
  notCreated: string; createHint: string;
  chars: string; lines: string;
};

export function DocEditor(
  { docKey, initialText, exists, labels }: {
    docKey: string;
    initialText: string;
    exists: boolean;
    labels: DocEditorLabels;
  },
) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);

  const dirty = text !== initialText;

  async function save() {
    if (!dirty) { toast.error(labels.nothingToSave); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/product-docs/${docKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.saved);
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  const lines = text ? text.split("\n").length : 0;

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          {text.length} {labels.chars} · {lines} {labels.lines}
        </span>
        <span className="flex-1" />
        {editing ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px]"
              onClick={() => { setText(initialText); setEditing(false); }}
              disabled={saving}
            >
              {labels.cancel}
            </Button>
            <Button size="sm" className="text-[11px]" onClick={save} disabled={saving || !dirty}>
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {saving ? labels.saving : labels.save}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setEditing(true)}>
            {labels.edit}
          </Button>
        )}
      </div>

      {!exists && !editing && (
        <p className="border-b border-border bg-muted/40 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">{labels.notCreated}</strong> {labels.createHint}
        </p>
      )}

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="h-[60vh] w-full resize-y bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground outline-none"
        />
      ) : (
        // Документ показывается как есть, моноширинным: это разметка Markdown,
        // и владелец правит именно её. Отрисовать её «красиво» значило бы
        // спрятать то, что он редактирует.
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-foreground">
          {text}
        </pre>
      )}
    </div>
  );
}
