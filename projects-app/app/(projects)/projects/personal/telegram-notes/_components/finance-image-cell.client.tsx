"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Receipt preview cell (step 207.9): the finance table's image column. A click opens a modal with the
// full receipt image (media URL). Server-rendered table + this small client island — the rest of the
// section stays JS-free. Degrades to the raw link (works with JavaScript off) inside the dialog trigger.
// Media URLs are stored as http://localhost:3300/media/<id>/file — the media SERVICE address, unreachable
// from the browser in EITHER mode (IP mode: "localhost" is the viewer's machine; secure mode: :3300 is
// firewalled). Route every /media/ path through the app's same-origin proxy /api/media-proxy/* — that is
// what makes the Preview modals work identically in both modes (step 207.18d).
function sameOriginUrl(u: string): string {
  let pathname = u;
  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u);
      pathname = parsed.pathname + parsed.search;
    } catch {
      return u;
    }
  }
  const m = pathname.match(/^\/media\/(.+)$/);
  if (m) return `/api/media-proxy/${m[1]}`;
  return pathname;
}

export function FinanceImageCell({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const src = sameOriginUrl(url);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-primary hover:underline">
        Preview
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Receipt" className="mx-auto max-h-[70vh] w-auto rounded" />
          <a href={src} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline">
            Open original in a new tab
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
