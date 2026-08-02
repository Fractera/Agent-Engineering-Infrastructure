"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mediaKindOf, previewLabelOf, type MediaKind } from "../types/media-viewer";

// ИНСТРУМЕНТ ПРОСМОТРА ОБЪЕКТА — рантайм-примитив автоматизации (шаг 323, решение владельца).
//
// ПОЧЕМУ В РАНТАЙМ-ПАПКЕ, А НЕ В ДЕВ-СЛОЕ. Просмотр нужен и на ВИТРИНЕ — публичной половине таблицы, а ей
// закон 0 запрещает тянуть `_shared-v2`. Инструмент в дев-слое означал бы, что конечный пользователь видит
// объект и не может его открыть. Раскладка та же, что у `voice-input`: одна папка `{client,types}`.
//
// ЧТО ЭТО ЗАКРЫВАЕТ. Колонка превью рисовала `<img>` для ЛЮБОГО ключа — у видео, PDF и текста получались
// битые квадраты, а открыть объект было нельзя вовсе.
//
// РАЗМЕР ОКНА — ПО ПРИРОДЕ СОДЕРЖИМОГО (требование владельца): видео в НЕБОЛЬШОМ контейнере, помещающемся
// на телефоне; PDF — в крупном; изображение — по месту; аудио — компактно.

const SRC = (fileKey: string) => `${location.pathname.replace(/\/+$/, "")}/api/files?key=${encodeURIComponent(fileKey)}`;

/** Ширина модалки по классу объекта. Числа — не украшение: видео должно помещаться на телефоне. */
const WIDTH: Record<MediaKind, string> = {
  video: "max-w-[min(92vw,420px)]",
  pdf: "max-w-[min(96vw,900px)]",
  image: "max-w-[min(92vw,760px)]",
  audio: "max-w-[min(92vw,420px)]",
  text: "max-w-[min(94vw,700px)]",
  other: "max-w-[min(92vw,420px)]",
};

/** Текстовый объект читается в окне: качаем его сами, показываем как текст в прокрутке. */
function TextBody({ fileKey }: { fileKey: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(SRC(fileKey), { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => { if (alive) setText(t ?? ""); })
      .catch(() => { if (alive) setText(""); });
    return () => { alive = false; };
  }, [fileKey]);
  if (text === null) return <p className="text-sm text-muted-foreground">…</p>;
  return <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words text-sm">{text}</pre>;
}

export function MediaViewer({
  fileKey, name, open, onOpenChange,
}: { fileKey: string; name?: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const kind = mediaKindOf(fileKey);
  const src = fileKey ? SRC(fileKey) : "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={WIDTH[kind]}>
        <DialogHeader>
          <DialogTitle className="truncate text-sm">{name || previewLabelOf(fileKey)}</DialogTitle>
        </DialogHeader>
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name ?? ""} className="max-h-[75vh] w-full rounded object-contain" />
        ) : kind === "video" ? (
          <video src={src} controls playsInline className="w-full rounded" />
        ) : kind === "audio" ? (
          <audio src={src} controls className="w-full" />
        ) : kind === "pdf" ? (
          <iframe src={src} title={name ?? "PDF"} className="h-[85vh] w-full rounded border" />
        ) : kind === "text" ? (
          <TextBody fileKey={fileKey} />
        ) : (
          // Неизвестный тип — честная ссылка на скачивание вместо попытки изобразить просмотр.
          <a href={src} target="_blank" rel="noreferrer" className="text-sm underline">{previewLabelOf(fileKey)}</a>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * ЯЧЕЙКА ПРЕВЬЮ. Изображение — миниатюра; ВСЁ ОСТАЛЬНОЕ — контейнер ТОГО ЖЕ размера с подписью типа
 * в ОДНУ строку (без переноса, с обрезкой). Клик открывает просмотрщик; ключа нет — прочерк, не кнопка.
 */
export function MediaPreview({ fileKey, name }: { fileKey: unknown; name?: string }) {
  const key = String(fileKey ?? "").trim();
  const [open, setOpen] = useState(false);
  if (!key) return <span className="text-muted-foreground">—</span>;
  const kind = mediaKindOf(key);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={name || key}
        className="block size-12 overflow-hidden rounded border transition-opacity hover:opacity-80"
      >
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={SRC(key)} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center bg-muted px-1 text-[10px] font-medium tracking-wide text-muted-foreground">
            <span className="w-full truncate text-center">{previewLabelOf(key)}</span>
          </span>
        )}
      </button>
      <MediaViewer fileKey={key} name={name} open={open} onOpenChange={setOpen} />
    </>
  );
}
