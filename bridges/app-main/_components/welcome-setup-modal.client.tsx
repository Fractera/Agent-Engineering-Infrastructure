"use client";

import { Bot, MessageSquare, Send, X } from "lucide-react";

type Props = {
  open: boolean;
  onContinue: () => void;
  onClose: () => void;
};

// Welcome / first-visit gating dialog shown right before the Hermes /env
// onboarding window opens. Explains the two surfaces (Main Chat vs.
// Main Agent) and asks the user to connect at least one subscription
// — Codex by default — to make the system useful.
//
// All copy is in English: the admin panel is not i18n-localized, so
// even Russian-speaking partners see this in English to stay consistent
// with every other button/label in the panel.
//
// Detection of "subscription already connected" is intentionally not
// done here: we use a localStorage flag set on first dismiss. This keeps
// the modal independent of Hermes WebUI internal endpoints, which have
// shifted across versions.
export function WelcomeSetupModal({ open, onContinue, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-border bg-background shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-foreground">Welcome to Fractera</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 text-sm text-foreground">
          <p className="leading-relaxed">
            To start using the agent, connect{" "}
            <strong>at least one AI model subscription</strong>. We recommend{" "}
            <strong>Codex (ChatGPT Plus)</strong> — it covers most tasks and is
            usually already paid for by partners.
          </p>

          {/* Recommended primary action */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.04] px-3 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-widest">Recommended for start</p>
            <p className="text-xs text-foreground/85 leading-relaxed">
              Connect Codex via your ChatGPT account — takes a minute. The
              agent is ready to work as soon as you're done.
            </p>
          </div>

          {/* Optional extras */}
          <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-3 flex flex-col gap-2">
            <p className="text-xs font-mono font-bold text-foreground/60 uppercase tracking-widest">Optional</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Send size={11} className="inline -mt-0.5 mr-1 text-violet-400" />
              <strong className="text-foreground/80">Telegram bot</strong> for
              controlling the agent from your phone, additional subscriptions
              (Claude, Gemini) and other settings.
            </p>
            <p className="text-xs text-muted-foreground/80 leading-relaxed italic">
              You can always come back to these settings later via
              «Main Agent → /env».
            </p>
          </div>

          {/* Two surfaces explanation */}
          <div className="flex flex-col gap-2 pt-1">
            <p className="text-xs font-mono font-bold text-foreground/60 uppercase tracking-widest">Where to work next</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={11} className="text-yellow-400" />
                  <span className="text-xs font-semibold text-foreground">Main Chat</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Comfortable interface for everyday tasks — conversations,
                  documents, quick questions.
                </p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Bot size={11} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-foreground">Main Agent</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Fine-grained settings, provider connections, automation and
                  integrations.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onContinue}
              className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md transition-colors"
            >
              Open agent settings
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-foreground/60 hover:text-foreground border border-border px-4 py-2 rounded-md transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
