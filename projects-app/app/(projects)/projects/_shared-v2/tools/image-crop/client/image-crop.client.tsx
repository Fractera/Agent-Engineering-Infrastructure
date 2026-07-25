"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CropMode, ImageCropperProps } from "../types/image-crop";
import { cropStrings } from "./image-crop-i18n";

// ОБРЕЗКА ИЗОБРАЖЕНИЯ — Кокпит-инструмент мягкого дев/админ-слоя `_shared-v2` (шаг 298). Перенос примитива
// из Admin (`bridges/app/_components/coding-workspace/site-settings/image-cropper.client.tsx`), где он
// кадрировал логотипы/OG сайта. Здесь он становится ОДНИМ переиспользуемым инструментом всей группы v2:
// когда владелец вручную добавляет в склад запись-изображение, поле зовёт именно этот инструмент, а не свою
// вторую реализацию (как голосовой ввод — один примитив на всё).
//
// Живёт в `_shared-v2`, поэтому имеет право на платформенный стек: shadcn `Dialog`/`Button` (закон 0
// распространяется на ПАПКУ автоматизации, а не на этот общий слой). Строки — через словарь (правило 4г,
// десять языков). Сервер не нужен: canvas режет кадр в браузере и отдаёт JPEG-blob через `onDone`; куда его
// положить (объектное хранилище склада и т.п.) — решает вызывающий код.

const RATIOS: Record<CropMode, { w: number; h: number }> = {
  horizontal: { w: 16, h: 9 },
  square: { w: 1, h: 1 },
  vertical: { w: 9, h: 16 },
};

export function ImageCropper({ open, src, onDone, onCancel, force, lang }: ImageCropperProps) {
  const t = cropStrings(lang);
  const MAX = 280;
  const initial: CropMode = force === "square" ? "square" : "horizontal";
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
    if (!open) return;
    const img = new globalThis.Image();
    img.onload = () => {
      imgRef.current = img;
      setScale(Math.min(W / img.naturalWidth, H / img.naturalHeight));
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src, cropMode, W, H, open]);

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
    const rx = outW / W,
      ry = outH / H;
    ctx.drawImage(
      img,
      offset.x * rx + (outW - img.naturalWidth * scale * rx) / 2,
      offset.y * ry + (outH - img.naturalHeight * scale * ry) / 2,
      img.naturalWidth * scale * rx,
      img.naturalHeight * scale * ry,
    );
    out.toBlob((blob) => {
      if (blob) onDone(blob, cropMode);
    }, "image/jpeg", 0.92);
  };

  const modes: CropMode[] =
    force === "square" ? ["square"] : force === "horizontal" ? ["horizontal"] : ["horizontal", "square", "vertical"];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      {/* z-[60] — crop ВСЕГДА поверх: его открывают из модалки добавления записи (та на z-50), и обрезка
          должна лежать сверху неё (требование владельца). */}
      <DialogContent className="z-[60] gap-3" style={{ width: Math.max(W + 96, 340), maxWidth: "90vw" }}>
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <DialogTitle className="text-sm">{t.title}</DialogTitle>
          {modes.length > 1 && (
            <div className="flex gap-1">
              {modes.map((m) => (
                <Button
                  key={m}
                  variant={cropMode === m ? "default" : "outline"}
                  size="xs"
                  onClick={() => setCropMode(m)}
                >
                  {m === "horizontal" ? "16:9" : m === "square" ? "1:1" : "9:16"}
                </Button>
              ))}
            </div>
          )}
        </DialogHeader>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="self-center cursor-grab rounded-lg border border-border bg-muted/30 select-none active:cursor-grabbing"
          style={{ width: W, height: H }}
          onMouseDown={onMouseDown}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">{t.scale}</span>
          <input
            type="range"
            min={0.05}
            max={4}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button size="sm" onClick={handleDone}>
            {t.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
