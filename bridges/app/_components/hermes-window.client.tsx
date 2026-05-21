"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { GripHorizontal, RefreshCw, X, Bot, ExternalLink } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  hermesUrl: string;
};

export function HermesWindow({ open, onClose, hermesUrl }: Props) {
  const [mounted, setMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const defaultW = Math.min(1200, window.innerWidth - 40);
  const defaultH = Math.min(760, window.innerHeight - 80);
  const defaultX = Math.max(0, (window.innerWidth  - defaultW) / 2);
  const defaultY = Math.max(0, (window.innerHeight - defaultH) / 2);

  function handleReload() {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  }

  return createPortal(
    <div style={{ display: open ? undefined : "none", position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none" }}>
      <Rnd
        default={{ x: defaultX, y: defaultY, width: defaultW, height: defaultH }}
        minWidth={480}
        minHeight={360}
        bounds="window"
        dragHandleClassName="drag-handle"
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex flex-col w-full h-full rounded-lg border border-border bg-background shadow-2xl overflow-hidden">
          {/* Title bar */}
          <div className="drag-handle shrink-0 flex items-center gap-2 px-3 border-b border-border bg-background cursor-grab active:cursor-grabbing select-none" style={{ height: 36 }}>
            <GripHorizontal size={14} className="text-muted-foreground shrink-0" />
            <Bot size={13} className="text-emerald-400 shrink-0" />
            <span className="text-xs text-muted-foreground flex-1 truncate">Основной агент</span>
            <a
              href={hermesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 px-2 h-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[11px] font-medium"
              title="Open in new tab"
            >
              <ExternalLink size={11} />
              New tab
            </a>
            <button
              type="button"
              onClick={handleReload}
              className="shrink-0 flex items-center gap-1 px-2 h-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[11px] font-medium"
              title="Reload"
            >
              <RefreshCw size={11} />
              Reload
            </button>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 flex items-center justify-center size-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Hermes iframe */}
          <iframe
            ref={iframeRef}
            src={hermesUrl}
            className="flex-1 border-0 w-full"
            style={{ minHeight: 0 }}
            title="Основной агент"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </Rnd>
    </div>,
    document.body
  );
}
