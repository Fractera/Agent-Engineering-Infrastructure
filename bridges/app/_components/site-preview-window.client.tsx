"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { GripHorizontal, RefreshCw, X, ChevronDown, LayoutList } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  siteUrl: string;
};

// Service pages — the admin-only introspection pages of the workspace Shell.
// They were removed from the Shell home; this menu is their access point. Each
// path is opened inside the preview iframe (targeting the previewed Shell app).
const SERVICE_PAGES: { label: string; path: string }[] = [
  { label: "AI Core", path: "/ai-core" },
  { label: "Architecture", path: "/architecture" },
  { label: "Development steps", path: "/development-steps" },
  { label: "Patterns", path: "/patterns" },
  { label: "Glossary", path: "/glossary" },
  { label: "Documents", path: "/documents" },
  { label: "AI Draft Settings", path: "/ai-draft-settings" },
  { label: "Debug", path: "/debug" },
];

export function SitePreviewWindow({ open, onClose, siteUrl }: Props) {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const defaultW = Math.min(1000, window.innerWidth - 40);
  const defaultH = Math.min(700, window.innerHeight - 80);
  const defaultX = Math.max(0, (window.innerWidth  - defaultW) / 2);
  const defaultY = Math.max(0, (window.innerHeight - defaultH) / 2);

  function handleReload() {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }

  // Open a service page inside the preview iframe, resolved against the Shell origin.
  function openPage(path: string) {
    if (iframeRef.current) {
      try { iframeRef.current.src = new URL(path, siteUrl).href; }
      catch { iframeRef.current.src = siteUrl; }
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
            <span className="text-xs text-muted-foreground flex-1 truncate">App Preview</span>

            {/* Service pages menu — admin-only workspace pages, opened in the preview */}
            <div className="relative shrink-0" onMouseDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1 px-2 h-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[11px] font-medium"
                title="Service pages"
              >
                <LayoutList size={11} />
                Service pages
                <ChevronDown size={11} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <>
                  {/* click-away */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-7 z-20 w-48 rounded-md border border-border bg-popover py-1 shadow-xl">
                    {SERVICE_PAGES.map((p) => (
                      <button
                        key={p.path}
                        type="button"
                        onClick={() => openPage(p.path)}
                        className="block w-full px-3 py-1.5 text-left text-[11px] text-foreground hover:bg-muted transition-colors"
                      >
                        {p.label}
                        <span className="ml-1 font-mono text-[10px] text-muted-foreground">{p.path}</span>
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
              title="Reload preview"
            >
              <RefreshCw size={11} />
              Reload &amp; Update
            </button>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 flex items-center justify-center size-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          </div>
          {/* Iframe */}
          <iframe
            ref={iframeRef}
            src={siteUrl}
            className="flex-1 border-0 w-full"
            style={{ minHeight: 0 }}
            title="App Preview"
          />
        </div>
      </Rnd>
    </div>,
    document.body
  );
}
