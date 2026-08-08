"use client";

// Загрузка объектов (шаг 501, Ф2, партия 4). Пять кнопок, по одной на вид, — как
// в старой панели, и по той же причине: у каждого вида свой путь. Изображение
// проходит через обрезку до сохранения; видео сначала сохраняется и потом
// предлагается монтажу (владелец монтирует то, что действительно лежит в
// хранилище); PDF, Markdown и HTML идут в хранилище сразу. Одна кнопка «Загрузить»
// не смогла бы сказать, который из пяти объектов сейчас получится.
//
// ТРИ ШИРИНЫ, по слою смысла за раз — но никогда не иконка:
//   телефон  (< 640)  только иконка   — пять существительных не поместятся
//   планшет  (640–1023) иконка + существительное
//   рабочий  (≥ 1024) иконка + глагол с существительным
// Отброшенные слова живут в `title`, поэтому кнопка-иконка всё равно называет
// себя при наведении и вслух для чтеца с экрана.
//
// Загрузка идёт ПРЯМО в слой данных с cookie посетителя — так было и осталось.
// После успеха вызывается `router.refresh()`: новый список приходит с сервера, а
// не доклеивается в память браузера.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ImagePlus, Clapperboard, FileText, FileType2, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageCropper, type CropperLabels } from "./image-cropper.client";
import { VideoTrimmer, type TrimmerLabels } from "./video-trimmer.client";
import type { MediaItem } from "../_lib/media";

export type UploadLabels = {
  verb: string;
  image: string; video: string; pdf: string; markdown: string; html: string;
  uploading: string; uploaded: string; failed: string;
  cropper: CropperLabels;
  trimmer: TrimmerLabels;
};

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

type Kind = "image" | "video" | "pdf" | "markdown" | "html";

export function UploadBar({ mediaBase, labels }: { mediaBase: string; labels: UploadLabels }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [trimItem, setTrimItem] = useState<MediaItem | null>(null);

  const inputs: Record<Kind, React.RefObject<HTMLInputElement | null>> = {
    image: useRef<HTMLInputElement>(null),
    video: useRef<HTMLInputElement>(null),
    pdf: useRef<HTMLInputElement>(null),
    markdown: useRef<HTMLInputElement>(null),
    html: useRef<HTMLInputElement>(null),
  };

  function pick(e: React.ChangeEvent<HTMLInputElement>, kind: Kind) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (kind === "image") {
      setPendingFile(file);
      setCropSrc(URL.createObjectURL(file));
      return;
    }
    void upload(file, null, undefined, kind === "video");
  }

  async function upload(file: File, croppedBlob: Blob | null, cropMode?: string, offerTrim = false) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", croppedBlob ? new File([croppedBlob], file.name, { type: "image/jpeg" }) : file);
      fd.append("name", file.name);
      if (cropMode) fd.append("crop_mode", cropMode);
      const res = await fetch(`${mediaBase}/media/upload`, { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? labels.failed);
      toast.success(fill(labels.uploaded, { name: String(data.item?.name ?? file.name) }));
      if (offerTrim && data.item) setTrimItem(data.item as MediaItem);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setUploading(false);
    }
  }

  const buttons: { kind: Kind; icon: typeof ImagePlus; label: string; accept: string; primary?: boolean }[] = [
    { kind: "image", icon: ImagePlus, label: labels.image, accept: "image/*", primary: true },
    { kind: "video", icon: Clapperboard, label: labels.video, accept: "video/*" },
    { kind: "pdf", icon: FileText, label: labels.pdf, accept: "application/pdf,.pdf" },
    { kind: "markdown", icon: FileType2, label: labels.markdown, accept: ".md,.markdown,text/markdown" },
    { kind: "html", icon: Code2, label: labels.html, accept: ".html,.htm,text/html" },
  ];

  return (
    <>
      {cropSrc && pendingFile && (
        <ImageCropper
          src={cropSrc}
          labels={labels.cropper}
          onDone={(blob, cropMode) => {
            setCropSrc(null);
            void upload(pendingFile, blob, cropMode);
            setPendingFile(null);
          }}
          onCancel={() => { setCropSrc(null); setPendingFile(null); }}
        />
      )}

      {trimItem && (
        <VideoTrimmer
          mediaBase={mediaBase}
          itemId={trimItem.id}
          name={trimItem.name}
          serverDuration={trimItem.duration}
          labels={labels.trimmer}
          onClose={() => setTrimItem(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {buttons.map(({ kind, icon: Icon, label, accept, primary }) => (
          <span key={kind}>
            <input ref={inputs[kind]} type="file" accept={accept} className="hidden" onChange={(e) => pick(e, kind)} />
            <Button
              variant={primary ? "default" : "outline"}
              size="sm"
              disabled={uploading}
              title={`${labels.verb} ${label}`}
              aria-label={`${labels.verb} ${label}`}
              onClick={() => inputs[kind].current?.click()}
            >
              {uploading && primary ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
              <span className="hidden sm:inline">
                <span className="hidden lg:inline">{labels.verb}&nbsp;</span>
                {uploading && primary ? labels.uploading : label}
              </span>
            </Button>
          </span>
        ))}
      </div>
    </>
  );
}
