"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";

// A "?" next to a panel title that opens a written explanation. (step 500)
//
// The two knowledge stores look interchangeable from the outside — both take
// documents, both answer questions — and they are not. Someone who picks the
// wrong one pays for it either in money (a graph pass over data that changes
// hourly) or in quality (a flat search asked to connect facts across forty
// documents). The difference belongs in the product, next to the thing itself,
// not in a conversation that scrolls away.
//
// English only for now — the ten-language pass comes later, and the dictionary
// lives in lib/i18n/admin-translations.json.
export function HelpNote({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span className="relative inline-flex" ref={ref as React.RefObject<HTMLSpanElement>}>
      <button
        type="button"
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle size={12} />
      </button>

      {open && (
        <>
          {/* Click-away. Sits under the card so a click inside it does not close. */}
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-5 z-[61] w-[min(28rem,calc(100vw-3rem))] max-h-[60vh] overflow-y-auto
                       rounded-xl border border-border bg-background p-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-[12px] font-semibold text-foreground flex-1">{title}</span>
              <button type="button" onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={12} />
              </button>
            </div>
            <div className="text-[11px] leading-relaxed text-muted-foreground space-y-2.5
                            [&_strong]:text-foreground [&_strong]:font-semibold
                            [&_code]:font-mono [&_code]:text-[10px] [&_code]:text-foreground">
              {children}
            </div>
          </div>
        </>
      )}
    </span>
  );
}

// Both explanations end with the same fact, so it is written once. It is the
// question people ask second, right after "which one should I use".
export function SeparateStorageNote() {
  return (
    <p>
      <strong>The two do not share storage.</strong> Vectors live in the data service&apos;s SQLite,
      in the <code>vectors</code> table beside your rows. The graph lives in the RAG service&apos;s own
      folder. To have a document in both, upload it to both: you pay each one&apos;s ingest and get
      each one&apos;s kind of answer. Nothing is shared but the OpenAI key.
    </p>
  );
}
