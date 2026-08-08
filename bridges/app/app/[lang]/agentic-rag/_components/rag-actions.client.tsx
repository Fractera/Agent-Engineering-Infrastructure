"use client";

// Действия над графом знаний (шаг 501, Ф2, партия 6): включить и выключить службу,
// принять текст, стереть базу. Один островок на весь раздел; чтение — состояние,
// список документов, ответ на вопрос — остаётся серверным.
//
// Обращаемся к маршрутам ПАНЕЛИ (`/api/rag/*`), а не к службе напрямую: правило
// «браузер говорит с панелью» не меняем. Служба слушает только петлю, и её ключ
// в браузер не попадает.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type RagActionLabels = {
  turnOn: string; turnOff: string; ingestText: string; wipe: string;
  ingestTitle: string; ingestHint: string; ingestPlaceholder: string; cancel: string; send: string;
  wipeTitle: string; wipeBody: string; wipeConfirm: string;
  started: string; stopped: string; ingested: string; wiped: string; failed: string;
};

export function RagActions(
  { running, labels }: { running: boolean; labels: RagActionLabels },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "power" | "ingest" | "wipe">(null);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [text, setText] = useState("");
  const [wipeOpen, setWipeOpen] = useState(false);

  async function call(url: string, body: unknown, okMessage: string, tag: "power" | "ingest" | "wipe") {
    setBusy(tag);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.error) throw new Error(String(d?.error ?? labels.failed));
      toast.success(okMessage);
      startTransition(() => router.refresh());
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => call("/api/rag/power", { on: !running }, running ? labels.stopped : labels.started, "power")}
        >
          {busy === "power" ? <Loader2 size={11} className="animate-spin" /> : <Power size={11} />}
          {running ? labels.turnOff : labels.turnOn}
        </Button>

        <Button variant="outline" size="sm" disabled={busy !== null || !running} onClick={() => setIngestOpen(true)}>
          <Upload size={11} />{labels.ingestText}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          disabled={busy !== null || !running}
          onClick={() => setWipeOpen(true)}
        >
          <Trash2 size={11} />{labels.wipe}
        </Button>
      </div>

      {ingestOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="flex w-full max-w-lg flex-col gap-3 rounded-xl bg-background p-5 shadow-xl">
            <span className="text-xs font-semibold text-foreground">{labels.ingestTitle}</span>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{labels.ingestHint}</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={labels.ingestPlaceholder}
              className="resize-none rounded-lg border border-border bg-muted px-2.5 py-1.5 font-mono text-[11px] text-foreground focus:ring-2 focus:ring-ring/50 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIngestOpen(false)}>{labels.cancel}</Button>
              <Button
                size="sm"
                disabled={busy !== null || !text.trim()}
                onClick={async () => {
                  const ok = await call("/api/rag/ingest", { text }, labels.ingested, "ingest");
                  if (ok) { setIngestOpen(false); setText(""); }
                }}
              >
                {busy === "ingest" ? <Loader2 size={11} className="mr-1 animate-spin" /> : null}{labels.send}
              </Button>
            </div>
          </div>
        </div>
      )}

      {wipeOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl bg-background p-5 shadow-xl">
            <span className="text-xs font-semibold text-foreground">{labels.wipeTitle}</span>
            <span className="text-[11px] text-muted-foreground">{labels.wipeBody}</span>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setWipeOpen(false)}>{labels.cancel}</Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={busy !== null}
                onClick={async () => {
                  const ok = await call("/api/rag/documents/delete", { all: true }, labels.wiped, "wipe");
                  if (ok) setWipeOpen(false);
                }}
              >
                {busy === "wipe" ? <Loader2 size={11} className="mr-1 animate-spin" /> : null}{labels.wipeConfirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
