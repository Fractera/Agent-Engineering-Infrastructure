"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Send, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

type Props = {
  onClose: () => void;
};

type HermesStatus = {
  telegramConfigured: boolean;
  telegramMasked: string | null;
  // Owner-pairing: one-tap "Message your bot" deep link + ownership state.
  botUsername: string | null;
  ownerClaimed: boolean;
  telegramDeepLink: string | null;
};

// Telegram settings — wires up an OPTIONAL Telegram bot so the user can talk to
// their Brain (Hermes agent) from their phone, in addition to the built-in chat.
// This panel is Telegram-only by design: provider keys / OAuth for the agent live
// in the native Hermes dashboard ("Hermes Agent" in the Settings menu), not here.
export function HermesPanel({ onClose }: Props) {
  const [status, setStatus]   = useState<HermesStatus | null>(null);
  const [tgToken, setTgToken] = useState("");
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/config/hermes")
      .then((r) => r.json())
      .then((data: HermesStatus) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const sentTg = tgToken.trim();
    if (!sentTg) {
      toast.error("Paste a bot token first");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/config/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramBotToken: sentTg }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      setSavedAt(Date.now());
      setTgToken("");
      try {
        const fresh = await fetch("/api/config/hermes").then((r) => r.json());
        setStatus(fresh);
      } catch { /* admin reloading */ }
      toast.success("Saved — your Telegram bot is connecting");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col w-full h-full bg-background border-l border-border shadow-xl">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <Send size={13} />
          Telegram settings
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading || !status ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : (
          <>
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
              <p>
                Telegram is an <strong>optional</strong> way to talk to your Brain from your phone —
                in addition to the built-in chat (the Brain card). Wire up a bot below, then message
                it from anywhere. Skip this entirely if you only use the web chat.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground">Telegram bot token</p>
                {status.telegramConfigured ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <CheckCircle size={10} />
                    <span className="font-mono">{status.telegramMasked}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">not set</span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                In Telegram: message <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">@BotFather</a>,
                send <code className="px-1 py-0.5 rounded bg-muted">/newbot</code>, choose a name —
                BotFather replies with a token like <code className="px-1 py-0.5 rounded bg-muted">1234567:ABC…</code>.
              </p>
              <input
                type="password"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder={status.telegramConfigured ? "Paste new token to replace" : "1234567:ABC…"}
                className="w-full h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />

              {/* One-tap "Message your bot": opens the chat with your bot in
                  Telegram. Before ownership is claimed the link carries a
                  one-time secret — tapping Start auto-approves you as the owner,
                  so you never see a pairing code. After that it's just a handy
                  shortcut back to your bot. */}
              {status.telegramConfigured && status.telegramDeepLink && (
                <a
                  href={status.telegramDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-[#229ED9] text-white text-[11px] font-medium hover:opacity-90 transition-opacity"
                >
                  <Send size={12} />
                  {status.botUsername ? `Message @${status.botUsername}` : "Message your bot"}
                </a>
              )}
              {status.telegramConfigured && (
                status.ownerClaimed ? (
                  <p className="flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400">
                    <CheckCircle size={11} className="shrink-0" />
                    You are connected as the bot owner.
                  </p>
                ) : (
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Tap the button above and press <strong>Start</strong> in Telegram — that one tap
                    registers you as the owner. No codes, no approvals. If the bot still asks for a
                    pairing code, reload this panel and use the button (the old chat may be cached).
                  </p>
                )
              )}

              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                <p className="flex items-start gap-1.5">
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  <span>
                    The bot can only reply once a model provider is connected for the agent. Set that
                    up in <strong>Hermes Agent</strong> (the Settings menu). Until then the bot will
                    recognize you but stay silent.
                  </span>
                </p>
              </div>
            </div>

            {savedAt && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 space-y-1.5">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={12} /> Saved
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Changes take effect within 10 seconds while the Telegram gateway restarts. If the
                  bot doesn&apos;t respond yet, give it a moment, then message it again.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-emerald-500/50 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <RefreshCw size={10} /> Reload page
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !tgToken.trim()}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {saving ? <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Saving…</span> : "Save"}
        </button>
      </div>
    </div>
  );
}
