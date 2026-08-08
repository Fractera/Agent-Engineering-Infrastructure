"use client";

// Обрезка изображения перед сохранением (шаг 501, Ф2, партия 4).
//
// КОПИЯ обрезчика из старой панели (`media-library-panel.client.tsx`, там он был
// вложенной функцией). Скопирован, а не подключён ссылкой: старая оболочка —
// точка возврата на время шага и целиком исчезает на переключении, а страница
// обязана пережить её удаление.
//
// Изменено против источника ровно два места: наложение `fixed` вместо
// `absolute` (оверлей теперь над всей страницей, а не внутри панели) и подписи
// приезжают пропсами из словаря вместо английских строк в разметке.
//
// Работа целиком в браузере и иначе быть не может: холст, перетаскивание,
// масштаб. Сервер узнаёт только результат — готовый JPEG.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type CropMode = "horizontal" | "square" | "vertical";

const CROP_RATIOS: Record<CropMode, { w: number; h: number }> = {
  horizontal: { w: 16, h: 9 },
  square: { w: 1, h: 1 },
  vertical: { w: 9, h: 16 },
};

export type CropperLabels = { title: string; scale: string; cancel: string; apply: string };

export function ImageCropper(
  { src, labels, onDone, onCancel }: {
    src: string;
    labels: CropperLabels;
    onDone: (blob: Blob, cropMode: string) => void;
    onCancel: () => void;
  },
) {
  const MAX = 280;
  const [cropMode, setCropMode] = useState<CropMode>("horizontal");
  const ratio = CROP_RATIOS[cropMode];
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
      const fit = Math.min(W / img.naturalWidth, H / img.naturalHeight);
      setScale(fit);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
    // W/H меняются вместе с cropMode — пересчёт вписывания обязателен.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, cropMode]);

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
      setOffset({
        x: dragRef.current.ox + ev.clientX - dragRef.current.startX,
        y: dragRef.current.oy + ev.clientY - dragRef.current.startY,
      });
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
    const rx = outW / W;
    const ry = outH / H;
    ctx.drawImage(
      img,
      offset.x * rx + (outW - img.naturalWidth * scale * rx) / 2,
      offset.y * ry + (outH - img.naturalHeight * scale * ry) / 2,
      img.naturalWidth * scale * rx,
      img.naturalHeight * scale * ry,
    );
    out.toBlob((blob) => { if (blob) onDone(blob, cropMode); }, "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4">
      <div className="flex flex-col gap-3 rounded-xl bg-background p-4 shadow-xl" style={{ width: Math.max(W + 48, 320) }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">{labels.title}</span>
          <div className="flex gap-1">
            {(["horizontal", "square", "vertical"] as CropMode[]).map((m) => (
              <Button key={m} variant={cropMode === m ? "default" : "outline"} size="xs" onClick={() => setCropMode(m)}>
                {m === "horizontal" ? "16:9" : m === "square" ? "1:1" : "9:16"}
              </Button>
            ))}
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="cursor-grab self-center rounded-lg border border-border bg-muted/30 select-none active:cursor-grabbing"
          style={{ width: W, height: H }}
          onMouseDown={onMouseDown}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">{labels.scale}</span>
          <input
            type="range" min={0.05} max={4} step={0.01} value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-primary"
            aria-label={labels.scale}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>{labels.cancel}</Button>
          <Button size="sm" onClick={handleDone}>{labels.apply}</Button>
        </div>
      </div>
    </div>
  );
}
