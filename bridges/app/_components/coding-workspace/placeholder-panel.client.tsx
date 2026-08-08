"use client";

import { X } from "lucide-react";

// A page that exists, opens and is empty — for menu entries whose settings are built later.
//
// One component rather than three near-identical files: a placeholder differs only by its title, and
// three copies would be three places to remember when the real page replaces one of them.
//
// It says plainly that the settings are not here yet. A page that opened blank with no explanation
// would read as a fault of the panel; a page that says what will live here reads as a plan.
export function PlaceholderPanel({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="bg-background flex flex-col h-full w-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-6">
        <p className="text-[11px] text-muted-foreground text-center max-w-sm leading-relaxed">
          These settings are being built. The page is here so its place in the menu is settled;
          its contents arrive in one of the next steps.
        </p>
      </div>
    </div>
  );
}
