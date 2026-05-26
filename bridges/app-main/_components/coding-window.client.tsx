"use client";

import { createPortal } from "react-dom";
import { useState, useRef } from "react";
import { Rnd } from "react-rnd";
import { X, GripHorizontal, Code2 } from "lucide-react";
import { CodingWindowShell } from "./coding-workspace/coding-window-shell.client";
import { Button } from "@/components/ui/button";
import type { Platform } from "./coding-workspace/platforms";

type Props = {
  onClose: () => void;
  onTerminalClose: (p: Platform) => void;
  terminalPlatform: Platform;
  terminalSessions: Set<Platform>;
  onPlatformClick: (p: Platform) => void;
  visible: boolean;
};

const W = 1000;
const H = 744;
const TITLE_H = 37;
const MOBILE_BREAKPOINT = 768;
const SWIPE_THRESHOLD = 80;

export function CodingWindow({ onClose, onTerminalClose, terminalPlatform, terminalSessions, onPlatformClick, visible }: Props) {
  const [initialW] = useState(() =>
    window.innerWidth < MOBILE_BREAKPOINT ? Math.round(window.innerWidth * 0.99) : W
  );
  const isMobile = initialW < W;
  const mobileH = isMobile ? Math.round(window.innerHeight * 0.93) : H;

  const [pos] = useState(() => ({
    x: Math.round((window.innerWidth - initialW) / 2),
    y: Math.round((window.innerHeight - H) / 2),
  }));
  const [windowWidth, setWindowWidth] = useState(initialW);

  const touchStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    setDragY(0);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragY(delta);
  }

  function handleTouchEnd() {
    if (dragY > SWIPE_THRESHOLD) onClose();
    setDragY(0);
    touchStartY.current = null;
  }

  // ── Mobile: bottom sheet ──
  if (isMobile) {
    return createPortal(
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(0,0,0,0.5)",
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
            transition: "opacity 0.35s cubic-bezier(0.32,0.72,0,1)",
          }}
        />
        <div
          style={{
            position: "fixed",
            left: `${(window.innerWidth - initialW) / 2}px`,
            width: initialW,
            bottom: 0,
            height: mobileH,
            zIndex: 9999,
            transform: visible ? `translateY(${dragY}px)` : `translateY(${mobileH}px)`,
            transition: dragY > 0 ? "none" : "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
            borderRadius: "16px 16px 0 0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          className="border border-border bg-background shadow-2xl"
        >
          <div
            className="flex flex-col items-center border-b border-border bg-muted/50 flex-shrink-0 select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mt-2 mb-1" />
            <div className="flex items-center gap-2 px-4 pb-2 w-full">
              <Code2 size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-foreground flex-1">Code Workspace</span>
            </div>
          </div>
          <CodingWindowShell
            height={mobileH - TITLE_H}
            terminalPlatform={terminalPlatform}
            terminalSessions={terminalSessions}
            onPlatformClick={onPlatformClick}
            onTerminalClose={onTerminalClose}
            windowWidth={initialW}
            isMobile
          />
        </div>
      </>,
      document.body
    );
  }

  // ── Desktop: draggable Rnd ──
  return createPortal(
    <Rnd
      default={{ x: pos.x, y: pos.y, width: initialW, height: H }}
      minWidth={400}
      minHeight={H}
      maxHeight={H}
      bounds="window"
      dragHandleClassName="drag-handle"
      style={{ zIndex: 9999, display: visible ? undefined : "none" }}
      className="flex flex-col rounded-xl border border-border bg-background shadow-2xl"
      enableUserSelectHack={false}
      enableResizing={{
        top: false, bottom: false,
        topLeft: false, topRight: false,
        bottomLeft: false, bottomRight: false,
        left: true, right: true,
      }}
      onResize={(_e, _dir, ref) => setWindowWidth(ref.offsetWidth)}
    >
      <div className="drag-handle flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50 cursor-grab active:cursor-grabbing select-none rounded-t-xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-muted-foreground" />
          <Code2 size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Code Workspace</span>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose} title="Close">
          <X size={14} />
        </Button>
      </div>
      <CodingWindowShell
        height={H - TITLE_H}
        terminalPlatform={terminalPlatform}
        terminalSessions={terminalSessions}
        onPlatformClick={onPlatformClick}
        onTerminalClose={onTerminalClose}
        windowWidth={windowWidth}
      />
    </Rnd>,
    document.body
  );
}
