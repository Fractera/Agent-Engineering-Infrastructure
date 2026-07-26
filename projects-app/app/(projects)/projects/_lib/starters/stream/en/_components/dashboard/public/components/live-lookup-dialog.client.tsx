"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// THE LIVE-LOOKUP DIALOG (step 243) — the modal behind a dashboard table's `action:"live"` column
// (table-config.ts). A stored row is a SNAPSHOT; some data (a price, an external status) goes stale the
// moment it's written. This dialog GETs the column's declared `liveUrl` fresh on open and shows the raw
// JSON response — a plain key/value list, since the shape differs per automation and this component has no
// business knowing it. It never writes anything: purely a read, modeled on the same fetch-then-render
// pattern already used by tests-modal.client.tsx (Loader2 → success/error), so the platform has ONE way to
// show "I called something live and here's what came back," not a bespoke one per automation.
type Status = "loading" | "ok" | "error";

export function LiveLookupDialog({
  open, url, title, onClose,
}: {
  open: boolean;
  url: string | null;
  title: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !url) return;
    let alive = true;
    setStatus("loading");
    setPayload(null);
    setError("");
    void (async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        const d = (await r.json().catch(() => null)) as Record<string, unknown> | null;
        if (!alive) return;
        if (!r.ok) {
          setStatus("error");
          setError(String(d?.error ?? "Request failed"));
          return;
        }
        setStatus("ok");
        setPayload(d ?? {});
      } catch {
        if (alive) { setStatus("error"); setError("Request failed"); }
      }
    })();
    return () => { alive = false; };
  }, [open, url]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          {status === "loading" && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          )}
          {status === "error" && (
            <p className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="size-4" /> {error}
            </p>
          )}
          {status === "ok" && payload && (
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Live
              </p>
              {Object.entries(payload).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-28 shrink-0 text-muted-foreground">{k}</span>
                  <span className="break-all">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
