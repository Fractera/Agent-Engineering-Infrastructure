"use client";

// Монтаж видео — оставить середину, отрезать начало и конец (шаг 501, Ф2,
// партия 4). КОПИЯ `video-trimmer.client.tsx` старой панели; скопирован, а не
// подключён ссылкой, потому что старая оболочка исчезает на переключении.
//
// Сама резка происходит НЕ здесь. Браузер лишь выбирает две точки на шкале; слой
// данных запускает ffmpeg с `-c copy`, то есть копирует потоки без перекодировки:
// мгновенно, без потерь и без нагрузки на машину владельца. Редактор на wasm в
// странице стоил бы ~30 МБ и перекодировал бы локально.
//
// Файл сначала загружается и режется на месте, поэтому владелец монтирует то, что
// действительно лежит в хранилище, и может вернуться к монтажу позже из той же
// строки.
//
// Изменено против источника: `fixed` вместо `absolute`, подписи пропсами,
// и после успеха вызывается `router.refresh()` — данные строки приходят с
// сервера, а не правятся в памяти браузера.

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X, Loader2, Play, Scissors } from "lucide-react";

export type TrimmerLabels = {
  title: string; start: string; end: string; keeping: string; lossless: string;
  previewMiddle: string; keepWhole: string; apply: string; reading: string;
  tooShort: string; done: string;
};

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export function VideoTrimmer(
  { mediaBase, itemId, name, serverDuration, labels, onClose }: {
    mediaBase: string;
    itemId: string;
    name: string;
    // Измерено ffprobe на сервере при загрузке. Это АВТОРИТЕТ: запись экрана
    // часто не несёт годной длительности в контейнере, и браузер тогда сообщает
    // ерунду — доверие к нему однажды обрезало 90-секундный ролик до двух секунд.
    // Значение браузера используется только когда у сервера его нет.
    serverDuration?: number | null;
    labels: TrimmerLabels;
    onClose: () => void;
  },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [applying, setApplying] = useState(false);

  // Обход кеша: адрес стабилен, но байты за ним меняются на каждом монтаже.
  const src = `${mediaBase}/media/${itemId}/file?v=${Date.now()}`;

  useEffect(() => {
    if (typeof serverDuration === "number" && serverDuration > 0) {
      setDuration(serverDuration);
      setStart(0);
      setEnd(serverDuration);
    }
  }, [serverDuration]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    function onMeta() {
      if (typeof serverDuration === "number" && serverDuration > 0) return;
      const d = v!.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
        setStart(0);
        setEnd(d);
      }
    }
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [serverDuration]);

  // Проигрывание оставляемой части — единственный честный предпросмотр: владелец
  // видит ровно ту середину, которая выживет, с теми же границами.
  function playMiddle() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = start;
    v.play();
    const stop = () => {
      if (v.currentTime >= end) {
        v.pause();
        v.removeEventListener("timeupdate", stop);
      }
    };
    v.addEventListener("timeupdate", stop);
  }

  async function apply() {
    if (end - start < 0.2) {
      toast.error(labels.tooShort);
      return;
    }
    setApplying(true);
    try {
      // Прямо в слой данных, как и все прочие операции медиатеки: тот же cookie,
      // тот же `credentials: "include"`. Проведение именно этого вызова через API
      // панели было исключением и отвечало 401.
      const r = await fetch(`${mediaBase}/media/${itemId}/trim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
        credentials: "include",
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error ?? "trim failed");
      toast.success(fill(labels.done, { name, seconds: (end - start).toFixed(1) }));
      onClose();
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(String(e));
    } finally {
      setApplying(false);
    }
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="flex w-full max-w-2xl flex-col gap-3 rounded-xl bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <Scissors size={13} /> {labels.title}
          </span>
          <Button variant="ghost" size="icon-xs" onClick={onClose}><X size={13} /></Button>
        </div>

        <video ref={videoRef} src={src} controls className="max-h-[46vh] w-full rounded-lg bg-black" />

        {duration > 0 ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-10 text-[10px] text-muted-foreground">{labels.start}</span>
                <input
                  type="range" min={0} max={duration} step={0.05} value={start}
                  aria-label={labels.start}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setStart(Math.min(v, end - 0.2));
                    if (videoRef.current) videoRef.current.currentTime = v;
                  }}
                  className="flex-1"
                />
                <span className="w-16 text-right font-mono text-[10px] text-foreground">{fmt(start)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 text-[10px] text-muted-foreground">{labels.end}</span>
                <input
                  type="range" min={0} max={duration} step={0.05} value={end}
                  aria-label={labels.end}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setEnd(Math.max(v, start + 0.2));
                    if (videoRef.current) videoRef.current.currentTime = v;
                  }}
                  className="flex-1"
                />
                <span className="w-16 text-right font-mono text-[10px] text-foreground">{fmt(end)}</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              {fill(labels.keeping, { kept: (end - start).toFixed(1), total: duration.toFixed(1) })}{" "}
              {labels.lossless}
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={playMiddle}><Play size={11} /> {labels.previewMiddle}</Button>
              <Button variant="outline" size="sm" onClick={onClose}>{labels.keepWhole}</Button>
              <Button size="sm" onClick={apply} disabled={applying}>
                {applying ? <Loader2 size={11} className="animate-spin" /> : <Scissors size={11} />}
                {labels.apply}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">{labels.reading}</p>
        )}
      </div>
    </div>
  );
}
