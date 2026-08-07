"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Download, Upload, Loader2, AlertTriangle, ShieldAlert, FileArchive } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportHelp, ImportHelp } from "./help-note.client";

// Backing up and restoring, as full pages. (step 500)
//
// These began as modal dialogs, which made them the only two surfaces in the
// drawer that behaved differently from everything else. They are pages now, with
// the same anchors and the same header shape as Users or Vector memory — and the
// same "?" that explains what the page is for before you use it.

type Part = { id: string; label: string; note: string; secret: boolean; defaultOn: boolean; bytes: number };

function human(bytes: number): string {
  if (bytes <= 0) return "empty";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

function PanelShell({ title, help, icon, onClose, children }: {
  title: string; help: React.ReactNode; icon: React.ReactNode; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-full h-full bg-background border-t border-border">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          {icon}
          {title}
          {help}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 w-full">{children}</div>
    </div>
  );
}

function PartRow({ checked, onToggle, disabled, title, note, tone }: {
  checked: boolean; onToggle: () => void; disabled?: boolean;
  title: React.ReactNode; note: string; tone?: "warn";
}) {
  return (
    <label className={`flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer
      ${checked ? "border-border bg-muted/40" : "border-border/60"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <Checkbox checked={checked} onCheckedChange={onToggle} disabled={disabled} className="mt-0.5" />
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[11px] text-foreground flex items-center gap-1.5 flex-wrap">{title}</span>
        <span className={`text-[10px] leading-relaxed ${tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
          {note}
        </span>
      </span>
    </label>
  );
}

export function ExportPanel({ onClose }: { onClose: () => void }) {
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
      toast.success("Archive downloaded");
    } catch (e) {
      toast.error(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelShell title="Export data" help={<ExportHelp />} icon={<Download size={13} />} onClose={onClose}>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {!parts && !error && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> Measuring…
        </div>
      )}

      {parts?.map((p) => (
        <PartRow
          key={p.id}
          checked={picked.has(p.id)}
          onToggle={() => toggle(p.id)}
          disabled={p.bytes === 0}
          note={p.note}
          title={<>
            {p.label}
            <span className="text-[10px] text-muted-foreground font-mono">{human(p.bytes)}</span>
            {p.secret && <span className="text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400">secret</span>}
          </>}
        />
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

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono flex-1">≈ {human(total)} before compression</span>
        <button type="button" onClick={download} disabled={busy || picked.size === 0}
          className="px-3 py-1.5 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40 flex items-center gap-1.5">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
          {busy ? "Packing…" : "Download archive"}
        </button>
      </div>
    </PanelShell>
  );
}

const IMPORT_EFFECTS: Record<string, { label: string; effect: string; replaces: boolean }> = {
  db: { label: "Database and vector memory", effect: "rows are ADDED; anything already here keeps its value", replaces: false },
  files: { label: "Files and their details", effect: "only files you do not already have are written", replaces: false },
  knowledge: { label: "Knowledge base (graph)", effect: "REPLACES the current graph entirely", replaces: true },
  config: { label: "Application settings", effect: "REPLACES branding, languages, theme and routing", replaces: true },
  channels: { label: "Communication channels", effect: "REPLACES the bot token and the linked account", replaces: true },
  env: { label: "Environment file", effect: "REPLACES this server's environment file", replaces: true },
};

export function ImportPanel({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [found, setFound] = useState<{ parts: string[]; createdAt: string | null } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Looking is separate from writing: the archive is inspected on the server and
  // nothing is touched until the parts are confirmed below.
  async function inspect(f: File) {
    setFile(f);
    setFound(null);
    setError(null);
    setReading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const r = await fetch("/api/data/import?inspect=1", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) { setError(String(d.error ?? `Could not read the archive (${r.status})`)); return; }
      setFound(d);
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
        const s: Record<string, number> = d.stats ?? {};
        const summary = Object.entries(s).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(", ");
        toast.success(summary ? `Restored: ${summary}` : "Nothing needed changing");
        setFile(null);
        setFound(null);
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
    <PanelShell title="Import data" help={<ImportHelp />} icon={<Upload size={13} />} onClose={onClose}>
      <input ref={fileRef} type="file" accept=".zip" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) inspect(f); }} />

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={reading || busy}
          className="flex items-center gap-2 px-3 py-1.5 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40">
          {reading ? <Loader2 size={11} className="animate-spin" /> : <FileArchive size={11} />}
          {reading ? "Reading…" : file ? "Choose another archive" : "Choose an archive"}
        </button>
        {file && <span className="text-[10px] text-muted-foreground font-mono truncate">{file.name}</span>}
      </div>

      {error && <p className="text-[11px] text-destructive leading-relaxed break-words">{error}</p>}

      {!file && !error && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Nothing is written until you choose what to restore. The archive is read first and its contents
          are listed here.
        </p>
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
        const meta = IMPORT_EFFECTS[id] ?? { label: id, effect: "", replaces: false };
        return (
          <PartRow
            key={id}
            checked={picked.has(id)}
            onToggle={() => setPicked((prev) => {
              const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
            })}
            title={meta.label}
            note={meta.effect}
            tone={meta.replaces ? "warn" : undefined}
          />
        );
      })}

      {found?.createdAt && (
        <p className="text-[10px] text-muted-foreground">
          Archive created {new Date(found.createdAt).toLocaleString()}.
        </p>
      )}

      {found && found.parts.length > 0 && (
        <div className="flex items-center gap-2 border-t border-border pt-2">
          <span className="text-[10px] text-muted-foreground flex-1">
            {picked.size} of {found.parts.length} selected
          </span>
          <button type="button" onClick={restore} disabled={busy || picked.size === 0}
            className="px-3 py-1.5 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40 flex items-center gap-1.5">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
            {busy ? "Restoring…" : "Restore selected"}
          </button>
        </div>
      )}
    </PanelShell>
  );
}
