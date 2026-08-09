"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Reusable image cropper for Site Settings — ported from the Media Library panel's inline
// cropper. `force` locks the aspect (square for logos/icons, horizontal for OG/illustrations);
// when omitted the user picks 16:9 / 1:1 / 9:16. Emits a JPEG blob via onDone.

export type CropMode = "horizontal" | "square" | "vertical";

const RATIOS: Record<CropMode, { w: number; h: number }> = {
  horizontal: { w: 16, h: 9 },
  square: { w: 1, h: 1 },
  vertical: { w: 9, h: 16 },
};

export function ImageCropper({
  src,
  onDone,
  onCancel,
  force,
}: {
  src: string;
  onDone: (blob: Blob, cropMode: string) => void;
  onCancel: () => void;
  force?: "square" | "horizontal";
}) {
  const MAX = 280;
  const initial: CropMode = force === "square" ? "square" : force === "horizontal" ? "horizontal" : "horizontal";
  const [cropMode, setCropMode] = useState<CropMode>(initial);
  const ratio = RATIOS[cropMode];
  const r = ratio.w / ratio.h;
  const W = r >= 1 ? MAX : Math.round(MAX * r);
  const H = r >= 1 ? Math.round(MAX / r) : MAX;
  const outW = Math.min(ratio.w * 512, 1200);
  const outH = Math.round((outW * ratio.h) / ratio.w);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new globalThis.Image();
    img.onload = () => {
      imgRef.current = img;
      setScale(Math.min(W / img.naturalWidth, H / img.naturalHeight));
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src, cropMode, W, H]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, offset.x + (W - w) / 2, offset.y + (H - h) / 2, w, h);
  }, [scale, offset, W, H]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setOffset({ x: dragRef.current.ox + ev.clientX - dragRef.current.startX, y: dragRef.current.oy + ev.clientY - dragRef.current.startY });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleDone = () => {
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d");
    const img = imgRef.current;
    if (!ctx || !img) return;
    const rx = outW / W, ry = outH / H;
    ctx.drawImage(
      img,
      offset.x * rx + (outW - img.naturalWidth * scale * rx) / 2,
      offset.y * ry + (outH - img.naturalHeight * scale * ry) / 2,
      img.naturalWidth * scale * rx,
      img.naturalHeight * scale * ry
    );
    out.toBlob((blob) => { if (blob) onDone(blob, cropMode); }, "image/jpeg", 0.92);
  };

  const modes: CropMode[] = force === "square" ? ["square"] : force === "horizontal" ? ["horizontal"] : ["horizontal", "square", "vertical"];

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
      <div className="bg-background rounded-xl p-4 flex flex-col gap-3 shadow-xl" style={{ width: Math.max(W + 48, 320) }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Crop image</span>
          {modes.length > 1 && (
            <div className="flex gap-1">
              {modes.map((m) => (
                <Button key={m} variant={cropMode === m ? "default" : "outline"} size="xs" onClick={() => setCropMode(m)}>
                  {m === "horizontal" ? "16:9" : m === "square" ? "1:1" : "9:16"}
                </Button>
              ))}
            </div>
          )}
        </div>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-lg border border-border cursor-grab active:cursor-grabbing bg-muted/30 self-center select-none"
          style={{ width: W, height: H }}
          onMouseDown={onMouseDown}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">Scale</span>
          <input type="range" min={0.05} max={4} step={0.01} value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full accent-primary" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleDone}>Apply</Button>
        </div>
      </div>
    </div>
  );
}
