"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Download, Upload, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Choosing what leaves the server, and what comes back. (step 500)
//
// Export used to be a single click that produced a zip whose contents nobody
// could name. It quietly included vector memory (inside app.db), quietly left out
// the knowledge graph — the most expensive artefact on the server — and never
// mentioned either. Import was worse: pick a file and it overwrote whatever it
// recognised, without saying what.
//
// So both are dialogs now, and both name every part before anything happens.

type Part = { id: string; label: string; note: string; secret: boolean; defaultOn: boolean; bytes: number };

function human(bytes: number): string {
  if (bytes <= 0) return "empty";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const [parts, setParts] = useState<Part[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/data/export/manifest", { cache: "no-store" });
        const d = await r.json();
        if (!r.ok) { setError(String(d.error ?? `Could not read the manifest (${r.status})`)); return; }
        setParts(d.parts);
        setPicked(new Set(d.parts.filter((p: Part) => p.defaultOn && p.bytes > 0).map((p: Part) => p.id)));
      } catch (e) {
        setError(String((e as Error).message ?? e));
      }
    })();
  }, []);

  const total = (parts ?? []).filter((p) => picked.has(p.id)).reduce((s, p) => s + p.bytes, 0);
  const secretPicked = (parts ?? []).some((p) => p.secret && picked.has(p.id));

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/data/export?parts=${[...picked].join(",")}`);
      if (!res.ok) { toast.error("Export failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "fractera-backup.zip";
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      toast.error(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Export data" icon={<Download size={14} />} onClose={onClose}>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {!parts && !error && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> Measuring…
        </div>
      )}

      {parts?.map((p) => (
        <label key={p.id} className={`flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer
          ${picked.has(p.id) ? "border-border bg-muted/40" : "border-border/60"}`}>
          <Checkbox checked={picked.has(p.id)} onCheckedChange={() => toggle(p.id)} disabled={p.bytes === 0} className="mt-0.5" />
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] text-foreground flex items-center gap-1.5">
              {p.label}
              <span className="text-[10px] text-muted-foreground font-mono">{human(p.bytes)}</span>
              {p.secret && <span className="text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400">secret</span>}
            </span>
            <span className="text-[10px] text-muted-foreground leading-relaxed">{p.note}</span>
          </span>
        </label>
      ))}

      {secretPicked && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
          <ShieldAlert size={13} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <span className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
            This archive will contain credentials. Anyone who opens it can act as your bot or reach your
            services. Keep it off shared drives and out of chats.
          </span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-2">
        The OpenAI key is never exported — you enter it again after restoring. Map data is never exported
        either: it is over a gigabyte, and the map panel re-downloads its region on demand.
      </p>

      <div className="flex items-center gap-2 justify-end">
        <span className="text-[10px] text-muted-foreground mr-auto font-mono">≈ {human(total)} before compression</span>
        <button type="button" onClick={onClose} disabled={busy}
          className="px-3 py-1.5 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40">
          Cancel
        </button>
        <button type="button" onClick={download} disabled={busy || picked.size === 0}
          className="px-3 py-1.5 text-[11px] rounded-md border border-border bg-primary text-primary-foreground hover:bg-primary/85 transition-colors disabled:opacity-40 flex items-center gap-1.5">
          {busy && <Loader2 size={11} className="animate-spin" />}
          {busy ? "Packing…" : "Download"}
        </button>
      </div>
    </Shell>
  );
}

export function ImportDialog({ file, onClose }: { file: File; onClose: () => void }) {
  const [found, setFound] = useState<{ parts: string[]; createdAt: string | null; sizeBytes: number } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const LABELS: Record<string, { label: string; effect: string }> = {
    db: { label: "Database and vector memory", effect: "rows are ADDED; anything already here keeps its value" },
    files: { label: "Files and their details", effect: "only files you do not already have are written" },
    knowledge: { label: "Knowledge base (graph)", effect: "REPLACES the current graph entirely" },
    config: { label: "Application settings", effect: "REPLACES branding, languages, theme and routing" },
    channels: { label: "Communication channels", effect: "REPLACES the bot token and linked account" },
    env: { label: "Environment file", effect: "REPLACES this server's environment file" },
  };

  useEffect(() => {
    (async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        const r = await fetch("/api/data/import?inspect=1", { method: "POST", body: form });
        const d = await r.json();
        if (!r.ok) { setError(String(d.error ?? `Could not read the archive (${r.status})`)); return; }
        setFound(d);
        // Everything found is on by default EXCEPT the destructive replacements
        // of settings and secrets — those the owner has to choose deliberately.
        setPicked(new Set((d.parts as string[]).filter((p) => p !== "env" && p !== "channels")));
      } catch (e) {
        setError(String((e as Error).message ?? e));
      }
    })();
  }, [file]);

  async function restore() {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("parts", [...picked].join(","));
      const r = await fetch("/api/data/import", { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        const s = d.stats ?? {};
        toast.success(`Restored: ${Object.entries(s).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing to change"}`);
        onClose();
      } else {
        toast.error(String(d.error ?? `Import failed (${r.status})`));
      }
    } catch (e) {
      toast.error(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Import data" icon={<Upload size={14} />} onClose={onClose}>
      <p className="text-[10px] text-muted-foreground font-mono break-all">{file.name}</p>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {!found && !error && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> Reading the archive…
        </div>
      )}

      {found && found.parts.length === 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5">
          <AlertTriangle size={13} className="text-destructive mt-0.5 shrink-0" />
          <span className="text-[10px] text-destructive leading-relaxed">
            Nothing recognisable inside. This does not look like a Fractera backup.
          </span>
        </div>
      )}

      {found?.parts.map((id) => {
        const meta = LABELS[id] ?? { label: id, effect: "" };
        const replaces = meta.effect.includes("REPLACE");
        return (
          <label key={id} className={`flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer
            ${picked.has(id) ? "border-border bg-muted/40" : "border-border/60"}`}>
            <Checkbox checked={picked.has(id)}
              onCheckedChange={() => setPicked((prev) => {
                const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
              })}
              className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[11px] text-foreground">{meta.label}</span>
              <span className={`text-[10px] leading-relaxed ${replaces ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                {meta.effect}
              </span>
            </span>
          </label>
        );
      })}

      {found?.createdAt && (
        <p className="text-[10px] text-muted-foreground">Archive created {new Date(found.createdAt).toLocaleString()}.</p>
      )}

      <div className="flex items-center gap-2 justify-end border-t border-border pt-2">
        <button type="button" onClick={onClose} disabled={busy}
          className="px-3 py-1.5 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40">
          Cancel
        </button>
        <button type="button" onClick={restore} disabled={busy || picked.size === 0}
          className="px-3 py-1.5 text-[11px] rounded-md border border-border bg-primary text-primary-foreground hover:bg-primary/85 transition-colors disabled:opacity-40 flex items-center gap-1.5">
          {busy && <Loader2 size={11} className="animate-spin" />}
          {busy ? "Restoring…" : "Restore"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ title, icon, onClose, children }: {
  title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-background p-4
                      flex flex-col gap-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[13px] font-semibold text-foreground flex-1">{title}</span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={13} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
