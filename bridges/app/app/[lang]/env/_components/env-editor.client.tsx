"use client";

// Правка переменных окружения (шаг 501, Ф2, партия 15).
//
// Островок: это ввод значений, часть которых — секреты.
//
// 🔒 ГЛАВНОЕ ОТЛИЧИЕ ОТ ПАНЕЛИ. Значения секретов в браузер НЕ ПРИХОДЯТ: сервер
// отдаёт маску. Отсюда следует устройство сохранения — отправляются ТОЛЬКО
// изменённые ключи и список удаляемых, а не «все переменные». Прежняя панель
// присылала весь набор; с маской это затёрло бы настоящий ключ строкой «sk-1…9f2b».
//
// Пустое поле у секрета означает «не менять», а не «стереть»: стирание — отдельное
// действие корзиной, и его нельзя совершить, просто пройдя по полям.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EnvEntry } from "../_lib/env";

export type EnvLabels = {
  keyHeader: string; valueHeader: string;
  lockedHint: string; secretHint: string; emptyValue: string; unchanged: string;
  add: string; newKey: string; newValue: string;
  remove: string; removeConfirm: string;
  save: string; saving: string; saved: string; nothingToSave: string; failed: string;
};

export function EnvEditor({ entries, labels }: { entries: EnvEntry[]; labels: EnvLabels }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Правки держим ОТДЕЛЬНО от того, что пришло с сервера: так видно, что именно
  // изменено, и так отправляется только изменённое.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<{ key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const dirty = Object.keys(edits).length > 0 || removed.length > 0 ||
    added.some((a) => a.key.trim() !== "");

  async function save() {
    const patch: Record<string, string> = { ...edits };
    for (const a of added) {
      const k = a.key.trim();
      if (k) patch[k] = a.value;
    }
    if (!Object.keys(patch).length && !removed.length) { toast.error(labels.nothingToSave); return; }

    setSaving(true);
    try {
      const r = await fetch("/api/config/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch, remove: removed }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      toast.success(labels.saved);
      setEdits({}); setRemoved([]); setAdded([]);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{labels.keyHeader}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{labels.valueHeader}</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const gone = removed.includes(e.key);
              return (
                <tr key={e.key} className={`border-b border-border/50 ${gone ? "opacity-40" : ""}`}>
                  <td className="px-3 py-1.5 align-middle">
                    <span className="flex items-center gap-1.5 font-mono text-foreground">
                      {e.locked && <Lock size={10} className="shrink-0 text-muted-foreground" title={labels.lockedHint} />}
                      {e.key}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    {e.locked ? (
                      // Запертое значение показываем как текст: поле ввода,
                      // которое ничего не меняет, — обещание, которого сервер не
                      // выполнит.
                      <span className="font-mono text-[10px] text-muted-foreground">{e.shown || "—"}</span>
                    ) : (
                      <Input
                        type={e.secret ? "password" : "text"}
                        defaultValue={e.secret ? "" : e.shown}
                        placeholder={e.secret ? (e.empty ? labels.emptyValue : `${e.shown} · ${labels.unchanged}`) : labels.emptyValue}
                        disabled={gone}
                        autoComplete="off"
                        onChange={(ev) => setEdits((p) => ({ ...p, [e.key]: ev.target.value }))}
                        className="h-7 font-mono text-[11px]"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {!e.locked && (
                      <button
                        type="button"
                        title={labels.remove}
                        aria-label={labels.remove}
                        onClick={() => {
                          if (gone) { setRemoved((p) => p.filter((k) => k !== e.key)); return; }
                          if (!confirm(labels.removeConfirm.replace("{key}", e.key))) return;
                          setRemoved((p) => [...p, e.key]);
                          setEdits((p) => { const n = { ...p }; delete n[e.key]; return n; });
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {added.map((a, i) => (
              <tr key={`new-${i}`} className="border-b border-border/50 bg-muted/20">
                <td className="px-3 py-1.5">
                  <Input
                    value={a.key}
                    onChange={(ev) => setAdded((p) => p.map((x, j) => (j === i ? { ...x, key: ev.target.value } : x)))}
                    placeholder={labels.newKey}
                    className="h-7 font-mono text-[11px]"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    value={a.value}
                    onChange={(ev) => setAdded((p) => p.map((x, j) => (j === i ? { ...x, value: ev.target.value } : x)))}
                    placeholder={labels.newValue}
                    className="h-7 font-mono text-[11px]"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    aria-label={labels.remove}
                    onClick={() => setAdded((p) => p.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="text-[11px]"
          onClick={() => setAdded((p) => [...p, { key: "", value: "" }])}>
          <Plus size={11} />{labels.add}
        </Button>
        <Button size="sm" className="text-[11px]" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {saving ? labels.saving : labels.save}
        </Button>
        <span className="text-[10px] text-muted-foreground">{labels.secretHint}</span>
      </div>
    </div>
  );
}
