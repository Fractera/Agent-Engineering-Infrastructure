"use client";

// Доска кейсов: цвет состояния, подтверждение и правка каждого (владелец 2026-08-10).
//
// 🔒 ОРАНЖЕВЫЙ = НЕ СОГЛАСОВАН, ЗЕЛЁНЫЙ = ПОДТВЕРЖДЁН. Кейс, рождённый моделью,
// не считается описанием продукта, пока человек его не прочитал: до этого он
// догадка, и строить по нему значит строить по догадке.
//
// 🔒 ЛЮБАЯ ПРАВКА СБРАСЫВАЕТ ЗЕЛЁНЫЙ (в хранилище). Иначе подтверждение означало
// бы «когда-то смотрел», а не «согласен вот с этим текстом».
//
// Три пути правки, все три — по заданию владельца: замечание словами (модель
// переписывает кейс), голос (то же самое, надиктованное) и прямая правка руками.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Pencil, Trash2, Sparkles, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";

export type UseCaseRow = {
  id: string;
  title: string;
  summary: string;
  status: "draft" | "confirmed";
};

export type BoardLabels = {
  draft: string; confirmed: string;
  confirm: string; unconfirm: string; confirmAll: string; confirmedAll: string;
  edit: string; save: string; saving: string; cancel: string; remove: string; removeConfirm: string;
  remarkTitle: string; remarkPlaceholder: string; rewrite: string; rewriting: string;
  failed: string; savedCase: string; noKey: string;
  titleLabel: string; summaryLabel: string;
};

export function CasesBoard(
  { cases, lang, labels }: { cases: UseCaseRow[]; lang: string; labels: BoardLabels },
) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(op: string, payload: Record<string, unknown> = {}, key = op) {
    setBusy(key);
    try {
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, ...payload }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) throw new Error(String(d?.error ?? labels.failed));
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
      return false;
    } finally {
      setBusy(null);
    }
  }

  const pending = cases.filter((c) => c.status !== "confirmed").length;

  return (
    <div className="space-y-2">
      {pending > 0 && (
        <div className="flex items-center gap-2">
          <span className="flex-1" />
          <Button
            size="sm"
            className="text-[11px]"
            onClick={async () => { if (await act("confirmAll")) toast.success(labels.confirmedAll); }}
            disabled={busy !== null}
          >
            {busy === "confirmAll" ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} />}
            {labels.confirmAll}
          </Button>
        </div>
      )}

      {cases.map((c) => (
        <CaseCard key={c.id} row={c} lang={lang} labels={labels} act={act} busy={busy} />
      ))}
    </div>
  );
}

function CaseCard(
  { row, lang, labels, act, busy }:
  {
    row: UseCaseRow; lang: string; labels: BoardLabels;
    act: (op: string, payload?: Record<string, unknown>, key?: string) => Promise<boolean>;
    busy: string | null;
  },
) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [summary, setSummary] = useState(row.summary);
  const [remark, setRemark] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const remarkField = useRef<HTMLTextAreaElement | null>(null);

  const confirmed = row.status === "confirmed";

  async function rewrite() {
    if (!remark.trim()) return;
    setRewriting(true);
    try {
      const r = await fetch("/api/use-cases/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "rewrite", lang, title, summary, remark: remark.trim() }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(d?.error === "no-key" ? labels.noKey : String(d?.error ?? labels.failed));
        return;
      }
      const next = d.case as { title: string; summary: string } | null;
      if (!next) { toast.error(labels.failed); return; }
      setTitle(next.title);
      setSummary(next.summary);
      setRemark("");
      toast.success(labels.savedCase);
    } finally {
      setRewriting(false);
    }
  }

  return (
    <div
      className={`rounded-lg border p-3 ${
        confirmed
          ? "border-l-4 border-l-emerald-500 border-border"
          : "border-l-4 border-l-amber-500 border-border"
      }`}
    >
      <div className="flex flex-wrap items-start gap-2">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] ${
            confirmed
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          }`}
        >
          {confirmed ? labels.confirmed : labels.draft}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{row.id}</span>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <div>
            <span className="text-[10px] text-muted-foreground">{labels.titleLabel}</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-[12px]" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">{labels.summaryLabel}</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-border bg-background p-2 text-[12px] leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Замечание словами или голосом — модель переписывает кейс, а не весь
              набор: правят один сценарий, а не начинают заново. */}
          <div className="rounded-md border border-border p-2.5">
            <p className="text-[10px] text-muted-foreground">{labels.remarkTitle}</p>
            <textarea
              ref={remarkField}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={labels.remarkPlaceholder}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-[11px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="mt-2 flex items-center gap-2">
              <VoiceInput targetRef={remarkField} value={remark} onChange={setRemark} lang={lang} apiUrl="/api/transcribe" />
              <Button size="sm" variant="outline" className="text-[11px]" onClick={rewrite} disabled={rewriting || !remark.trim()}>
                {rewriting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {rewriting ? labels.rewriting : labels.rewrite}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="text-[11px]"
              onClick={async () => {
                if (await act("edit", { id: row.id, title, summary }, row.id)) {
                  setEditing(false);
                  toast.success(labels.savedCase);
                }
              }}
              disabled={busy === row.id}
            >
              {busy === row.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {busy === row.id ? labels.saving : labels.save}
            </Button>
            <button
              type="button"
              onClick={() => { setTitle(row.title); setSummary(row.summary); setEditing(false); }}
              className="text-[11px] text-muted-foreground underline hover:text-foreground"
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-[13px] font-medium text-foreground">{row.title}</p>
          <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">{row.summary}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={confirmed ? "outline" : "default"}
              className="text-[11px]"
              onClick={() => act(confirmed ? "unconfirm" : "confirm", { id: row.id }, row.id)}
              disabled={busy === row.id}
            >
              {busy === row.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {confirmed ? labels.unconfirm : labels.confirm}
            </Button>
            <Button size="sm" variant="ghost" className="text-[11px]" onClick={() => setEditing(true)}>
              <Pencil size={11} />{labels.edit}
            </Button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={async () => {
                if (!confirm(labels.removeConfirm)) return;
                if (await act("delete", { id: row.id }, row.id)) router.refresh();
              }}
              className="text-muted-foreground/60 hover:text-destructive"
              title={labels.remove}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
