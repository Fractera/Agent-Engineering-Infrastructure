"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ParallelRoutesSelector } from "./parallel-routes/parallel-routes-selector.client";

// Fractera Pro — platform structural settings (presentational in the open core).
// The top bar carries three tabs:
//   • Параллельная маршрутизация · сетап → opens the animated slot-layout layer directly
//     (no activation toggle — the redundant "Settings" dropdown was removed).
//   • Тонкая настройка (placeholder, no action yet).
//   • Найти в проекте (placeholder, no action yet).
// Persisting any arrangement is a Fractera Pro capability — the slot layer's
// "Save changes" raises a red toast pointing the user to the Fractera Pro starter.

type View = null | "slots";
type Props = { onClose: () => void };

export function PlatformSettingsPanel({ onClose }: Props) {
  const [view, setView] = useState<View>(null);

  return (
    <div style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }} className="bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">Fractera Pro</span>
        <span className="text-muted-foreground text-[11px]">·</span>

        <button
          type="button"
          onClick={() => setView("slots")}
          className="text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
        >
          Parallel routing · setup
        </button>
        <button
          type="button"
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Fine tuning
        </button>
        <button
          type="button"
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Find in project
        </button>

        <span className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {view === "slots" && <ParallelRoutesSelector onBack={() => setView(null)} />}

      <div className="flex-1 overflow-auto px-4 py-3">
        <p className="text-[11px] text-muted-foreground max-w-md">
          Open <span className="font-semibold text-foreground">Parallel routing · setup</span> above to
          arrange the layout slots. Saving changes is a Fractera Pro starter capability.
        </p>
      </div>
    </div>
  );
}
