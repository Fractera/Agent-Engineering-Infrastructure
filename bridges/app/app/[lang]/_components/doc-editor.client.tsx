"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";

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
//
// 🎙 ГОЛОСОВОЙ ВВОД (2026-08-09). Под полем стоит инструмент `voice-input`: он
// вставляет расшифровку ТУДА, ГДЕ СТОИТ КУРСОР, а не в конец. Поэтому длинный
// абзац диктуют в середину документа, не переписывая его целиком. Интерфейс
// инструмента английский — таким он приехал из своей эпохи, и переводить его
// здесь значило бы менять инструмент под одного потребителя.
//
// ⤒ «Извлечь последнюю версию» нужна потому, что у документа ДВА автора: владелец
// в панели и агент в репозитории. Открытая страница держит текст на момент
// открытия, и без кнопки правка вслепую затёрла бы то, что агент дописал минуту
// назад.

export type DocEditorLabels = {
  edit: string; cancel: string;
  save: string; saving: string; saved: string; failed: string; nothingToSave: string;
  notCreated: string; createHint: string;
  chars: string; lines: string;
  pull: string; pulling: string; pulled: string; pullDiffers: string; pullSame: string;
  voiceHint: string;
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
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const [base, setBase] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [pulling, setPulling] = useState(false);

  const dirty = text !== base;

  /**
   * Прочитать файл с диска заново.
   *
   * Несохранённая правка при этом теряется, поэтому она сначала пересчитывается,
   * а сообщение честно говорит, изменился ли файл: «извлёк» при неизменившемся
   * файле выглядит как действие, которого не было.
   */
  async function pull() {
    if (dirty && !confirm(labels.pullDiffers)) return;
    setPulling(true);
    try {
      const res = await fetch(`/api/product-docs/${docKey}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.text !== "string") throw new Error(String(data?.error ?? labels.failed));
      const changed = data.text !== base;
      setText(data.text);
      setBase(data.text);
      toast.success(changed ? labels.pulled : labels.pullSame);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setPulling(false);
    }
  }

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
      setBase(text);
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

        {/* Извлечение доступно всегда: узнать, что файл изменился, полезнее до
            правки, чем после сохранения. */}
        <Button size="sm" variant="ghost" className="text-[11px] text-muted-foreground" onClick={pull} disabled={pulling || saving}>
          {pulling ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {pulling ? labels.pulling : labels.pull}
        </Button>

        {editing ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px]"
              onClick={() => { setText(base); setEditing(false); }}
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
        <>
          <textarea
            ref={areaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="h-[60vh] w-full resize-y bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground outline-none"
          />

          {/* Микрофон ПОД полем — там, где стоит курсор, и там же появится текст.
              Кнопка удерживается: отпустил — запись ушла на расшифровку. */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
            <VoiceInput
              targetRef={areaRef}
              value={text}
              onChange={setText}
              lang="en"
              disabled={saving}
              apiUrl="/api/transcribe"
            />
            <span className="text-[10px] leading-relaxed text-muted-foreground">{labels.voiceHint}</span>
          </div>
        </>
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
