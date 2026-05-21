"use client";

import { Bot, MessageSquare, Send, X } from "lucide-react";

type Props = {
  open: boolean;
  onContinue: () => void;
  onClose: () => void;
};

// Welcome / first-visit gating dialog shown right before the Hermes /env
// onboarding window opens. Explains the two surfaces (Основной чат vs.
// Основной агент) and asks the user to connect at least one subscription
// — Codex by default — to make the system useful.
//
// Detection of "subscription already connected" is intentionally not
// done here: we use a localStorage flag set on first dismiss. This keeps
// the modal independent of Hermes WebUI internal endpoints, which have
// shifted across versions (/api/providers vs /api/models, has_key=null
// after v… etc). Trade-off: a fresh browser will see the modal again
// even after subscriptions are connected. Acceptable for onboarding.
export function WelcomeSetupModal({ open, onContinue, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-foreground">Добро пожаловать в Fractera</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 text-sm text-foreground">
          <p className="leading-relaxed">
            Чтобы начать работу с агентом, нужно подключить{" "}
            <strong>хотя бы одну подписку на AI-модель</strong>. Рекомендуем{" "}
            <strong>Codex (ChatGPT Plus)</strong> — он покрывает большинство
            задач и обычно у партнёров уже оплачен.
          </p>

          {/* Recommended primary action */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.04] px-3 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-widest">Рекомендуем для старта</p>
            <p className="text-xs text-foreground/85 leading-relaxed">
              Подключите Codex через ChatGPT-аккаунт — занимает минуту. Сразу
              после этого агент готов к работе.
            </p>
          </div>

          {/* Optional extras */}
          <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-3 flex flex-col gap-2">
            <p className="text-xs font-mono font-bold text-foreground/60 uppercase tracking-widest">Дополнительно (необязательно)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Send size={11} className="inline -mt-0.5 mr-1 text-violet-400" />
              <strong className="text-foreground/80">Telegram-бот</strong> для
              управления агентом со смартфона, дополнительные подписки (Claude,
              Gemini) и другие настройки.
            </p>
            <p className="text-xs text-muted-foreground/80 leading-relaxed italic">
              К этим настройкам всегда можно вернуться позже через
              «Основной агент → /env».
            </p>
          </div>

          {/* Two surfaces explanation */}
          <div className="flex flex-col gap-2 pt-1">
            <p className="text-xs font-mono font-bold text-foreground/60 uppercase tracking-widest">Где работать дальше</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={11} className="text-yellow-400" />
                  <span className="text-xs font-semibold text-foreground">Основной чат</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Удобный интерфейс для повседневных задач — диалоги, документы,
                  быстрые вопросы.
                </p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Bot size={11} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-foreground">Основной агент</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Тонкие настройки, подключения провайдеров, автоматизация и
                  интеграции.
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
              Открыть настройки агента
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-foreground/60 hover:text-foreground border border-border px-4 py-2 rounded-md transition-colors"
            >
              Позже
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
