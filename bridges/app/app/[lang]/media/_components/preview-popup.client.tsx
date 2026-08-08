"use client";

// Предпросмотр файла (шаг 501, Ф2, партия 4). КОПИЯ `PreviewPopup` из старой
// панели; скопирован, а не подключён ссылкой — старая оболочка исчезает на
// переключении.
//
// Каждый вид показывается так, как его действительно читают: картинка картинкой,
// видео плеером, PDF собственным просмотрщиком браузера, Markdown —
// ОТРЕНДЕРЕННЫМ, потому что смысл хранить Markdown в том документе, которым он
// становится. У HTML два лица — страница и её код, — поэтому предпросмотр
// переключается между ними, а не выбирает одно.
//
// Изменено против источника: `fixed` вместо `absolute`, адрес файла приезжает
// пропсом (его считает сервер по публичному адресу слоя данных), подписи из
// словаря.

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { X, Code2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "../_lib/media";

export type PreviewLabels = {
  code: string; preview: string; open: string; close: string;
  reading: string; unreadable: string;
  kindImage: string; kindVideo: string; kindPdf: string; kindMarkdown: string; kindHtml: string; kindFile: string;
};

export function PreviewPopup(
  { item, fileUrl, labels, onClose }:
  { item: MediaItem; fileUrl: string; labels: PreviewLabels; onClose: () => void },
) {
  const isImage = item.mime_type.startsWith("image/");
  const isVideo = item.mime_type.startsWith("video/");
  const isPdf = item.mime_type === "application/pdf";
  const isMd = item.extension === "md" || item.mime_type === "text/markdown";
  const isHtml = item.mime_type === "text/html" || item.extension === "html" || item.extension === "htm";
  const isTextual = isMd || isHtml;

  const [mdText, setMdText] = useState<string | null>(null);
  const [mdError, setMdError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [codeHtml, setCodeHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!isMd) return;
    fetch(fileUrl, { credentials: "include" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setMdText)
      .catch((e) => setMdError(String(e)));
  }, [isMd, fileUrl]);

  // Подсветку делает Shiki — тот же движок, что уже используется в слоте, чтобы в
  // продукте был ОДИН подсветчик, а не два. Загружается лениво и только когда
  // владелец действительно попросил код: он несёт грамматики, и панель не должна
  // платить за них просто открыв картинку.
  useEffect(() => {
    if (!showCode || !isTextual) return;
    let alive = true;
    (async () => {
      try {
        const source = await fetch(fileUrl, { credentials: "include" }).then((r) => r.text());
        const { codeToHtml } = await import("shiki");
        const out = await codeToHtml(source, {
          lang: isHtml ? "html" : "markdown",
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        });
        if (alive) setCodeHtml(out);
      } catch (e) {
        if (alive) setCodeHtml(`<pre>${labels.unreadable}: ${String(e)}</pre>`);
      }
    })();
    return () => { alive = false; };
  }, [showCode, isTextual, isHtml, fileUrl, labels.unreadable]);

  const kind = isImage ? labels.kindImage
    : isVideo ? labels.kindVideo
    : isPdf ? labels.kindPdf
    : isMd ? labels.kindMarkdown
    : isHtml ? labels.kindHtml
    : labels.kindFile;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="flex w-full max-w-2xl flex-col gap-3 rounded-xl bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-semibold text-foreground">{item.name}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {isTextual && (
              <Button variant="outline" size="xs" onClick={() => setShowCode((v) => !v)}>
                <Code2 size={11} />{showCode ? labels.preview : labels.code}
              </Button>
            )}
            {/* Полная ширина — дело браузера, а не всплывающего окна: файл
                открывается своей вкладкой, в настоящем размере экрана. */}
            <Button variant="outline" size="xs" onClick={() => window.open(fileUrl, "_blank", "noopener")}>
              <ExternalLink size={11} />{labels.open}
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label={labels.close}>
              <X size={13} />
            </Button>
          </div>
        </div>

        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={item.name} className="max-h-[60vh] w-full rounded-lg border border-border object-contain" />
        )}
        {isVideo && <video src={fileUrl} controls className="max-h-[60vh] w-full rounded-lg border border-border bg-black" />}
        {isPdf && <iframe src={fileUrl} title={item.name} className="w-full rounded-lg border border-border bg-white" style={{ height: "60vh" }} />}

        {/* HTML показывается СТРАНИЦЕЙ, но в песочнице. `allow-scripts` без
            `allow-same-origin` — намеренная пара: страница рисуется и её скрипты
            работают, но кадр получает пустой origin, поэтому сохранённый файл не
            прочитает cookie слоя данных и не дотянется до панели. Выдать оба флага
            вместе значило бы отменить песочницу целиком. */}
        {isHtml && !showCode && (
          <iframe src={fileUrl} title={item.name} sandbox="allow-scripts" className="w-full rounded-lg border border-border bg-white" style={{ height: "60vh" }} />
        )}

        {isMd && !showCode && (
          <div className="w-full overflow-y-auto rounded-lg border border-border bg-muted/20 p-4" style={{ maxHeight: "60vh" }}>
            {mdError ? (
              <p className="text-[11px] text-destructive">{labels.unreadable}: {mdError}</p>
            ) : mdText === null ? (
              <p className="text-[11px] text-muted-foreground">{labels.reading}</p>
            ) : (
              <div className="prose prose-sm max-w-none text-[12px] dark:prose-invert">
                <ReactMarkdown>{mdText}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {isTextual && showCode && (
          <div
            className="w-full overflow-auto rounded-lg border border-border text-[11px] [&_pre]:m-0 [&_pre]:p-3"
            style={{ maxHeight: "60vh" }}
            dangerouslySetInnerHTML={{ __html: codeHtml ?? `<pre>${labels.reading}</pre>` }}
          />
        )}

        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
          <span><strong className="text-foreground">{kind}</strong> · .{item.extension}</span>
          {item.width && item.height && <span>{item.width} × {item.height} px</span>}
          {item.duration ? <span>{item.duration.toFixed(1)}s</span> : null}
          <span>{(item.size / 1024).toFixed(1)} KB</span>
        </div>
      </div>
    </div>
  );
}
