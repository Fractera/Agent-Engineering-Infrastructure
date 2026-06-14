"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// Modal preview for an uploaded image referenced by the config. Shows the full image and its
// characteristics — resolution (from the loaded image), extension + file size (from the image
// blob). All client-side; no metadata endpoint needed.
export function HomeImageModal({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [meta, setMeta] = useState<{ ext: string; size: number } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => r.blob())
      .then((b) => {
        if (!alive) return;
        const ext = (b.type.split("/")[1] || "").replace("+xml", "").replace("jpeg", "jpg");
        setMeta({ ext, size: b.size });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl border border-border shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-xs font-semibold text-foreground truncate">{label}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={13} />
          </button>
        </div>
        <div className="flex items-center justify-center bg-muted/30 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="max-h-[60vh] max-w-full rounded-lg object-contain"
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 border-t border-border text-[11px] font-mono text-muted-foreground">
          {dims && <span>{dims.w} × {dims.h} px</span>}
          {meta?.ext && <span>.{meta.ext}</span>}
          {meta && <span>{(meta.size / 1024).toFixed(1)} KB</span>}
          {!dims && !meta && <span>Loading…</span>}
        </div>
      </div>
    </div>
  );
}
