'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { toast } from 'sonner';

const IDLE_MS = 300_000;
const TOAST_VISIBLE_MS = 30_000;

const PLATFORM_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  'codex':       'Codex',
  'gemini-cli':  'Gemini CLI',
  'qwen-code':   'Qwen Code',
  'kimi-code':   'Kimi Code',
};

type Props = {
  wsUrl: string;
  platform?: string;
  onClose?: () => void;
  onData?: (chunk: string) => void;
};

export type XtermTerminalHandle = {
  sendStdin: (data: string) => void;
  focus: () => void;
};

export const XtermTerminal = forwardRef<XtermTerminalHandle, Props>(
  function XtermTerminal({ wsUrl, platform = 'claude-code', onClose, onData }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const onDataRef    = useRef<typeof onData>(onData);
    const wsRef        = useRef<WebSocket | null>(null);
    const termRef      = useRef<import('@xterm/xterm').Terminal | null>(null);
    onDataRef.current  = onData;

    useImperativeHandle(ref, () => ({
      sendStdin: (data: string) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'stdin', data }));
        }
      },
      focus: () => { termRef.current?.focus(); },
    }), []);

    useEffect(() => {
      if (!containerRef.current) return;

      const label   = PLATFORM_LABELS[platform] ?? platform;
      const toastId = `idle-${platform}`;
      let timer: ReturnType<typeof setTimeout> | null = null;

      function scheduleIdleToast() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          toast.warning(
            `${label}: terminal is idle`,
            {
              id: toastId,
              description: 'To save server resources, close terminals you are not using.',
              duration: TOAST_VISIBLE_MS,
              onDismiss: () => { scheduleIdleToast(); },
            }
          );
          timer = null;
        }, IDLE_MS);
      }

      function resetIdle() {
        toast.dismiss(toastId);
        scheduleIdleToast();
      }

      termRef.current = null;
      const term = new Terminal({
        theme: {
          background: '#09090b',
          foreground: '#e4e4e7',
          cursor: '#a1a1aa',
          selectionBackground: '#3f3f46',
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

      ws.onopen = () => {
        requestAnimationFrame(() => {
          fitAddon.fit();
          ws.send(JSON.stringify({ type: 'init', platform }));
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
          scheduleIdleToast();
        });
      };

      const decoder = new TextDecoder('utf-8', { fatal: false });

      ws.onmessage = (e) => {
        resetIdle();
        if (typeof e.data === 'string') {
          term.write(e.data);
          onDataRef.current?.(e.data);
        } else {
          e.data.arrayBuffer().then((buf: ArrayBuffer) => {
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
        term.write('\r\n\x1b[90m[disconnected]\x1b[0m\r\n');
      };

      ws.onerror = () => {
        term.write('\r\n\x1b[31m[connection error — is bridge running on :3201?]\x1b[0m\r\n');
      };

      term.onData((data) => {
        resetIdle();
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'stdin', data }));
        }
      });

      const ro = new ResizeObserver(() => {
        fitAddon.fit();
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      });
      ro.observe(containerRef.current);

      return () => {
        if (timer) clearTimeout(timer);
        toast.dismiss(toastId);
        ro.disconnect();
        wsRef.current = null;
        try { ws.close(); } catch {}
        term.dispose();
      };
    }, [wsUrl]);

    return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
  }
);
