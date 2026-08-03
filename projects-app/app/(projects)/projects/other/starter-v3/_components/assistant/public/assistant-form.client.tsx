"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { assistantStrings } from "../i18n";

// ФОРМА ВКЛАДКИ «АССИСТЕНТ» — единственное место, где МЕНЯЮТ разговорное поведение автоматизации. Пишет
// прямо в ядро дверью `api/patch` (адрес сущности; `entity.data` уже писуемо, как у cron/dashboard).
// Здесь ИНТЕРФЕЙС, который читает узел `converse`: инструкция поведения, окно памяти, раскрытие
// возможностей, язык, примеры Q&A. Правка → `router.refresh()` (мягкая синхронизация, не перезагрузка).
export type QaPair = { q: string; a: string };
export type AssistantData = {
  instruction: string;
  memory: { lastN: number; ttlMinutes: number; tokenBudget: number };
  revealCapabilities: boolean;
  language: { mode: "auto" | "fixed"; fixed: string };
  qa: QaPair[];
};

export default function AssistantForm({ cuid, data, lang }: { cuid: string; data: AssistantData; lang: string }) {
  const L = assistantStrings(lang);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState<AssistantData>(data);

  async function save(next: AssistantData) {
    setD(next);
    setBusy(true);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "entity", tab: "assistant", cuid }, set: { data: next } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      router.refresh();
    } catch {
      /* оставляем локальное значение, чтобы правка не пропала визуально */
    } finally {
      setBusy(false);
    }
  }

  const num = (v: string, min: number, max: number, fallback: number) => {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">{L.subtitle}</p>

      {/* Инструкция поведения */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{L.instruction}</label>
        <p className="text-xs text-muted-foreground">{L.instructionHint}</p>
        <textarea
          value={d.instruction}
          disabled={busy}
          rows={6}
          onChange={(e) => setD({ ...d, instruction: e.target.value })}
          onBlur={() => save(d)}
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Память диалога */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{L.memory}</label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span>{L.lastN}</span>
            <Input
              type="number" min={1} max={50} disabled={busy} className="h-8 w-20"
              value={d.memory.lastN}
              onChange={(e) => setD({ ...d, memory: { ...d.memory, lastN: num(e.target.value, 1, 50, 10) } })}
              onBlur={() => save(d)}
            />
            <span className="text-muted-foreground">{L.messages}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span>{L.ttl}</span>
            <Input
              type="number" min={1} max={1440} disabled={busy} className="h-8 w-20"
              value={d.memory.ttlMinutes}
              onChange={(e) => setD({ ...d, memory: { ...d.memory, ttlMinutes: num(e.target.value, 1, 1440, 5) } })}
              onBlur={() => save(d)}
            />
            <span className="text-muted-foreground">{L.minutes}</span>
          </label>
          {/* Бюджет контекста (330.2) — второй ограничитель рядом с окном: считает цену, а не реплики. */}
          <label className="flex items-center gap-2 text-sm">
            <span>{L.budget}</span>
            <Input
              type="number" min={100} max={20000} step={100} disabled={busy} className="h-8 w-24"
              value={d.memory.tokenBudget}
              onChange={(e) => setD({ ...d, memory: { ...d.memory, tokenBudget: num(e.target.value, 100, 20000, 1200) } })}
              onBlur={() => save(d)}
            />
            <span className="text-muted-foreground">{L.tokens}</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{L.budgetHint}</p>
      </div>

      {/* Раскрытие возможностей */}
      <label className="flex items-start gap-3 text-sm">
        <Switch
          checked={d.revealCapabilities} disabled={busy}
          onCheckedChange={(v) => save({ ...d, revealCapabilities: v })}
        />
        <span>
          <span className="font-medium">{L.reveal}</span>
          <span className="block text-xs text-muted-foreground">{L.revealHint}</span>
        </span>
      </label>

      {/* Язык */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{L.language}</label>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select
            value={d.language.mode} disabled={busy}
            onChange={(e) => save({ ...d, language: { ...d.language, mode: e.target.value as "auto" | "fixed" } })}
            className="h-8 rounded-md border bg-transparent px-2 outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="auto">{L.langAuto}</option>
            <option value="fixed">{L.langFixed}</option>
          </select>
          {d.language.mode === "fixed" ? (
            <Input
              className="h-8 w-24" placeholder={L.langCode} disabled={busy}
              value={d.language.fixed}
              onChange={(e) => setD({ ...d, language: { ...d.language, fixed: e.target.value.trim().toLowerCase().slice(0, 5) } })}
              onBlur={() => save(d)}
            />
          ) : null}
        </div>
      </div>

      {/* Q&A примеры */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{L.qa}</label>
        <p className="text-xs text-muted-foreground">{L.qaHint}</p>
        {d.qa.length === 0 ? <p className="text-xs text-muted-foreground">{L.qaEmpty}</p> : null}
        <div className="space-y-2">
          {d.qa.map((pair, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-md border p-2 sm:flex-row sm:items-center">
              <Input
                className="h-8 flex-1" placeholder={L.qaQuestion} disabled={busy} value={pair.q}
                onChange={(e) => setD({ ...d, qa: d.qa.map((p, j) => (j === i ? { ...p, q: e.target.value } : p)) })}
                onBlur={() => save(d)}
              />
              <span className="hidden text-muted-foreground sm:inline">→</span>
              <Input
                className="h-8 flex-1" placeholder={L.qaAnswer} disabled={busy} value={pair.a}
                onChange={(e) => setD({ ...d, qa: d.qa.map((p, j) => (j === i ? { ...p, a: e.target.value } : p)) })}
                onBlur={() => save(d)}
              />
              <Button
                variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={busy}
                aria-label={L.remove}
                onClick={() => save({ ...d, qa: d.qa.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline" size="sm" className="gap-1" disabled={busy}
          onClick={() => setD({ ...d, qa: [...d.qa, { q: "", a: "" }] })}
        >
          <Plus className="size-4" /> {L.qaAdd}
        </Button>
      </div>

      {busy ? <p className="text-xs text-muted-foreground">{L.saving}</p> : null}
    </div>
  );
}
