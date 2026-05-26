"use client";

import { useState } from "react";
import { KeyRound, Copy, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthFlowDescriptor } from "./auth-flow-descriptors";

type Props = {
  descriptor: AuthFlowDescriptor;
  url: string;
  code?: string;
  onClose: () => void;
  onSendCode: (code: string) => void;
};

export function AuthFlowModal({ descriptor, url, code, onClose, onSendCode }: Props) {
  const [urlCopied, setUrlCopied]   = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [input, setInput]           = useState("");
  const [sent, setSent]             = useState(false);
  const [relaying, setRelaying]     = useState(false);
  const [relayError, setRelayError] = useState("");

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {}
  }

  async function handleCopyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {}
  }

  function handleSend() {
    const c = input.trim();
    if (!c) return;
    onSendCode(c);
    setSent(true);
    setTimeout(() => { onClose(); setInput(""); setSent(false); }, 1200);
  }

  async function handleRelay() {
    const callbackUrl = input.trim();
    if (!callbackUrl) return;
    setRelaying(true);
    setRelayError("");
    try {
      const res = await fetch("/api/bridges/codex-auth-relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackUrl }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => { onClose(); setInput(""); setSent(false); }, 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        setRelayError(data.error ?? `Server error ${res.status}`);
      }
    } catch (e) {
      setRelayError(String(e));
    }
    setRelaying(false);
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[560px]">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="flex items-center justify-center size-10 rounded-full bg-primary/10 shrink-0">
              <KeyRound size={18} className="text-primary" />
            </span>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-left">{descriptor.modalTitle}</DialogTitle>
              <DialogDescription className="text-[12px] text-left">
                {descriptor.modalDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* URL block */}
        <div
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 cursor-text select-text overflow-y-auto shrink-0 max-h-[90px] break-all"
        >
          <span
            className="text-[12px] font-mono text-foreground leading-relaxed"
            style={{ userSelect: "text", WebkitUserSelect: "text" }}
          >
            {url}
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleCopyUrl}
          >
            {urlCopied ? <><Check size={14} className="text-green-500" />Copied</> : <><Copy size={14} />Copy URL</>}
          </Button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 ${buttonVariants({ size: "lg" })}`}
          >
            <ExternalLink size={14} />Open
          </a>
        </DialogFooter>

        {/* ── terminal-paste flow (Claude Code, Gemini CLI) ── */}
        {descriptor.flow === "terminal-paste" && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border shrink-0">
            <span className="text-[12px] text-muted-foreground">
              After authorization, paste the code below:
            </span>
            <div className="flex gap-2">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                placeholder="Paste code here…"
                className="flex-1 font-mono"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sent}
              >
                {sent ? <><Check size={14} />Sent</> : "Send"}
              </Button>
            </div>
          </div>
        )}

        {/* ── url-relay flow (Codex browser OAuth) ── */}
        {descriptor.flow === "url-relay" && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border shrink-0">
            <div className="flex gap-3 rounded-lg border border-amber-700/40 bg-amber-950/80 px-3 py-3">
              <span className="text-amber-400 text-xl leading-none mt-0.5 shrink-0">⚠</span>
              <div className="flex flex-col gap-2">
                <span className="text-[13px] text-amber-400/90 leading-relaxed font-medium">
                  After signing in with OpenAI, your browser will open a page that looks like an error — <strong className="text-amber-300">this is normal</strong>.
                  Click the address bar, select the full URL, copy it, and paste it into the field below.
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-amber-400/70">
                    Windows:{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-400/25 font-mono text-[11px] text-black font-bold">Ctrl+A</kbd>
                    {" "}select all ·{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-400/25 font-mono text-[11px] text-black font-bold">Ctrl+C</kbd>
                    {" "}copy ·{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-400/25 font-mono text-[11px] text-black font-bold">Ctrl+V</kbd>
                    {" "}paste
                  </span>
                  <span className="text-[11px] text-amber-400/70">
                    Mac:{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-400/25 font-mono text-[11px] text-black font-bold">⌘A</kbd>
                    {" "}select all ·{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-400/25 font-mono text-[11px] text-black font-bold">⌘C</kbd>
                    {" "}copy ·{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-400/25 font-mono text-[11px] text-black font-bold">⌘V</kbd>
                    {" "}paste
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[12px] text-muted-foreground">
              Paste the URL from the browser address bar:
            </span>
            <div className="flex gap-2">
              <Input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setRelayError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleRelay(); }}
                placeholder="http://localhost:1455/auth/callback?code=…"
                className="flex-1 font-mono"
              />
              <Button
                onClick={handleRelay}
                disabled={!input.trim() || sent || relaying}
              >
                {sent ? <><Check size={14} />Done</> : relaying ? "…" : "Relay"}
              </Button>
            </div>
            {relayError && (
              <span className="text-[11px] text-destructive leading-tight">{relayError}</span>
            )}
          </div>
        )}

        {/* ── device-code flow (Codex device auth) ── */}
        {descriptor.flow === "device-code" && (
          <div className="flex flex-col gap-3 pt-2 border-t border-border shrink-0">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Step 1</span> — Copy this code:
                </span>
                {code ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="flex-1 text-center text-2xl font-mono font-bold tracking-[0.25em] text-foreground bg-muted rounded-lg py-2.5 select-all"
                      style={{ userSelect: "text", WebkitUserSelect: "text" }}
                    >
                      {code}
                    </span>
                    <Button onClick={handleCopyCode} size="lg" className="shrink-0">
                      {codeCopied ? <><Check size={14} />Copied!</> : <><Copy size={14} />Copy</>}
                    </Button>
                  </div>
                ) : (
                  <span className="text-[12px] text-muted-foreground italic">Waiting for code…</span>
                )}
              </div>
              <span className="text-[13px] text-foreground leading-relaxed">
                <span className="font-semibold">Step 2</span> — Open the link above
              </span>
              <span className="text-[13px] text-foreground leading-relaxed">
                <span className="font-semibold">Step 3</span> — Paste the code into the input field on the OpenAI page and click <span className="font-semibold">Continue</span>
              </span>
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                Codex will sign in automatically — no need to paste anything back here.<br />
                Expires in 15 minutes · Never share this code with anyone.
              </span>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
