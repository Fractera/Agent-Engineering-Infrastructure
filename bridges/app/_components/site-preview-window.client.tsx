"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { GripHorizontal, RefreshCw, X } from "lucide-react";
import { PreviewHelp } from "./coding-workspace/help-note.client";

type Props = {
  open: boolean;
  onClose: () => void;
  siteUrl: string;
  // "floating" — the draggable, resizable window over the workspace. Worth having on a wide screen,
  // where there is room to put it beside what you are configuring.
  // "inline" — the same preview as an ordinary page between the header and the footer. On a tablet or a
  // phone a window you can drag is not a feature: there is no free canvas to drag it across, and the
  // resize handles sit under the thumb that is trying to scroll the page inside.
  mode?: "floating" | "inline";
};

// The Shell reads this marker to know it is being shown inside the Admin preview (the
// developer/architect context) and so activates its debug tools (footer page editor, slot
// highlight + fine-tune handles). A normal end-user page view has no marker → tools stay off.
const ADMIN_PREVIEW_PARAM = "fractera_admin_preview";
function previewUrl(base: string, path?: string): string {
  try {
    const u = path ? new URL(path, base) : new URL(base);
    u.searchParams.set(ADMIN_PREVIEW_PARAM, "1");
    return u.href;
  } catch {
    return base;
  }
}

export function SitePreviewWindow({ open, onClose, siteUrl, mode = "floating" }: Props) {
  const [mounted, setMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  function handleReload() {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }

  // One title bar for both modes — the grip and the drag cursor are the only difference, because they
  // are the only things that mean anything different.
  const titleBar = (
    <div
      className={`shrink-0 flex items-center gap-2 px-3 border-b border-border bg-background select-none ${
        mode === "floating" ? "drag-handle cursor-grab active:cursor-grabbing" : ""
      }`}
      style={{ height: 36 }}
    >
      {mode === "floating" && <GripHorizontal size={14} className="text-muted-foreground shrink-0" />}
      <span className="text-xs text-muted-foreground shrink-0">App Preview</span>
      {/* The "?" stands next to the name in both modes — on a narrow screen the caption beside it is
          hidden, and an explanation that disappears with the caption would be missing exactly where
          there is least room to guess. */}
      <PreviewHelp />
      <span className="hidden xl:inline text-[11px] text-muted-foreground/60 truncate">
        current server version
      </span>
      <span className="flex-1" />

      <button
        type="button"
        onClick={handleReload}
        className="shrink-0 flex items-center gap-1 px-2 h-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[11px] font-medium"
        title="Reload preview"
      >
        <RefreshCw size={11} />
        <span className="hidden sm:inline">Reload &amp; Update</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 flex items-center justify-center size-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );

  const frame = (
    <iframe
      ref={iframeRef}
      src={previewUrl(siteUrl)}
      className="flex-1 border-0 w-full"
      style={{ minHeight: 0 }}
      title="App Preview"
    />
  );

  // Inline: no portal, no fixed positioning — the caller places this inside the workspace area, and it
  // fills whatever it is given, exactly like every other page opened from the menu.
  if (mode === "inline") {
    if (!open) return null;
    return (
      <div className="flex flex-col w-full h-full bg-background overflow-hidden">
        {titleBar}
        {frame}
      </div>
    );
  }

  const defaultW = Math.min(1000, window.innerWidth - 40);
  const defaultH = Math.min(700, window.innerHeight - 80);
  const defaultX = Math.max(0, (window.innerWidth  - defaultW) / 2);
  const defaultY = Math.max(0, (window.innerHeight - defaultH) / 2);

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
          {titleBar}
          {frame}
        </div>
      </Rnd>
    </div>,
    document.body
  );
}
