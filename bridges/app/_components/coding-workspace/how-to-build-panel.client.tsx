"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

// The page a new owner should read first: how the server, the repository and their own machine fit
// together. It opens by itself the first time and then stays behind a footer button.
//
// Storage note: the panel used no localStorage at all before this. Reading it is wrapped, and an
// unreadable store counts as "already seen" — a private window must not reopen the guide on every
// visit, and a browser that refuses storage is not a reason to nag.

const SEEN_KEY = "fractera.howToBuild.seen";

export function hasSeenHowToBuild(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch { /* storage refused — the guide simply will not auto-open again this session */ }
}

export function HowToBuildPanel({ onClose, firstRun = false }: { onClose: () => void; firstRun?: boolean }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config/how-to-build", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `${res.status}`);
        setContent(data.content ?? "");
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  function close() {
    markSeen();
    onClose();
  }

  return (
    <div className="bg-background flex flex-col h-full w-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">How to build this project</span>
        <span className="text-[10px] text-muted-foreground">server · repository · your machine</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={close}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Shown once, on the very first opening, and never again. */}
          {firstRun && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={13} className="text-primary" />
                <span className="text-[12px] font-semibold text-foreground">Your server is up. Welcome.</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Everything below the fold is already running — the application, the accounts, the data. What
                is left is to connect a repository and start building. This page opens by itself only this
                once; afterwards it lives behind the button in the footer.
              </p>
            </div>
          )}

          {error ? (
            <p className="text-[11px] text-destructive">{error}</p>
          ) : content === null ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs py-10">
              <Loader2 size={13} className="animate-spin" />Loading…
            </div>
          ) : (
            <div
              className="text-[12px] leading-relaxed text-muted-foreground
                         [&_h1]:text-[17px] [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mb-3
                         [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-7 [&_h2]:mb-2
                         [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-1.5
                         [&_p]:mb-3
                         [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1.5
                         [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1.5
                         [&_li]:leading-relaxed
                         [&_strong]:text-foreground [&_strong]:font-semibold
                         [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-foreground
                         [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                         [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3
                         [&_blockquote]:text-foreground [&_blockquote]:font-medium [&_blockquote]:my-3
                         [&_hr]:border-border [&_hr]:my-6
                         [&_a]:text-primary [&_a]:underline"
            >
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
