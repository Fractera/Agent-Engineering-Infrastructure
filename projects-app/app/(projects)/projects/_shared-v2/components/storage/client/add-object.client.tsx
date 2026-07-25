"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageCropper } from "../../../tools/image-crop/client/image-crop.client";
import type { CropMode } from "../../../tools/image-crop/types/image-crop";
import type { StorageAddObjectProps } from "../types/storage";
import { addObjectStrings } from "./add-object-i18n";
import { ingestImage } from "./ingest";

// КОКПИТ-ИНСТРУМЕНТ «ДОБАВИТЬ ОБЪЕКТ» — ручная запись изображения в склад. Живёт в мягком дев-слое
// `_shared-v2`, монтируется в папку через dev-slot; crop берёт из соседнего `_shared-v2/tools/image-crop`.
//
// ФОРМА ОТКРЫТИЯ (требование владельца): инструмент БЕЗГОЛОВЫЙ — сам ничего не рисует, пока не придёт
// DOM-событие `fractera:storage-add`. Событие шлёт кнопка «Добавить запись» из ряда поиска публичной таблицы
// (той внешний слой закрыт законом 0, поэтому она лишь диспатчит событие). По событию открывается МОДАЛКА;
// обрезка (crop) открывается ПОВЕРХ модалки (у crop z-[60], у модалки z-50).
//
// ЕДИНЫЙ ПУТЬ загрузки `ingestImage`: объект → ЗАПИСЬ СКЛАДА (`table=storage`). Тот же хелпер зовёт и
// локальная база, поэтому файл всегда виден в объектном хранилище, откуда бы его ни добавили.
const RUN_COMPLETED = "fractera:automation-run-completed";
const OPEN_EVENT = "fractera:storage-add";
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";

export function StorageAddObject({ lang }: StorageAddObjectProps) {
  const t = addObjectStrings(lang);
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null); // картинка на обрезке
  const [preview, setPreview] = useState<string | null>(null); // готовый кадр (object-URL)
  const [blob, setBlob] = useState<Blob | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Слушаем событие из ряда поиска таблицы — им открывается модалка.
  useEffect(() => {
    const openModal = () => { reset(); setOpen(true); };
    window.addEventListener(OPEN_EVENT, openModal);
    return () => window.removeEventListener(OPEN_EVENT, openModal);
  }, []);

  const reset = () => { setSrc(null); setPreview(null); setBlob(null); setName(""); setError(null); };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setName(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCropDone = (b: Blob, _mode: CropMode) => {
    setSrc(null);
    setBlob(b);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
  };

  const create = async () => {
    if (!blob) return;
    setBusy(true);
    setError(null);
    try {
      await ingestImage(apiBase(), blob, name);
      window.dispatchEvent(new CustomEvent(RUN_COMPLETED)); // the storage table refetches on this signal
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Пока открыта обрезка (поверх), клик по её оверлею считается «снаружи модалки» — не закрываем её.
          if (!next && src) return;
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="gap-3 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.title}</DialogTitle>
          </DialogHeader>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          <div className="flex flex-col items-start gap-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-32 w-32 rounded-lg border object-cover" />
            ) : null}
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {t.chooseImage}
            </Button>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} className="h-8" />
          </div>
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); reset(); }}>
              {t.cancel}
            </Button>
            <Button size="sm" disabled={busy || !blob} onClick={create}>
              {busy ? t.uploading : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {src ? <ImageCropper open src={src} lang={lang} onDone={onCropDone} onCancel={() => setSrc(null)} /> : null}
    </>
  );
}
