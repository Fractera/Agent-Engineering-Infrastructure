"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { GripHorizontal, RefreshCw, X, ChevronDown, Wrench } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

// The 8 architect service pages, now native admin routes at :3002/service/<page>
// (migrated out of the guest slot in step 170 so they survive slot rebuilds). The
// iframe is SAME-ORIGIN — the admin app serves these itself; no preview marker and
// no cross-origin Shell URL. proxy.ts gates /service/* architect-only in secure mode.
const SERVICE_PAGES: { label: string; path: string }[] = [
  { label: "AI Core", path: "/service/ai-core" },
  { label: "Architecture", path: "/service/architecture" },
  { label: "Development steps", path: "/service/development-steps" },
  { label: "Patterns", path: "/service/patterns" },
  { label: "Glossary", path: "/service/glossary" },
  { label: "Documents", path: "/service/documents" },
  { label: "AI Draft Settings", path: "/service/ai-draft-settings" },
  { label: "Debug", path: "/service/debug" },
];

const DEFAULT_PAGE = SERVICE_PAGES[1]; // Architecture

export function ServiceWindow({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [current, setCurrent] = useState(DEFAULT_PAGE);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const defaultW = Math.min(1100, window.innerWidth - 40);
  const defaultH = Math.min(760, window.innerHeight - 80);
  const defaultX = Math.max(0, (window.innerWidth  - defaultW) / 2);
  const defaultY = Math.max(0, (window.innerHeight - defaultH) / 2);

  function handleReload() {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }

  // Same-origin navigation — set the iframe to the chosen native /service route.
  function openPage(page: { label: string; path: string }) {
    setCurrent(page);
    if (iframeRef.current) {
      iframeRef.current.src = page.path;
    }
    setMenuOpen(false);
  }

  return createPortal(
    <div style={{ display: open ? undefined : "none", position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
      <Rnd
        default={{ x: defaultX, y: defaultY, width: defaultW, height: defaultH }}
        minWidth={320}
        minHeight={240}
        bounds="window"
        dragHandleClassName="drag-handle"
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex flex-col w-full h-full rounded-lg border border-border bg-background shadow-2xl overflow-hidden">
          {/* Title bar */}
          <div className="drag-handle shrink-0 flex items-center gap-2 px-3 border-b border-border bg-background cursor-grab active:cursor-grabbing select-none" style={{ height: 36 }}>
            <GripHorizontal size={14} className="text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground flex-1 truncate">Service — {current.label}</span>

            {/* Service pages menu — pick which native /service page fills the window */}
            <div className="relative shrink-0" onMouseDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1 px-2 h-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[11px] font-medium"
                title="Service pages"
              >
                <Wrench size={11} />
                Pages
                <ChevronDown size={11} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <>
                  {/* click-away */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-7 z-20 w-52 rounded-md border border-border bg-popover py-1 shadow-xl">
                    {SERVICE_PAGES.map((p) => (
                      <button
                        key={p.path}
                        type="button"
                        onClick={() => openPage(p)}
                        className={`block w-full px-3 py-1.5 text-left text-[11px] hover:bg-muted transition-colors ${p.path === current.path ? "text-foreground font-medium" : "text-foreground"}`}
                      >
                        {p.label}
                        <span className="ml-1 font-mono text-[10px] text-muted-foreground">{p.path.replace("/service", "")}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

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
          {/* Iframe — same-origin native /service route */}
          <iframe
            ref={iframeRef}
            src={DEFAULT_PAGE.path}
            className="flex-1 border-0 w-full"
            style={{ minHeight: 0 }}
            title="Service"
          />
        </div>
      </Rnd>
    </div>,
    document.body
  );
}
