"use client";

// COPY of bridges/app/components/ai-elements/xterm-terminal.client.tsx (step 255.B1) — projects-app and
// the admin app are separate Next apps, so the component is DUPLICATED, not imported. Fix bugs IN PAIRS
// (both copies). Extensions over the original (the 255 dev-console protocol): `cwd`, `sessionId`,
// `keepAlive` ride the init message; `sendExit()` ends a keep-alive session for good.

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

type Props = {
  wsUrl: string;
  platform?: string;
  /** 255.A1 — the working directory the shell spawns in (validated server-side). */
  cwd?: string;
  /** 255.A2 — a stable id makes the session survive disconnects; reattach replays the buffer. */
  sessionId?: string;
  keepAlive?: boolean;
  onClose?: () => void;
  onData?: (chunk: string) => void;
};

export type XtermTerminalHandle = {
  sendStdin: (data: string) => void;
  /** Ends a keep-alive session permanently ({type:'exit'} — the only client-side kill). */
  sendExit: () => void;
  focus: () => void;
};

export const XtermTerminal = forwardRef<XtermTerminalHandle, Props>(
  function XtermTerminal({ wsUrl, platform = "claude-code", cwd, sessionId, keepAlive, onClose, onData }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const onDataRef = useRef<typeof onData>(onData);
    const wsRef = useRef<WebSocket | null>(null);
    const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
    onDataRef.current = onData;

    useImperativeHandle(ref, () => ({
      sendStdin: (data: string) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "stdin", data }));
        }
      },
      sendExit: () => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "exit" }));
        }
      },
      focus: () => { termRef.current?.focus(); },
    }), []);

    useEffect(() => {
      if (!containerRef.current) return;

      termRef.current = null;
      const term = new Terminal({
        theme: {
          background: "#09090b",
          foreground: "#e4e4e7",
          cursor: "#a1a1aa",
          selectionBackground: "#3f3f46",
        },
        fontSize: 13,
        fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
        cursorBlink: true,
        convertEol: true,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      termRef.current = term;

      requestAnimationFrame(() => { fitAddon.fit(); });

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let disposed = false;
      function refit() {
        if (disposed) return;
        try { fitAddon.fit(); } catch { return; }
        const sock = wsRef.current;
        if (sock && sock.readyState === WebSocket.OPEN) {
          sock.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }
      }

      // Re-fit once the real monospace web font is in (see the original's comment).
      if (document.fonts?.ready) document.fonts.ready.then(refit).catch(() => {});
      const settleTimer = setTimeout(refit, 150);

      ws.onopen = () => {
        requestAnimationFrame(() => {
          fitAddon.fit();
          ws.send(JSON.stringify({ type: "init", platform, cwd, sessionId, keepAlive }));
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        });
      };

      const decoder = new TextDecoder("utf-8", { fatal: false });

      ws.onmessage = (e) => {
        if (typeof e.data === "string") {
          term.write(e.data);
          onDataRef.current?.(e.data);
        } else {
          (e.data as Blob).arrayBuffer().then((buf: ArrayBuffer) => {
            const u8 = new Uint8Array(buf);
            term.write(u8);
            if (onDataRef.current) {
              onDataRef.current(decoder.decode(u8, { stream: true }));
            }
          });
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        term.write("\r\n\x1b[90m[disconnected]\x1b[0m\r\n");
        onClose?.();
      };

      ws.onerror = () => {
        term.write("\r\n\x1b[31m[connection error — is the bridge running on :3201?]\x1b[0m\r\n");
      };

      term.onData((data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "stdin", data }));
        }
      });

      const ro = new ResizeObserver(() => {
        fitAddon.fit();
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }
      });
      ro.observe(containerRef.current);

      return () => {
        disposed = true;
        clearTimeout(settleTimer);
        ro.disconnect();
        wsRef.current = null;
        try { ws.close(); } catch { /* already closed */ }
        term.dispose();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsUrl]);

    return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
  },
);
