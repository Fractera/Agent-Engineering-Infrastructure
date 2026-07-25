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
import { ingestImage } from "../../storage/client/ingest";
import type { DatabaseAddRowProps } from "../types/database";
import { addRowStrings } from "./add-row-i18n";

// КОКПИТ-ИНСТРУМЕНТ «ДОБАВИТЬ СТРОКУ» локальной базы. Живёт в мягком дев-слое `_shared-v2`, монтируется в
// папку через dev-slot; crop берёт из соседнего `_shared-v2/tools/image-crop`.
//
// ФОРМА ОТКРЫТИЯ (требование владельца): БЕЗГОЛОВЫЙ инструмент — рисуется, только когда придёт DOM-событие
// `fractera:database-add` от кнопки «Добавить запись» в ряду поиска таблицы. Открывается МОДАЛКА; обрезка
// (crop) открывается ПОВЕРХ неё (crop z-[60], модалка z-50).
//
// СВЯЗИ ВСЕХ-КО-ВСЕМ: строка несёт `storageIds` (ссылки на записи объектного хранилища) и `vectorIds`
// (ссылки на записи векторной базы). У строки может быть НЕСКОЛЬКО изображений — их набирают в модалке.
//   • Изображения кладём в очередь (blob+preview) и загружаем ТОЛЬКО при «Создать» (отложенный ingest):
//     отмена модалки не оставляет сирот в складе. Каждый ingest создаёт ЗАПИСЬ СКЛАДА и возвращает её id —
//     он и ложится в `storageIds` (не ключ файла), поэтому картинка видна в объектном хранилище.
//   • `vectorIds` владелец вводит вручную (через запятую).
const RUN_COMPLETED = "fractera:automation-run-completed";
const OPEN_EVENT = "fractera:database-add";
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const parseIds = (s: string): string[] => s.split(",").map((x) => x.trim()).filter(Boolean);

type Pending = { blob: Blob; url: string };

export function DatabaseAddRow({ table = "database", lang }: DatabaseAddRowProps) {
  const t = addRowStrings(lang);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState<Pending[]>([]); // очередь изображений (ingest отложен до «Создать»)
  const [vectorText, setVectorText] = useState("");
  const [src, setSrc] = useState<string | null>(null); // картинка на обрезке
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openModal = () => { reset(); setOpen(true); };
    window.addEventListener(OPEN_EVENT, openModal);
    return () => window.removeEventListener(OPEN_EVENT, openModal);
  }, []);

  const reset = () => {
    setName("");
    setVectorText("");
    setSrc(null);
    setError(null);
    setPending((p) => { p.forEach((x) => URL.revokeObjectURL(x.url)); return []; });
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  // crop готов → кладём кадр в очередь (ещё НЕ грузим — отложенный ingest до «Создать»).
  const onCropDone = (blob: Blob, _mode: CropMode) => {
    setSrc(null);
    setPending((p) => [...p, { blob, url: URL.createObjectURL(blob) }]);
  };

  const createRow = async () => {
    setBusy(true);
    setError(null);
    try {
      // Каждое изображение → запись склада → её id в storageIds.
      const storageIds: string[] = [];
      for (const p of pending) {
        const { storageId } = await ingestImage(apiBase(), p.blob, name);
        storageIds.push(storageId);
      }
      const row = await fetch(`${apiBase()}/rows`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, values: { name: name.trim() || "Row", storageIds, vectorIds: parseIds(vectorText) } }),
      });
      const rj = (await row.json()) as { ok?: boolean; error?: string };
      if (!row.ok) throw new Error(rj.error || "row failed");
      window.dispatchEvent(new CustomEvent(RUN_COMPLETED)); // the database table refetches on this signal
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
          if (!next && src) return; // обрезка открыта поверх — не закрываем модалку по клику по её оверлею
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="gap-3 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.title}</DialogTitle>
          </DialogHeader>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          <div className="flex flex-col gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} className="h-8" />

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {t.addImage}
              </Button>
              {pending.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  {pending.slice(0, 5).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p.url} src={p.url} alt="" className="h-8 w-8 rounded border object-cover" />
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {t.attached}: {pending.length}
                  </span>
                </span>
              ) : null}
            </div>

            <Input
              value={vectorText}
              onChange={(e) => setVectorText(e.target.value)}
              placeholder={`${t.vectorIds} — ${t.vectorHint}`}
              className="h-8"
            />
          </div>
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); reset(); }}>
              {t.cancel}
            </Button>
            <Button size="sm" disabled={busy} onClick={createRow}>
              {busy ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {src ? <ImageCropper open src={src} lang={lang} onDone={onCropDone} onCancel={() => setSrc(null)} /> : null}
    </>
  );
}
