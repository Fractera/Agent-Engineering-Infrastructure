"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { X, MessagesSquare, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ChannelsHelp } from "./help-note.client";

type TelegramState = {
  configured: boolean;
  reachable: boolean;
  bot: string | null;
  chatId: string | null;
  who: string | null;
  enabled: boolean;
};

export function ChannelsPanel({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [tg, setTg] = useState<TelegramState | null>(null);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/channels", { cache: "no-store" });
      const d = await r.json();
      setAvailable(d.available === true);
      setTg(d.telegram ?? null);
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveToken() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(String(d.error ?? `Save failed (${r.status})`)); return; }
      setToken("");
      toast.success("Bot token saved");
      await load();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(on: boolean) {
    try {
      await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: on }),
      });
      await load();
    } catch { /* status reload will show the truth */ }
  }

  // Linking. The button opens Telegram with a one-time code in the deep link;
  // pressing START inside Telegram sends that code to the bot, and the same
  // message carries the sender's chat id. We poll until it arrives.
  async function startLink() {
    setLinking(true);
    setError(null);
    setDeepLink(null);
    try {
      const r = await fetch("/api/channels/telegram/link", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.deepLink) {
        setError(String(d.error ?? `Could not start linking (${r.status})`));
        setLinking(false);
        return;
      }
      setDeepLink(d.deepLink);
      window.open(d.deepLink, "_blank", "noopener");

      const deadline = Date.now() + 10 * 60_000;
      const tick = async () => {
        if (Date.now() > deadline) { setLinking(false); setError("Linking timed out — press Connect again."); return; }
        const p = await fetch(`/api/channels/telegram/link?code=${encodeURIComponent(d.code)}`, { cache: "no-store" });
        const s = await p.json().catch(() => ({}));
        if (s.status === "linked") {
          setLinking(false);
          setDeepLink(null);
          toast.success(`Linked to ${s.who ?? s.chatId}`);
          await load();
          return;
        }
        if (s.status === "expired") { setLinking(false); setError("The code expired — press Connect again."); return; }
        setTimeout(tick, 2000);
      };
      setTimeout(tick, 2000);
    } catch (e) {
      setLinking(false);
      setError(String((e as Error).message ?? e));
    }
  }

  return (
    <div className="flex flex-col w-full h-full bg-background border-t border-border">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <MessagesSquare size={13} />
          Communication channels
          <ChannelsHelp />
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 w-full">
        {loading && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        )}

        {!loading && !available && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertCircle size={13} className="text-destructive mt-0.5 shrink-0" />
            <div className="text-[11px] text-destructive leading-relaxed">
              The channels service is not running.<br />
              Run: <code className="font-mono bg-destructive/10 px-1 rounded">pm2 start fractera-channels</code>
            </div>
          </div>
        )}

        {!loading && available && (
          <div className="rounded-lg border border-border">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <span className="text-[11px] font-semibold text-foreground flex-1">Telegram</span>
              {tg?.chatId
                ? <span className="flex items-center gap-1 text-[10px] text-green-500"><CheckCircle size={10} />Linked {tg.who}</span>
                : <span className="text-[10px] text-muted-foreground">not linked</span>}
              <Switch
                checked={tg?.enabled !== false}
                disabled={!tg?.configured}
                onCheckedChange={toggleEnabled}
                aria-label="Telegram channel"
              />
            </div>

            <div className="p-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  Bot token from @BotFather
                  {tg?.configured && tg?.bot && <> — currently <span className="font-mono text-foreground">@{tg.bot}</span></>}
                  {tg?.configured && !tg?.reachable && <span className="text-destructive"> — Telegram does not recognise the saved token</span>}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={tg?.configured ? "Replace the saved token…" : "123456789:AA…"}
                    className="flex-1 px-2.5 py-1.5 text-[11px] border border-border rounded-md bg-background text-foreground
                               placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <button type="button" onClick={saveToken} disabled={saving || !token.trim()}
                    className="px-3 py-1.5 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40">
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={startLink} disabled={!tg?.configured || linking}
                  className="flex items-center gap-2 px-3 py-1.5 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40">
                  {linking ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                  {linking ? "Waiting for START…" : tg?.chatId ? "Link another account" : "Connect your account"}
                </button>
                {deepLink && (
                  <a href={deepLink} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-primary underline underline-offset-2">
                    open Telegram
                  </a>
                )}
              </div>

              {error && (
                <p className="text-[11px] text-destructive leading-relaxed break-words">{error}</p>
              )}

              <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-2">
                Once linked, the bot answers questions from the knowledge base built by Agentic RAG.
                It never invents an answer: with the base empty or the service off, it says so.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
