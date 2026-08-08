"use client";

// Загрузка резервной копии (шаг 501, Ф2, партия 8). Единственный островок
// раздела, и он неизбежен: сначала архив ОСМАТРИВАЕТСЯ на сервере, и только после
// подтверждения частей что-то пишется. Без JS этот порядок пришлось бы ломать —
// либо писать сразу, либо грузить файл дважды.
//
// Разделение «посмотреть» и «записать» сохранено дословно из старой панели: это
// единственная поверхность, где ошибка не правится обратно.
//
// Подписи приезжают пропсами: словарь остаётся на сервере.

import { useRef, useState } from "react";
import { Loader2, Upload, AlertTriangle, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REPLACES_ON_IMPORT } from "@/lib/backup-parts";

export type RestoreLabels = {
  choose: string; chooseAnother: string; reading: string; nothingYet: string;
  unrecognised: string; createdAt: string; selected: string;
  restore: string; restoring: string;
  restored: string; nothingNeeded: string; failed: string;
  // Что случится с каждой частью — предупреждение важнее названия.
  effects: Record<string, { label: string; effect: string }>;
};

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export function RestoreForm({ labels }: { labels: RestoreLabels }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [found, setFound] = useState<{ parts: string[]; createdAt: string | null } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function inspect(f: File) {
    setFile(f); setFound(null); setError(null); setReading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const r = await fetch("/api/data/import?inspect=1", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) { setError(String(d.error ?? `${r.status}`)); return; }
      setFound(d);
      // Секретные части НЕ отмечаются сами: подменить окружение или токен бота
      // молчаливым согласием нельзя.
      setPicked(new Set((d.parts as string[]).filter((p) => p !== "env" && p !== "channels")));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setReading(false);
    }
  }

  async function restore() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("parts", [...picked].join(","));
      const r = await fetch("/api/data/import", { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        const stats: Record<string, number> = d.stats ?? {};
        const summary = Object.entries(stats).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(", ");
        toast.success(summary ? fill(labels.restored, { summary }) : labels.nothingNeeded);
        setFile(null); setFound(null);
      } else {
        toast.error(String(d.error ?? labels.failed));
      }
    } catch (e) {
      toast.error(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void inspect(f); }}
      />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={reading || busy} onClick={() => fileRef.current?.click()} className="text-[11px]">
          {reading ? <Loader2 size={11} className="animate-spin" /> : <FileArchive size={11} />}
          {reading ? labels.reading : file ? labels.chooseAnother : labels.choose}
        </Button>
        {file && <span className="truncate font-mono text-[10px] text-muted-foreground">{file.name}</span>}
      </div>

      {error && <p className="text-[11px] leading-relaxed break-words text-destructive">{error}</p>}

      {!file && !error && (
        <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.nothingYet}</p>
      )}

      {found && found.parts.length === 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-destructive" />
          <span className="text-[10px] leading-relaxed text-destructive">{labels.unrecognised}</span>
        </div>
      )}

      {found?.parts.map((id) => {
        const meta = labels.effects[id] ?? { label: id, effect: "" };
        // Заменяет ли часть — машинный факт из кода, не из словаря.
        const replaces = REPLACES_ON_IMPORT.has(id);
        const on = picked.has(id);
        return (
          <label
            key={id}
            className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 ${on ? "border-border bg-muted/40" : "border-border/60"}`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => setPicked((prev) => {
                const n = new Set(prev);
                if (n.has(id)) n.delete(id); else n.add(id);
                return n;
              })}
              className="mt-0.5 size-4 accent-primary"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[11px] text-foreground">{meta.label}</span>
              <span className={`text-[10px] leading-relaxed ${replaces ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                {meta.effect}
              </span>
            </span>
          </label>
        );
      })}

      {found?.createdAt && (
        <p className="text-[10px] text-muted-foreground">
          {fill(labels.createdAt, { when: new Date(found.createdAt).toLocaleString() })}
        </p>
      )}

      {found && found.parts.length > 0 && (
        <div className="flex items-center gap-2 border-t border-border pt-2">
          <span className="flex-1 text-[10px] text-muted-foreground">
            {fill(labels.selected, { picked: String(picked.size), total: String(found.parts.length) })}
          </span>
          <Button variant="outline" size="sm" disabled={busy || picked.size === 0} onClick={restore} className="text-[11px]">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
            {busy ? labels.restoring : labels.restore}
          </Button>
        </div>
      )}
    </div>
  );
}
