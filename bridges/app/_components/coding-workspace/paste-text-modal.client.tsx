"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ClipboardPaste, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "paste-text-history";
const MAX_HISTORY = 10;

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
};

export function PasteTextModal({ open, onClose, onSend }: Props) {
  const [text, setText]             = useState("");
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [history, setHistory]       = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setHistory(loadHistory());
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      setText("");
      setHistoryOpen(false);
    }
  }, [open]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(autoSubmit ? text + "\n" : text);
    const next = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
    setHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); }
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("text")) return;
    file.text().then((content) => setText(content));
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardPaste size={16} />
            Paste to terminal
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {history.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown size={11} className={historyOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                Recent ({history.length})
              </button>
              {historyOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setText(item); setHistoryOpen(false); }}
                      className="w-full text-left px-3 py-2 text-[11px] text-foreground hover:bg-muted truncate block transition-colors"
                    >
                      {item.length > 90 ? item.slice(0, 90) + "…" : item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              placeholder="Paste text here — or drag & drop a text file…"
              className="w-full min-h-[160px] max-h-[384px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              rows={8}
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50 select-none pointer-events-none">
              {text.length} chars
            </span>
          </div>

          <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSubmit}
              onChange={(e) => setAutoSubmit(e.target.checked)}
              className="rounded border-input"
            />
            Auto-submit (add Enter at end)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSend} disabled={!text.trim()}>
            <ClipboardPaste size={13} />
            Send to terminal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
