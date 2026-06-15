"use client";

import { Loader2 } from "lucide-react";

// Generic single-flag sub-view for a footer feature toggle (Footer pages / Screen width / Theme).
// The reference app gated these footer features through the plugin marketplace; we have no
// marketplace, so each is a boolean in platform-config.json -> footerPlugins, surfaced here. The
// owning panel persists the whole config; the toggle applies instantly (a runtime flag — the app
// reflects it on the next load, no rebuild), so there is no separate Save button.

type Props = {
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  saving: boolean;
  onBack: () => void;
};

export function FooterFeatureView({ title, description, active, onToggle, saving, onBack }: Props) {
  return (
    <div className="absolute inset-0 bg-background flex flex-col z-30">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <button type="button" onClick={onBack} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {saving && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="max-w-md">
          <button
            type="button"
            onClick={onToggle}
            disabled={saving}
            className="flex items-start gap-3 text-left rounded-md border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors w-full disabled:opacity-60"
          >
            <span
              aria-hidden
              className={`mt-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${active ? "bg-foreground" : "bg-muted-foreground/40"}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-background transition-transform ${active ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-foreground">{active ? "Enabled" : "Disabled"}</span>
              <span className="text-[9px] text-muted-foreground leading-relaxed">{description}</span>
            </span>
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">Applies at runtime — reload the app to see the change. Default: enabled.</p>
        </div>
      </div>
    </div>
  );
}
